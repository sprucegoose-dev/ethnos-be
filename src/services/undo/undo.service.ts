import sequelize from '@database/connection';

import { GameState } from '@interfaces/game.interface';
import { EVENT_GAME_UPDATE } from '@interfaces/event.interface';
import {
    IUndoApprovalOption,
    IUndoRequestResponse,
    UndoRequestState
} from '@interfaces/undo-request.interface';

import Game from '@models/game.model';
import Snapshot from '@models/snapshot.model';
import Player from '@models/player.model';
import User from '@models/user.model';
import UndoApproval from '@models/undo-approval.model';
import UndoRequest from '@models/undo-request.model';

import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND
} from '@helpers/exception-handler';

import GameService from '@services/game/game.service';
import EventService from '@services/event/event.service';
import SnapshotService from '@services/snapshot/snapshot.service';

export default class UndoService {

    static async vallidateUndoRequest(gameId: number, playerId: number): Promise<void> {
        const undoRequest = await UndoRequest.findOne({
            where: {
                gameId,
            },
            order: [ [ 'id', 'DESC' ] ],
        });

        const latestSnapshot = await Snapshot.findOne({
            where: {
                gameId,
                playerId,
                resetPoint: true,
            },
            order: [ [ 'id', 'DESC' ] ],
        });

        if (!latestSnapshot) {
            throw new CustomException(ERROR_BAD_REQUEST, 'There is no snapshot available');
        }

        if (undoRequest) {
            if (undoRequest.state === UndoRequestState.PENDING) {
                throw new CustomException(ERROR_BAD_REQUEST, 'There is currently a pending undo request');
            }

            if (undoRequest.snapshotId === latestSnapshot.id && undoRequest.state === UndoRequestState.REJECTED) {
                throw new CustomException(ERROR_BAD_REQUEST, 'Your request to undo this move has been denied.');
            }
        }
    }

    static async create(userId: number, gameId: number): Promise<UndoRequest> {
        const game = await Game.findOne({
            where: {
                id: gameId,
            },
            include: [
                {
                    model: Player.unscoped(),
                    as: 'players',
                    include: [
                        {
                            model: User,
                        }
                    ]
                }
            ]
        });

        if (!game) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Game not found.');
        }

        if (game.state !== GameState.STARTED) {
            const errorMsg = 'You cannot request an undo for games that have ended or been cancelled.';
            throw new CustomException(ERROR_BAD_REQUEST, errorMsg);
        }

        const player = game.players.find(player => player.userId === userId);

        if (!player) {
            throw new CustomException(ERROR_BAD_REQUEST, 'You must be in the game to undo an action.');
        }

        const botOnlyGame = game.players.every(player => player.userId === userId || player.user.isBot);

        if (botOnlyGame) {
            const snapshot = await Snapshot.findOne({
                where: {
                    gameId,
                    playerId: player.id,
                    resetPoint: true,
                },
                order: [ [ 'id', 'DESC' ] ],
            });

            if (snapshot) {
                await SnapshotService.restore(snapshot.id);
                return;
            } else {
                throw new CustomException(ERROR_BAD_REQUEST, "You can only request to undo after you have made at least one move");
            }
        }

        await this.vallidateUndoRequest(gameId, player.id);

        const transaction = await sequelize.transaction();

        try {
            const snapshot = await Snapshot.findOne({
                where: {
                    gameId,
                    playerId: player.id,
                    resetPoint: true,
                },
                order: [ [ 'id', 'DESC' ] ],
            });

            const undoRequest = await UndoRequest.create({
                gameId,
                playerId: player.id,
                snapshotId: snapshot.id,
                state: UndoRequestState.PENDING,
            });

            const otherPlayers = game.players.filter(player => player.userId !== userId);

            for (const otherPlayer of otherPlayers) {
                await UndoApproval.create({
                    gameId,
                    playerId: otherPlayer.id,
                    undoRequestId: undoRequest.id,
                    state: UndoRequestState.PENDING,
                });
            }

            await transaction.commit();

            const updatedGameState = await GameService.getStateResponse(gameId);

            EventService.emitEvent({
                type: EVENT_GAME_UPDATE,
                payload: updatedGameState,
            });

            return undoRequest.toJSON();
        } catch (error: any) {
            await transaction.rollback();
            throw new CustomException(error.type, error.message);
        }
    }

    static async getUndoState(userId: number, gameId: number): Promise<IUndoRequestResponse> {
        if (isNaN(gameId)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'A valid game ID must be provided for getting the Undo State');
        }

        const game = await Game.findOne({
            where: {
                id: gameId,
            },
            include: [
                {
                    model: Player.unscoped(),
                    as: 'players',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: [
                                'username',
                            ],
                        },
                    ],
                }
            ]
        });

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        const undoRequest = await UndoRequest.findOne({
            where: {
                gameId,
                state: UndoRequestState.PENDING,
            },
            include: [
                {
                    model: UndoApproval,
                    as: 'undoApprovals',
                    required: true,
                }
            ],
            order: [['id', 'DESC']],
        });

        const requestingPlayer = game.players.find(player => player.id === undoRequest?.playerId);

        const username = requestingPlayer?.user?.username ?? 'A player';

        const description = `${username} has requested to undo their last move. Do you approve it?'`;
        const options: IUndoApprovalOption[] = [
            {
                label: 'Yes',
                value: UndoRequestState.APPROVED,
            },
            {
                label: 'No',
                value: UndoRequestState.REJECTED,
            }
        ];

        const player = game.players.filter(player => player.userId === userId)[0];

        if (!player) {
            return {
                description,
                options,
                canRequestUndo: false,
                undoRequestId: null,
                requiredApprovals: [],
                state: null,
                playerId: null,
            };
        }

        return {
            description,
            options,
            canRequestUndo: !undoRequest,
            undoRequestId: undoRequest?.id,
            requiredApprovals: undoRequest ? undoRequest.undoApprovals : [],
            state: undoRequest?.state,
            playerId: undoRequest?.playerId,
        }
    }

    static async recordDecision(
        userId: number,
        gameId: number,
        undoApprovalId: number,
        state: UndoRequestState
    ): Promise<UndoRequest> {
        const { PENDING, APPROVED, REJECTED } = UndoRequestState;

        const game = await Game.findOne({
            where: {
                id: gameId,
            },
            include: [
                {
                    model: Player.unscoped(),
                    as: 'players',
                }
            ]
        });

        const player = game.players.find(player => player.userId === userId);

        if (!player) {
            throw new CustomException(ERROR_BAD_REQUEST, 'You must be in the game to approve an undo request.');
        }

        const undoApproval = await UndoApproval.findOne({
            where: {
                id: undoApprovalId,
                playerId: player.id,
                state: PENDING,
            }
        });

        if (!undoApproval) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Undo approval not found.');
        }

        if (![APPROVED, REJECTED].includes(state)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid decision value.');
        }

        const transaction = await sequelize.transaction();

        try {
            undoApproval.state = state;
            await undoApproval.save();

            const undoApprovals = await UndoApproval.findAll({
                where: {
                    undoRequestId: undoApproval.undoRequestId,
                }
            });

            const undoRequest = await UndoRequest.findOne({
                where: {
                    id: undoApproval.undoRequestId,
                }
            });

            const approvals = undoApprovals.filter(approval => approval.state === APPROVED);
            const rejections = undoApprovals.filter(approval => approval.state === REJECTED);

            if (approvals.length) {
                undoRequest.state = APPROVED;
                await undoRequest.save();
                await SnapshotService.restore(undoRequest.snapshotId);
            } else if (rejections.length) {
                undoRequest.state = REJECTED;
                await undoRequest.save();
            }

            await transaction.commit();

            const updatedGameState = await GameService.getStateResponse(gameId);

            EventService.emitEvent({
                type: EVENT_GAME_UPDATE,
                payload: updatedGameState,
            });

            return undoRequest.toJSON();
        } catch (error: any) {
            await transaction.rollback();
            throw new CustomException(error.type, error.message);
        }
    }

    static async resolve(undoRequestId: number, state: UndoRequestState) {
        const transaction = await sequelize.transaction();

        try {
            const undoRequest = await UndoRequest.findOne({
                where: {
                    id: undoRequestId,
                },
            });
            undoRequest.state = state;
            await undoRequest.save();

            if (undoRequest.state === UndoRequestState.APPROVED) {
                await SnapshotService.restore(undoRequest.snapshotId);
            }

            await transaction.commit();
        } catch (error: any) {
            await transaction.rollback();
            throw new CustomException(error.type, error.message);
        }
    }

    static async getUndoRequest(undoRequestId: number) {
        const undoRequest = await UndoRequest.findOne({
            where: {
                id: undoRequestId,
            },
        });

        if (!undoRequest) {
            throw new CustomException(ERROR_NOT_FOUND, 'Undo request not found.');
        }

        return undoRequest.toJSON();
    }
};
