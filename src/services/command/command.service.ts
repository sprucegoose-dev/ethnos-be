import {
    ActionType,
    IActionPayload,
    IPlayBandPayload,
} from '@interfaces/action.interface';
import { EVENT_GAME_UPDATE } from '@interfaces/event.interface';
import { NextActionState } from '@interfaces/next-action.interface';
import { COLORS, GameState } from '@interfaces/game.interface';
// import { UndoRequestState } from '@interfaces/undo-request.interface';

import sequelize from '@database/connection';

import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND,
} from '@helpers/exception-handler';

import GameService from '@services/game/game.service';
import EventService from '@services/event/event.service';
import BotService from '@services/bot/bot.service';
import ActionLogService from '@services/actionLog/action-log.service';
import SnapshotService from '@services/snapshot/snapshot.service';

import NextAction from '@models/next-action.model';
import Game from '@models/game.model';
import Player from '@models/player.model';
// import UndoRequest from '@models/undo-request.model';

import PlayBandHandler from './play-band.handler';
import DrawCardHandler from './draw-card.handler';
import PickUpCardHandler from './pick-up-card.handler';
import TokenHandler from './token.handler';
import TribeHandler from './tribe.handler';
import ActionLog from '../../models/action-log.model';

export default class CommandService {

    static async handleAction(userId: number, gameId: number, payload: IActionPayload): Promise<void> {
        const transaction = await sequelize.transaction();

        try {
            const game = await GameService.getState(gameId, { player: ['validActions'] });

            if (!game) {
                throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
            }

            if ([GameState.CANCELLED, GameState.ENDED].includes(game.state)) {
                throw new CustomException(ERROR_NOT_FOUND, 'The game has ended');
            }

            const activePlayer = game.players.find(p =>
                p.id === game.activePlayerId && p.userId === userId
            );

            if (!activePlayer) {
                throw new CustomException(ERROR_BAD_REQUEST, 'You are not the active player');
            }

            // const undoState = await UndoRequest.findOne({
            //     where: {
            //         gameId: game.id,
            //         state: UndoRequestState.PENDING
            //     },
            //     order: [['id', 'DESC']]
            // });

            // if (undoState) {
            //     throw new CustomException(ERROR_BAD_REQUEST, 'There is currently a pending undo request');
            // }

            const nextAction = await NextAction.findOne({
                where: {
                    gameId: game.id,
                    state: NextActionState.PENDING,
                },
                order: [['id', 'DESC']]
            });

            if (nextAction && nextAction.type !== payload.type) {
                throw new CustomException(ERROR_BAD_REQUEST, `This action is not valid ${JSON.stringify(payload)}`);
            }

            const regionColor = (payload as IPlayBandPayload).regionColor;

            if (regionColor && !COLORS.includes(regionColor)) {
                throw new CustomException(ERROR_BAD_REQUEST, 'Invalid region color');
            }

            const actionLog = await ActionLogService.log({
                payload,
                gameId,
                playerId: activePlayer.id,
                regionId: regionColor ? game.regions.find(region => region.color === regionColor)?.id : null,
                emit: true,
            });

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
                case ActionType.KEEP_CARDS:
                    await TribeHandler.handleElfKeepCards(activePlayer, payload, nextAction);
                    break;
                case ActionType.REMOVE_ORC_TOKENS:
                    await TribeHandler.removeAndScoreOrcTokens(activePlayer, payload);
                    break;
            }

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

            if (!nextActions.length && payload.type !== ActionType.REMOVE_ORC_TOKENS) {
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

            if (activePlayer.canRemoveOrcTokens) {
                await Player.update({
                    canRemoveOrcTokens: false,
                }, {
                    where: {
                        id: activePlayer.id
                    }
                });
            }

            await transaction.commit();

            const updatedGameState = await GameService.getStateResponse(gameId);

            EventService.emitEvent({
                type: EVENT_GAME_UPDATE,
                payload: updatedGameState
            });

            EventService.emitEvent({
                type: EVENT_GAME_UPDATE,
                payload: updatedGameState
            });

            const snapshot = await SnapshotService.create(game, !nextAction);

            await ActionLog.update({
               snapshotId: snapshot.id,
            }, {
                where: {
                    id: actionLog.id,
                }
            });

            if (updatedGameState.state === GameState.STARTED && nextPlayer.user.isBot) {
                await BotService.takeTurn(game.id, nextPlayer.id);
            }
        } catch (error: any) {
            await transaction.rollback();
            throw new CustomException(error.type, error.message);
        }
    }
}
