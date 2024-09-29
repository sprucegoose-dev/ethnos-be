import {
    ActionType,
    IActionPayload,
} from '@interfaces/action.interface';
import { EVENT_GAME_UPDATE } from '@interfaces/event.interface';

import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND,
} from '@helpers/exception-handler';

import GameService from '@services/game/game.service';
import EventService from '@services/event/event.service';

import PlayBandHandler from './play-band.handler';
import DrawCardHandler from './draw-card.handler';
import PickUpCardHandler from './pick-up-card.handler';
import NextAction from '../../models/nextAction.model';
import { NextActionState } from '../../interfaces/next-action.interface';
import TokenHandler from './token.handler';
import Game from '../../models/game.model';

export default class CommandService {

    static async handleAction(userId: number, gameId: number, payload: IActionPayload): Promise<void> {
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

        // TODO: update actions log

        if ([ActionType.PLAY_BAND, ActionType.ADD_FREE_TOKEN].includes(payload.type)) {
            nextActions = await NextAction.findAll({
                where: {
                    gameId: game.id,
                    state: NextActionState.PENDING,
                }
            });
        }

        if (!nextActions.length) {
            const nextPlayerId = GameService.getNextPlayerId(activePlayer.id, game.turnOrder);

            await Game.update({
                activePlayerId: nextPlayerId,
            }, {
                where: {
                    id: game.id,
                    age: game.age // if the age has already advanced, this query will intenationally fail
                }
            });
        }

        const updatedGameState = await GameService.getState(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });
    }
}
