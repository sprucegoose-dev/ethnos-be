import {
    ActionType,
    IActionPayload,
    IPlayBandPayload,
} from '@interfaces/action.interface';
import { EVENT_GAME_UPDATE } from '@interfaces/event.interface';
import { NextActionState } from '@interfaces/next-action.interface';
import { GameState } from '@interfaces/game.interface';

import sequelize from '@database/connection';

import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND,
} from '@helpers/exception-handler';

import GameService from '@services/game/game.service';
import EventService from '@services/event/event.service';
import BotService from '@services/bot/bot.service';
import ActionLogService from '@services/actionLog/actionLog';

import NextAction from '@models/nextAction.model';
import Game from '@models/game.model';
import Player from '@models/player.model';

import PlayBandHandler from './play-band.handler';
import DrawCardHandler from './draw-card.handler';
import PickUpCardHandler from './pick-up-card.handler';
import TokenHandler from './token.handler';
import ActionService from '../action/action.service';

export default class CommandService {

    static validateAction(payload: IActionPayload, validActions: IActionPayload[]): boolean {
        return !!validActions.find(action => action.type === payload.type);
    }

    static async handleAction(userId: number, gameId: number, payload: IActionPayload): Promise<void> {
        const transaction = await sequelize.transaction();

        try {
            const game = await GameService.getState(gameId);

            if (!game) {
                throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
            }
            const activePlayer = game.players.find(p =>
                p.id === game.activePlayerId && p.userId === userId
            );

            if (!activePlayer) {
                throw new CustomException(ERROR_BAD_REQUEST, 'You are not the active player');
            }

            const validActions = await ActionService.getActions(gameId, activePlayer.userId);

            if (!this.validateAction(payload, validActions)) {
                throw new CustomException(ERROR_BAD_REQUEST, 'This action is not valid');
            }

            let nextActions = [];

            switch (payload.type) {
                case ActionType.DRAW_CARD:
                    await DrawCardHandler.handleDrawCard(game, activePlayer);
                    break;
                case ActionType.PLAY_BAND:
                    await PlayBandHandler.handlePlayBand(game, activePlayer, payload);
                    break;
                case ActionType.PICK_UP_CARD:
                    await PickUpCardHandler.handlePickUpCard(game, activePlayer, payload.cardId);
                    break;
                case ActionType.ADD_FREE_TOKEN:
                    await TokenHandler.addFreeTokenToRegion(game, activePlayer, payload);
                    break;
            }

            const regionColor = activePlayer.cards.find(card => card.id === (payload as IPlayBandPayload).leaderId) ||
                (payload as IPlayBandPayload).regionColor;

            await ActionLogService.log({
                payload,
                gameId,
                playerId: activePlayer.id,
                regionId: game.regions.find(region => region.color === regionColor)?.id
            });

            if ([ActionType.PLAY_BAND, ActionType.ADD_FREE_TOKEN].includes(payload.type)) {
                nextActions = await NextAction.findAll({
                    where: {
                        gameId: game.id,
                        state: NextActionState.PENDING,
                    }
                });
            }

            let nextPlayerId: number = activePlayer.id;
            let nextPlayer: Player = activePlayer;

            if (!nextActions.length) {
                nextPlayerId = GameService.getNextPlayerId(activePlayer.id, game.turnOrder);
                nextPlayer = game.players.find(player => player.id === nextPlayerId);

                await Game.update({
                    activePlayerId: nextPlayerId,
                }, {
                    where: {
                        id: game.id,
                        age: game.age // if the age has already advanced, this query will intenationally fail
                    }
                });
            }

            const updatedGameState = await GameService.getStateResponse(gameId);

            EventService.emitEvent({
                type: EVENT_GAME_UPDATE,
                payload: updatedGameState
            });

            if (updatedGameState.state === GameState.STARTED && nextPlayer.user.isBot) {
                await BotService.takeTurn(game.id, nextPlayer.id);
            }
        } catch (error: any) {
            console.log(error);
            await transaction.rollback();
            throw new CustomException(error.type, error.message);
        }
    }
}
