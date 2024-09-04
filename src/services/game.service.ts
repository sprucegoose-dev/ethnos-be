import { Op } from 'sequelize';
import shuffle from 'lodash.shuffle';

import { Card } from '../models/card.model';
import { Tribe } from '../models/tribe.model';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { TribeName } from '../types/tribe.interface';
import {
    Color,
    GameState,
    IGameSettings,
    IGameState,
    ITribeCard,
    TRIBES,
} from '../types/game.interface';
import CardService from './card.service';
import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_FORBIDDEN,
} from '../helpers/exception_handler';
import PlayerService from './player.service';
import EventService from './event.service';
import { User } from '../models/user.model';
import {
    EVENT_ACTIVE_GAMES_UPDATE,
    EVENT_GAME_UPDATE,
} from '../types/event.interface';
import { CardState } from '../types/card.interface';

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
                        Tribe,
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

        if (game.players.length >= 6) {
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

    static generateTribeCards(tribes: Tribe[]): ITribeCard[] {
        const tribeCards = [];

        const colors = [
            Color.BLUE,
            Color.GRAY,
            Color.GREEN,
            Color.ORANGE,
            Color.PURPLE,
            Color.RED
        ];

        for (let i = 0; i < tribes.length; i++) {
            if (tribes[i].name === TribeName.DRAGON) {
                for (let j = 0; j < 3; i++) {
                    tribeCards.push(({
                        color: null,
                        name: tribes[i].name,
                        tribeId: tribes[i].id,
                    }));
                }
            } else {
                const quantityInEachColor = tribes[i].name === TribeName.HALFING ? 4 : 2;

                for (let j = 0; j < quantityInEachColor; j++) {
                    for (let k = 0; k < colors.length; k++) {
                        tribeCards.push({
                            color: tribes[i].name == TribeName.SKELETON ? null : colors[k],
                            name: tribes[i].name,
                            tribeId: tribes[i].id,
                        });
                    }
                }
            }
        }

        return tribeCards;
    }

    static async start(userId: number, gameId: number, settings: IGameSettings): Promise<void> {
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

        if (players.length < 2) {
            throw new CustomException(ERROR_BAD_REQUEST, 'The game must have at least two players');
        }

        if (!settings ||
            !settings.tribes ||
            !Array.isArray(settings.tribes) ||
            settings.tribes.filter((tribe) => !TRIBES.includes(tribe)).length
        ) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid game settings');
        }

        const tribes = shuffle(await Tribe.findAll({
            where: {
                tribe: {
                    [Op.in]: [...settings.tribes, TribeName.DRAGON]
                }
            }
        }));

        const tribeCards = GameService.generateTribeCards(tribes);
        const cards = tribeCards.filter(tribe => tribe.name !== TribeName.DRAGON);
        const dragonsCards = tribeCards.filter(tribe => tribe.name === TribeName.DRAGON);
        const playerCards = cards.splice(0, players.length);
        const marketCards = cards.splice(0, players.length * 2);

        for (let i = 0; i < players.length; i++) {
            await CardService.create({
                tribeId: playerCards[i].tribeId,
                color: marketCards[i].color,
                state: CardState.IN_HAND,
                index: 0,
                playerId: players[i].id,
                gameId,
            });
        }

        for (let i = 0; i < marketCards.length; i++) {
            await CardService.create({
                tribeId: marketCards[i].tribeId,
                state: CardState.IN_MARKET,
                color: marketCards[i].color,
                index: i,
                playerId: null,
                gameId,
            });
        }

        const bottomHalfOfDeck = cards.splice(-Math.ceil(cards.length / 2));

        const bottomHalfWithlDragons = shuffle([...bottomHalfOfDeck, ...dragonsCards]);

        const deck = [...cards, ...bottomHalfWithlDragons];

        for (let i = 0; i < deck.length; i++) {
            await CardService.create({
                tribeId: deck[i].tribeId,
                color: deck[i].color,
                state: CardState.IN_DECK,
                index: i,
                playerId: null,
                gameId,
            });
        }

        const startingPlayerId = shuffle(players)[0].id;

        await Game.update(
            {
                activePlayerId: startingPlayerId,
                state: GameState.STARTED,
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
