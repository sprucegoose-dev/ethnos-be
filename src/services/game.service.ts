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
    ERROR_NOT_FOUND,
} from '../helpers/exception_handler';
import PlayerService from './player.service';
import EventService from './event.service';
import { User } from '../models/user.model';
import {
    EVENT_ACTIVE_GAMES_UPDATE,
    EVENT_GAME_UPDATE,
} from '../types/event.interface';
import { CardState } from '../types/card.interface';
import { Region } from '../models/region.model';

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
                        },
                        {
                            model: Card,
                            required: false,
                            include: [
                                Tribe,
                            ],
                            order: [['index', 'asc']]
                        },
                    ],
                },
                {
                    model: Region,
                    as: 'regions',
                    required: false,
                },
                {
                    model: Card,
                    include: [
                        Tribe,
                    ],
                    required: false,
                }
            ]
        });
    }

    static async hasActiveGames(userId: number) {
        try {
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
        } catch (error) {
            console.log(error);
        }
    }

    static async join(userId: number, gameId: number): Promise<void> {
        if (await this.hasActiveGames(userId)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Please leave your other active game(s) before joining a new one.')
        }

        const game = await this.getState(gameId);

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

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

    static async generateRegions(gameId: number) {
        const colors = [
            Color.BLUE,
            Color.GRAY,
            Color.GREEN,
            Color.ORANGE,
            Color.PURPLE,
            Color.RED
        ];

        const values = shuffle([
            0, 0,
            2, 2,
            4, 4, 4, 4,
            6, 6, 6, 6, 6,
            8, 8, 8,
            10, 10
        ]);

        const valueSets = [];

        let setCount = 0;
        let set = [];

        for (const value of values) {
            set.push(value);
            setCount++;

            if (setCount === 3) {
                valueSets.push(set.sort((a, b) => a - b));
                set = [];
                setCount = 0;
            }
        }

        for (let i = 0; i < colors.length; i++) {
            await Region.create({
                gameId,
                color: colors[i],
                values: valueSets[i],
            });
        }
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

        for (const tribe of tribes) {
            if (tribe.name === TribeName.DRAGON) {
                for (let i = 0; i < 3; i++) {
                    tribeCards.push(({
                        color: null,
                        name: tribe.name,
                        tribeId: tribe.id,
                    }));

                }
            } else {
                const quantityInEachColor = tribe.name === TribeName.HALFLING ? 4 : 2;

                for (let i = 0; i < quantityInEachColor; i++) {
                    for (let j = 0; j < colors.length; j++) {
                        tribeCards.push({
                            color: tribe.name === TribeName.SKELETON ? null : colors[j],
                            name: tribe.name,
                            tribeId: tribe.id,
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

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        if (game.creatorId !== userId) {
            throw new CustomException(ERROR_FORBIDDEN, 'Only the game creator can start the game');
        }

        if (game.state !== GameState.CREATED) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Game has already started');
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
                name: {
                    [Op.in]: [...settings.tribes, TribeName.DRAGON]
                }
            }
        }));

        const tribeCards = GameService.generateTribeCards(tribes);
        const cards = shuffle(tribeCards.filter(tribe => tribe.name !== TribeName.DRAGON));

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

        await GameService.generateRegions(gameId);

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
