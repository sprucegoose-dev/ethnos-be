import { Op } from 'sequelize';
import shuffle from 'lodash.shuffle';
import bcrypt from 'bcrypt';

import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_FORBIDDEN,
    ERROR_NOT_FOUND,
} from '@helpers/exception-handler';

import { TribeName } from '@interfaces/tribe.interface';
import { CardState } from '@interfaces/card.interface';
import {
    Color,
    COLORS,
    GameState,
    IGameSettings,
    IGameState,
    IGameStateResponse,
    TRIBES,
} from '@interfaces/game.interface';
import {
    EVENT_ACTIVE_GAMES_UPDATE,
    EVENT_GAME_UPDATE,
} from '@interfaces/event.interface';
import { IScoringResults } from '@interfaces/command.interface';
import { PLAYER_COLORS, PlayerColor } from '@interfaces/player.interface';
import { IActionLogPayload } from '@interfaces/action-log.interface';

import Card from '@models/card.model';
import Tribe from '@models/tribe.model';
import Game from '@models/game.model';
import Player from '@models/player.model';
import Region from '@models/region.model';
import User from '@models/user.model';
import PlayerRegion from '@models/player-region.model';
import Snapshot from '@models/snapshot.model';

import PlayerService from '@services/player/player.service';
import EventService from '@services/event/event.service';
import ScoringService from '@services/scoring/scoring.service';
import ActionLogService from '@services/actionLog/action-log.service';
import BotService from '@services/bot/bot.service';
import SnapshotService from '@services/snapshot/snapshot.service';
import NextAction from '../../models/next-action.model';
import { NextActionState } from '../../interfaces/next-action.interface';

export default class GameService {

    static async addBotPlayer(userId: number, gameId: number) {
        const game = await this.getState(gameId);

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        if (game.creatorId !== userId) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Only the game creator can add a bot player');
        }

        if (game.state !== GameState.CREATED) {
            throw new CustomException(ERROR_BAD_REQUEST, 'You cannot add a bot to a game after it has started');
        }

        if (game.players.length >= game.maxPlayers) {
            throw new CustomException(ERROR_BAD_REQUEST, 'This game is already full');
        }

        const bots = await User.findAll({
            where: {
                isBot: true,
                id: {
                    [Op.notIn]: game.players.map(player => player.userId)
                }
            }}
        );

        await PlayerService.create(shuffle(bots)[0].id, gameId);

        const updatedGameState = await this.getStateResponse(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });
    }

    static async assignPlayerColor(userId: number, gameId: number, color: PlayerColor) {
        const game = await Game.findOne({
            where: {
                id: gameId,
            },
            attributes: ['state']
        });

        if (game.state !== GameState.CREATED) {
            throw new CustomException(ERROR_BAD_REQUEST, "You can't change a player's color after the game had started");
        }

        if (color === null) {
            await Player.update({
                color: null
            }, {
                where: {
                    gameId,
                    userId,
                }
            });
        } else {

            if (!PLAYER_COLORS.includes(color)) {
                throw new CustomException(ERROR_BAD_REQUEST, 'Invalid color');
            }

            const players = await Player.findAll({
                where: {
                    gameId,
                }
            });

            const availableColors = PlayerService.filterAvailableColors(players);

            if (!availableColors.includes(color)) {
                throw new CustomException(ERROR_BAD_REQUEST, 'This color is already assigned to another player');
            }
            await Player.update({
                color
            }, {
                where: {
                    gameId,
                    userId,
                }
            });
        }

        const updatedGameState = await GameService.getStateResponse(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });
    }

    static async assignPlayerColors(players: Player[]) {
        const availableColors = shuffle(PlayerService.filterAvailableColors(players));

        const filteredPlayers = players.filter(player => !player.color);

        for (let i = 0; i < filteredPlayers.length; i++) {
            await Player.update({
                color: availableColors[i],
            }, {
                where: {
                    id: filteredPlayers[i].id
                }
            });
        }
    }

    static async create(userId: number, autoAddPlayer: boolean = true, password: string = null): Promise<IGameStateResponse> {
        if (await this.hasActiveGames(userId)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Please leave your other active game(s) before creating a new one.');
        }

        const passwordProtected = typeof password === 'string' && password.trim().length;

        const game = await Game.create({
            creatorId: userId,
            state: GameState.CREATED,
            password: passwordProtected ? await bcrypt.hash(password, 10) : null,
        });

        if (autoAddPlayer) {
            await PlayerService.create(userId, game.id);
        }

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });

        return await this.getStateResponse(game.id);
    }

    static async dealCards(gameId: number, players: Player[], allCards: Card[]) {
        const cards = shuffle(allCards.filter(card => card.tribe.name !== TribeName.DRAGON));
        const dragonsCards = allCards.filter(card => card.tribe.name === TribeName.DRAGON);
        const playerCards = cards.splice(0, players.length);
        const marketCards = cards.splice(0, players.length * 2);

        for (let i = 0; i < players.length; i++) {
            await Card.update({
                state: CardState.IN_HAND,
                index: 0,
                playerId: players[i].id,
                leaderId: null,
                gameId,
            }, {
                where: {
                    id: playerCards[i].id
                }
            });
        }

        for (let i = 0; i < marketCards.length; i++) {
            await Card.update({
                state: CardState.IN_MARKET,
                index: i,
                playerId: null,
                leaderId: null,
                gameId,
            }, {
                where: {
                    id: marketCards[i].id,
                }
            });
        }

        const bottomHalfOfDeck = cards.splice(-Math.ceil(cards.length / 2));

        const bottomHalfWithlDragons = shuffle([...bottomHalfOfDeck, ...dragonsCards]);

        const deck = [...cards, ...bottomHalfWithlDragons];

        for (let i = 0; i < deck.length; i++) {
            await Card.update({
                state: CardState.IN_DECK,
                index: i,
                playerId: null,
                leaderId: null,
                gameId,
            }, {
                where: {
                    id: deck[i].id,
                }
            });
        }
    }

    static async generateCards(gameId: number, tribes: Tribe[]): Promise<Card[]> {
        const cards = [];
        let card;

        for (const tribe of tribes) {
            if (tribe.name === TribeName.DRAGON) {
                for (let i = 0; i < 3; i++) {
                    card = await Card.create({
                        color: null,
                        gameId,
                        tribeId: tribe.id,
                        state: CardState.IN_DECK,
                    });
                    card.tribe = tribe;
                    cards.push(card);
                }
            } else {
                const quantityInEachColor = tribe.name === TribeName.HALFLINGS ? 4 : 2;

                for (let i = 0; i < quantityInEachColor; i++) {
                    for (let j = 0; j < COLORS.length; j++) {
                        card = await Card.create({
                            color: tribe.name === TribeName.SKELETONS ? null : COLORS[j],
                            gameId,
                            tribeId: tribe.id,
                            state: CardState.IN_DECK,
                        });
                        card.tribe = tribe;
                        cards.push(card);
                    }
                }
            }
        }

        return cards;
    }

    static async generateRegions(gameId: number, playersCount: number) {
        let values = playersCount >= 4 ? [
            0, 0,
            2, 2,
            4, 4, 4, 4,
            6, 6, 6, 6, 6,
            8, 8, 8,
            10, 10
        ] : [
            0,
            2, 2,
            4, 4,
            6, 6, 6,
            8, 8, 8,
            10,
        ];

        values = shuffle(values);

        const valueSets = [];

        let setCount = 0;
        let setLimit = playersCount >= 4 ? 3 : 2;
        let set = [];

        for (const value of values) {
            set.push(value);
            setCount++;

            if (setCount === setLimit) {
                valueSets.push(set.sort((a, b) => a - b));
                set = [];
                setCount = 0;
            }
        }

        for (let i = 0; i < COLORS.length; i++) {
            await Region.create({
                gameId,
                color: COLORS[i],
                values: valueSets[i],
            });
        }
    }

    static async getActiveGames(): Promise<Omit<IGameState, 'cards'>[]> {
        const games = await Game.unscoped().findAll({
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
                                'isBot'
                            ],
                        }
                    ],
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: [
                        'id',
                        'username'
                    ]
                }
            ],
            order: [['id', 'desc']]
        });

        return games.map(game => ({...game.toJSON(), hasPassword: Boolean(game.password), password: null }));
    }

    static async getActionsLog(gameId: number): Promise<IActionLogPayload[]> {
        return await ActionLogService.getActionLogs(gameId);
    }

    static async getAgeResults(gameId: number, age: number): Promise<IGameStateResponse> {
        const game = await this.getStateResponse(gameId);

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        const snapshot = await Snapshot.findOne({
            where: {
                age,
                gameId,
            },
            order: [['id', 'desc']]
        });

        if (!snapshot) {
            return game;
        }

        const cards = await Card.findAll({
            where: {
                gameId,
            },
            include: [
                Tribe,
            ],
        });
        const cardsById = cards.reduce<{ [cardId: number]: Card }>((acc, card) => {
            acc[card.id] = card;
            return acc;
          }, {});

        if (!snapshot) {
            throw new CustomException(ERROR_NOT_FOUND, 'Snapshot not found');
        }

        const decompressedSnapshot = await SnapshotService.decompress(snapshot.snapshot);

        // @ts-ignore
        game.players = game.players.map(player => {
            const decompressedPlayer = decompressedSnapshot.players.find(p => p.id === player.id);

            decompressedPlayer.cards = decompressedPlayer.cards.map(card => ({
                ...card,
                color:  cardsById[card.id].color,
                tribe: cardsById[card.id].tribe,
            }));

            return {
                ...player,
                ...decompressedPlayer,
                points: player.points,
                pointsBreakdown: player.pointsBreakdown,
            };
        });

        game.age = decompressedSnapshot.game.age;
        game.activePlayerId = decompressedSnapshot.game.activePlayerId;

         // @ts-ignore
        game.cards = game.cards.map(card => ({
            ...card,
            ...decompressedSnapshot.cards.find(c => c.id === card.id),
        }));

        return game;
    };

    static async getCardsInHand(userId: number, gameId: number): Promise<Card[]> {
        return (await Player.findOne({
            where: {
                userId,
                gameId,
            },
            include: [
                {
                    model: Card,
                    required: false,
                    where: {
                        state: CardState.IN_HAND
                    },
                    include: [
                        Tribe,
                    ],
                }
            ],
        }))?.cards || [];
    }

    static async getGameCards(gameId: number): Promise<Card[]> {
        return await Card.findAll({
            where: {
                gameId,
            },
            include: [
                {
                    model: Tribe,
                    attributes: ['name']
                }
            ],
            attributes: [
                'color',
                'id',
                'leaderId',
            ]
        });
    }

    static async getPlayerHands(gameId: number): Promise<{[playerId: number]: Card[]}> {
        const players = await Player.findAll({
            where: {
                gameId,
            },
            include: [
                {
                    model: Card,
                    required: false,
                    where: {
                        state: CardState.IN_HAND
                    },
                    attributes: ['id'],
                }
            ],
        });

        return players.reduce<{ [playerId: number]: Card[] }>((acc, player) => {
            acc[player.id] = player.cards;
            return acc;
        }, {});
    }

    static getNextPlayerId(activePlayerId: number, turnOrder: number[]): number {
        const turnIndex = turnOrder.indexOf(activePlayerId);
        return turnIndex === turnOrder.length - 1 ? turnOrder[0] : turnOrder[turnIndex + 1];
    }

    static getNewAgeFirstPlayerId = ({totalPoints, trollTokenTotals}: IScoringResults, prevPlayerId: number, turnOrder: number[]): number => {
        let lowestScore: number = Math.min(...Object.values(totalPoints));

        let tiedPlayerIds: number[] = Object.keys(totalPoints)
            .map(Number)
            .filter((playerId) => totalPoints[playerId] === lowestScore)

        if (tiedPlayerIds.length === 1) {
            return tiedPlayerIds[0];
        }

        const highestTrollToken = Math.max(...tiedPlayerIds.map(playerId => trollTokenTotals[playerId]))

        tiedPlayerIds = tiedPlayerIds.filter(playerId => trollTokenTotals[playerId] === highestTrollToken);

        if (tiedPlayerIds.length === 1) {
            return tiedPlayerIds[0];
        }

        let firstPlayerId;
        let nextPlayerId = prevPlayerId;

        while (!firstPlayerId) {
            if (tiedPlayerIds.includes(nextPlayerId)) {
                firstPlayerId = nextPlayerId;
            }

            nextPlayerId = this.getNextPlayerId(nextPlayerId, turnOrder);
        }

        return firstPlayerId;
    }

    static async getState(gameId: number, inclAttributes: { [key: string]: string[] } = {}): Promise<IGameState> {
        const game = await Game.findOne({
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
                                'isBot',
                            ],
                        },
                        {
                            model: Card,
                            required: false,
                            include: [
                                Tribe,
                            ],
                        },
                    ],
                    attributes: {
                        include: inclAttributes.player || []
                    }
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: [
                        'id',
                        'username',
                    ],
                },
                {
                    model: Region,
                    as: 'regions',
                    required: false,
                    include: [
                        {
                            model: PlayerRegion,
                            as: 'playerTokens'
                        }
                    ],
                },
            ],
            attributes: {
                include: inclAttributes.game || []
            }
        });

        const cards = await Card.findAll({
            where: {
                gameId,
            },
            include: [
                Tribe,
            ],
        });

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        const gameState = game.toJSON();

        gameState.cards = cards;

        return gameState;
    }

    static async getStateResponse(gameId: number): Promise<IGameStateResponse> {
        const game = await Game.findOne({
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
                                'isBot',
                            ],
                        },
                        {
                            model: Card,
                            required: false,
                            include: [
                                Tribe,
                            ],
                            where: {
                                state: CardState.IN_BAND
                            },
                            order: [['index', 'asc']]
                        },
                    ],
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: [
                        'id',
                        'username',
                    ],
                },
                {
                    model: Region,
                    as: 'regions',
                    required: false,
                    include: [
                        {
                            model: PlayerRegion,
                            attributes: [
                                'playerId',
                                'tokens',
                            ],
                        }
                    ]
                },
                {
                    model: Card,
                    include: [
                        Tribe,
                    ],
                    where: {
                        state: {
                            [Op.in]: [ CardState.IN_MARKET, CardState.REVEALED ]
                        }
                    },
                    required: false,
                }
            ]
        });

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        const cardsInDeckCount = await Card.count({
            where: {
                gameId,
                state: CardState.IN_DECK
            }
        });

        const gameState = game.toJSON();

        return {
            ...gameState,
            cardsInDeckCount,
        }
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

    static async join(userId: number, gameId: number, password: string = null): Promise<void> {

        if (await this.hasActiveGames(userId)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Please leave your other active game(s) before joining a new one.')
        }

        const game = await this.getState(gameId, { game: ['password'] });

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        if (game.players.length >= game.maxPlayers) {
            throw new CustomException(ERROR_BAD_REQUEST, 'This game is already full');
        }

        if (game.password) {
            if (!password || !await bcrypt.compare(password, game.password)) {
                throw new CustomException(ERROR_FORBIDDEN, 'Incorrect room password');
            }
        }

        await PlayerService.create(userId, gameId);

        const updatedGameState = await this.getStateResponse(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });
    }

    static async replacePlayerWithBot(game: IGameState, player: Player) {
        const inGameBotIds = game.players.filter(player => player.user.isBot).map(player => player.id);

        const availableBots = await User.findAll({
            where: {
                isBot: true,
                id: {
                    [Op.notIn]: inGameBotIds
                }
            }
        });

        const bot = shuffle(availableBots)[0];

        await Player.update({
            userId: bot.id,
        }, {
            where: {
                id: player.id
            }
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
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: [
                                'id',
                                'isBot'
                            ]
                        }
                    ]
                },
            ]
        });

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
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
                } else if (!player.user.isBot) {
                    await this.replacePlayerWithBot(game, player);
                }

                break;
            case GameState.ENDED:
                throw new CustomException(ERROR_BAD_REQUEST, 'You cannot leave a game that has ended');
            default:
                game.state = GameState.ENDED;
                await game.save();
        }

        if (game.players.filter(player => !player.user.isBot).length - 1 === 0) {
            await game.destroy();
        } else {
            const updatedGameState = await this.getStateResponse(gameId);

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

    static async orderCards(userId: number, gameId: number, cardIds: number[]): Promise<void> {
        const player = await Player.findOne({
            where: {
                gameId,
                userId,
            },
            include: [
                {
                    model: Card,
                    where: {
                        state: CardState.IN_HAND
                    }
                },
            ]
        });

        let index;

        for (const card of player.cards) {
            index = cardIds.indexOf(card.id);

            if (index === -1) {
                throw new CustomException(ERROR_BAD_REQUEST, 'Card not found');
            }

            await card.update({
                index,
            });
        }
    }

    static async removeBotPlayer(userId: number, gameId: number, botPlayerId: number) {
        const game = await this.getState(gameId);

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        if (game.creatorId !== userId) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Only the game creator can remove a bot player');
        }

        if (game.state !== GameState.CREATED) {
            throw new CustomException(ERROR_BAD_REQUEST, 'You cannot remove a bot after the game has already started');
        }

        await Player.destroy({
            where: {
                id: botPlayerId,
            }
        });

        const updatedGameState = await this.getStateResponse(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });
    }

    static setTurnOrder(players: Player[]): number[] {
        return shuffle(players).map(player => player.id);
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
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: [
                                'id',
                                'username',
                                'isBot'
                            ],
                        }
                    ],
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
            throw new CustomException(ERROR_BAD_REQUEST, 'The game has already started');
        }

        const players = game.players;

        if (players.length < 2) {
            throw new CustomException(ERROR_BAD_REQUEST, 'The game must have at least two players');
        }

        const tribesLimit = players.length >= 4 ? 6 : 5;

        if (!this.validateSettings(settings, tribesLimit)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid game settings');
        }

        const tribes = shuffle(await Tribe.findAll({
            where: {
                name: {
                    [Op.in]: [...settings.tribes, TribeName.DRAGON]
                }
            }
        }));

        const cards = await this.generateCards(game.id, tribes);

        await this.dealCards(game.id, players, cards);

        const turnOrder = this.setTurnOrder(players);

        const startingPlayerId = turnOrder[0];

        await this.generateRegions(gameId, players.length);

        await this.assignPlayerColors(players);

        await Game.update(
            {
                activePlayerId: startingPlayerId,
                state: GameState.STARTED,
                settings,
                turnOrder,
            },
            {
                where: {
                    id: gameId,
                }
            }
        );

        const gameState = await this.getStateResponse(game.id);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: gameState
        });

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });

        const startingPlayer = players.find(player => player.id === startingPlayerId);

        if (gameState.state === GameState.STARTED && startingPlayer.user.isBot) {
            await BotService.takeTurn(game.id, startingPlayer.id);
        }
    }

    static async startNewAge(game: Game) {
        const scoringResults = await ScoringService.handleScoring(game);

        await this.dealCards(game.id, game.players, game.cards);

        await Player.update({
            giantTokenValue: 0,
            trollTokens: [],
        }, {
            where: {
                gameId: game.id
            }
        });

        const nextPlayerId = this.getNewAgeFirstPlayerId(scoringResults, game.activePlayerId, game.turnOrder);
        const nextPlayer = game.players.find(player => player.id === nextPlayerId);

        await Game.update({
            age: game.age + 1,
            activePlayerId: nextPlayerId
        }, {
            where: {
                id: game.id,
            }
        });

        await NextAction.update({
            state: NextActionState.RESOLVED,
        }, {
            where: {
                state: NextActionState.PENDING,
                gameId: game.id
            }
        });

        const updatedGameState = await this.getStateResponse(game.id);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });

        if (updatedGameState.state === GameState.STARTED &&  nextPlayer.user.isBot) {
            await BotService.takeTurn(game.id, nextPlayer.id);
        }
    };

    static async endFinalAge(game: Game) {
        const { winnerId: winningPlayerId } = await ScoringService.handleScoring(game);

        const winnerId = game.players.find(player => player.id === winningPlayerId)?.user.id;

        await Game.update({
            state: GameState.ENDED,
            winnerId
        }, {
            where: {
                id: game.id,
            }
        });

        const updatedGameState = await this.getStateResponse(game.id);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });


        await Player.update({
            validActions: [],
        }, {
            where: {
                gameId: game.id,
            }
        });
    }

    static async updateSettings(userId: number, gameId: number, settings: IGameSettings): Promise<void> {
        const game = await Game.findOne({
            where: {
                id: gameId,
            },
        });

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        if (game.creatorId !== userId) {
            throw new CustomException(ERROR_FORBIDDEN, 'Only the game creator can update the settings');
        }

        if (game.state !== GameState.CREATED) {
            throw new CustomException(ERROR_BAD_REQUEST, 'The game has already started');
        }

        if (!this.validateSettings(settings, settings?.tribes?.length)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid game settings');
        }

        await Game.update(
            {
                settings,
            },
            {
                where: {
                    id: gameId,
                }
            }
        );

        const gameState = await this.getStateResponse(game.id);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: gameState
        });

        const activeGames = await this.getActiveGames();

        EventService.emitEvent({
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: activeGames
        });
    }

    static validateSettings(settings: IGameSettings, tribeLimit = 6) {
        if (!settings ||
            !settings.tribes ||
            !Array.isArray(settings.tribes) ||
            Object.keys(settings).length > 1 ||
            settings.tribes.filter((tribe) => !TRIBES.includes(tribe)).length ||
            settings.tribes.length !== tribeLimit
        ) {
            return false;
        }

        return true;
    }
}
