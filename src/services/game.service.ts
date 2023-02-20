import { Op } from 'sequelize';
import shuffle from 'lodash.shuffle';

import { Card } from '../models/card.model';
import { CardType } from '../models/card_type.model';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { Color } from '../types/card_type.interface';
import { GamePhase, GameState, IGameState } from '../types/game.interface';
import CardService from './card.service';
import { PlayerOrientation } from '../types/player.interface';
import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_FORBIDDEN,
} from '../helpers/exception_handler';
import PlayerService from './player.service';
import EventService from './event.service';
import { User } from '../models/user.model';
import { EVENT_ACTIVE_GAMES_UPDATE, EVENT_GAME_UPDATE } from '../types/event.interface';

class GameService {

    static async create(userId: number, autoAddPlayer: boolean = false): Promise<IGameState> {
        if (await this.hasActiveGames(userId)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Please leave your other active game(s) before creating a new one.');
        }

        const game = await Game.create({
            creatorId: userId,
            state: GameState.CREATED,
        });

        if (autoAddPlayer) {
            await PlayerService.create(userId, game.id);
        }

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });

        return await this.getState(game.id);
    }

    static async getActiveGames(): Promise<Omit<IGameState, 'cards'>[]> {
        return await Game.findAll({
            where: {
                state: {
                    [Op.not]: [GameState.ENDED, GameState.CANCELLED]
                },
            },
            include: [
                {
                    model: Player,
                    as: 'players',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: [
                                'id',
                                'username',
                            ],
                        }
                    ],
                },
            ]
        });
    }

    static async getState(gameId: number): Promise<IGameState> {
        return await Game.findOne({
            where: {
                id: gameId,
            },
            include: [
                {
                    model: Player,
                    as: 'players',
                    include: [
                        {
                            model: User,
                            attributes: [
                                'id',
                                'username',
                            ],
                        }
                    ],
                },
                {
                    model: Card,
                    include: [
                        CardType,
                    ],
                }
            ]
        });
    }

    static async hasActiveGames(userId: number) {
        const activeGames = await Game.findAll({
            where: {
                state: {
                    [Op.notIn]: [GameState.ENDED, GameState.CANCELLED]
                },
            }
        });

        const activePlayers = await Player.findAll({
            where: {
                userId,
                gameId: {
                    [Op.in]: activeGames.map(g => g.id),
                },
            }
        });

        return activePlayers.length;
    }

    static async join(userId: number, gameId: number): Promise<void> {
        if (await this.hasActiveGames(userId)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Please leave your other active game(s) before joining a new one.')
        }

        const game = await this.getState(gameId);

        if (game.players.length >= 2) {
            throw new CustomException(ERROR_BAD_REQUEST, 'This game is already full');
        }

        await PlayerService.create(userId, gameId);

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });
    }

    static async leave(userId: number, gameId: number): Promise<void> {
        const game = await Game.findOne({
            where: {
                id: gameId,
            },
            include: [
                {
                    model: Player,
                    as: 'players',
                },
            ]
        });

        if (!game) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Game not found');
        }

        const player = game.players.find(p => p.userId === userId);

        if (!player) {
            throw new CustomException(ERROR_BAD_REQUEST, 'You are not in this game');
        }

        switch (game.state) {
            case GameState.CREATED:
                await player.destroy();

                if (game.creatorId === userId) {
                    game.state = GameState.CANCELLED;
                    await game.save();
                }
                break;
            case GameState.ENDED:
                throw new CustomException(ERROR_BAD_REQUEST, 'You cannot leave a game that has ended');
            default:
                game.winnerId = game.players.find(p => p.userId !== userId).userId;
                game.state = GameState.ENDED;
                await game.save();
        }

        if (game.players.length - 1 === 0) {
            await game.destroy();
        } else {
            const updatedGameState = await GameService.getState(gameId);

            EventService.emitEvent({
                type: EVENT_GAME_UPDATE,
                payload: updatedGameState
            });
        }

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });
    }

    static async start(userId: number, gameId: number): Promise<void> {
        const game = await Game.findOne({
            where: {
                id: gameId,
            },
            include: [
                {
                    model: Player,
                    as: 'players',
                }
            ]
        });

        if (game.creatorId !== userId) {
            throw new CustomException(ERROR_FORBIDDEN, 'Only the game creator can start the game');
        }

        const players = game.players;

        if (players.length !== 2) {
            throw new CustomException(ERROR_BAD_REQUEST, 'The game must have two players');
        }

        const cardTypes = shuffle(await CardType.findAll());

        let codexColor: Color;

        for (let i = 0; i < cardTypes.length; i++) {
            let cardType = cardTypes[i];

            if (i < 9) {
                // deal continuum cards
                await CardService.create({
                    cardTypeId: cardType.id,
                    gameId,
                    index: i,
                });

                if (i === 8) {
                    // assign starting codex based on last card in continuum
                    codexColor = cardType.color;
                }
            } else if (i < cardTypes.length - 1) {
                // deal cards to players
                await CardService.create({
                    cardTypeId: cardType.id,
                    playerId: players[i < 12 ? 0 : 1].id,
                    gameId,
                });
            } else {
                // leave the last card to be the codex
                await CardService.create({
                    cardTypeId: cardType.id,
                    gameId,
                });
            }
        }

        const startingPlayerId = shuffle(players)[0].id;


        await Player.update({
            orientation: PlayerOrientation.INVERSE,
        }, {
            where: {
                gameId,
                id: startingPlayerId,
            }
        });

        await Player.update({
            orientation: PlayerOrientation.DEFAULT,
        }, {
            where: {
                gameId,
                id: {
                    [Op.not]: startingPlayerId
                },
            }
        });

        await Game.update(
            {
                activePlayerId: startingPlayerId,
                codexColor,
                state: GameState.SETUP,
                phase: GamePhase.DEPLOYMENT,
            },
            {
                where: {
                    id: gameId,
                }
            }
        );

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });
    }

}

export default GameService;
