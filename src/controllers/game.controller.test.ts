import bcrypt from 'bcrypt';

import Game from '@models/game.model';
import Player from '@models/player.model';

import { GameState, IGameState } from '@interfaces/game.interface';
import { ActionType } from '@interfaces/action.interface';
import { TribeName } from '@interfaces/tribe.interface';
import GamesController from './game.controller';

import GameService from '@services/game/game.service';
import CommandService from '@services/command/command.service';
import { assignCardsToPlayer, createGame, returnPlayerCardsToDeck } from '@services/test-helpers';

import { userA, userB, userC, userD } from '@jest.setup';
import { PlayerColor } from '../interfaces/player.interface';
import gameController from './game.controller';
import PlayerService from '../services/player/player.service';
import { CardState } from '../interfaces/card.interface';
import Card from '../models/card.model';

describe('GamesController', () => {

    describe('assignPlayerColor', () => {
        let gameState: IGameState;
        let response: any;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;

            await Player.update({
                color: null,
            }, {
                where: {
                    gameId: gameState.id
                }
            });

            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it('should assign a color to a player', async () => {
            const request: any = {
                userId: userA.id,
                params: {
                    id: gameState.id,
                },
                body: {
                    color: PlayerColor.BLUE
                }
            };

            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            await GamesController.assignPlayerColor(request, response);

            gameState = await GameService.getState(gameState.id);

            const updatedPlayer = gameState.players.find(player => player.userId === userA.id);
            expect(updatedPlayer.color).toBe(PlayerColor.BLUE);
        });
    });

    describe('addBotPlayer', () => {
        let gameState: IGameState;
        let response: any;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;

            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it('should add a bot to a game', async () => {
            const request: any = {
                userId: userA.id,
                params: {
                    id: gameState.id,
                }
            };

            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            await GamesController.addBotPlayer(request, response);

            gameState = await GameService.getState(gameState.id);

            const botPlayer = gameState.players.find(player => player.user.isBot);

            expect(botPlayer).not.toBe(undefined);
        });
    });

    describe('getCardsInHand', () => {
        let gameState: IGameState;
        let playerA: Player;
        let response: any;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
            playerA = result.playerA;

            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should return the cards in a player's hand", async () => {
            const request: any = {
                userId: playerA.userId,
                params: {
                    id: gameState.id,
                }
            };

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player
                .cards
                .filter(card => card.state === CardState.IN_HAND)
                .map(card => card.toJSON());

            await GamesController.getCardsInHand(request, response);

            const expectedResponse: Card[] = response.send.mock.calls[0][0];

            expect(expectedResponse.map(card => card.toJSON())).toEqual(cardsInHand);
        });
    });

    describe('getPlayerHands', () => {
        let gameState: IGameState;
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;
        let response: any;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
            playerA = result.playerA;
            playerB = result.playerB;
            playerC = result.playerC;
            playerD = result.playerD;

            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should return the cards in all players' hands, but only 'id' property for other player's cards", async () => {
            const request: any = {
                userId: playerA.userId,
                params: {
                    id: gameState.id,
                }
            };

            const updatedGame = await GameService.getState(gameState.id);

            const cardsByPlayerId: {[playerId: number]: Card[]} = {};

            updatedGame.players.map(player => {
                // @ts-ignore
                cardsByPlayerId[player.id] = player.cards.map(card => ({ id: card.id }));
            });

            await GamesController.getPlayerHands(request, response);

            const expectedResponse: {[playerId: number]: Card[]} = response.send.mock.calls[0][0];

            expect(expectedResponse[playerA.id].map(card => card.toJSON())).toEqual(cardsByPlayerId[playerA.id]);
            expect(expectedResponse[playerB.id].map(card => card.toJSON())).toEqual(cardsByPlayerId[playerB.id]);
            expect(expectedResponse[playerC.id].map(card => card.toJSON())).toEqual(cardsByPlayerId[playerC.id]);
            expect(expectedResponse[playerD.id].map(card => card.toJSON())).toEqual(cardsByPlayerId[playerD.id]);
        });
    });

    describe('create', () => {
        let response: any;

        beforeEach(() => {
            response = {
                status: jest.fn(),
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it('should create a new game', async () => {
            const request: any = {
                userId: userA.id,
            };

            await GamesController.create(request, response);

            const game = await Game.findOne({
                where: {
                    state: GameState.CREATED,
                    creatorId: userA.id
                }
            });

            expect(game).not.toBeNull();
        });

        it('should set a password for the room when sent in the request', async () => {
            const password = 'some-password';
            const request: any = {
                userId: userA.id,
                body: {
                    password,
                }
            };

            await GamesController.create(request, response);

            const game = await Game.unscoped().findOne({
                where: {
                    state: GameState.CREATED,
                    creatorId: userA.id
                }
            });

            expect(await bcrypt.compare(password, game.password)).toBe(true);
        });

        it("should return the game state", async () => {
            const request: any = {
                userId: userA.id
            };

            await GamesController.create(request, response);

            const game = await Game.findOne({
                where: {
                    state: GameState.CREATED,
                    creatorId: userA.id
                }
            });

            const player = await Player.findOne({
                where: {
                    gameId: game.id,
                    userId: userA.id
                }
            });

            expect(response.send).toHaveBeenCalledWith({
                activePlayerId: null,
                age: 1,
                cards: [],
                cardsInDeckCount: 0,
                createdAt: game.createdAt,
                creator: {
                    id: userA.id,
                    username: userA.username,
                },
                creatorId: userA.id,
                id: game.id,
                maxPlayers: 6,
                players: [
                    {
                        ...player.toJSON(),
                        cards: [],
                        user: {
                            id: userA.id,
                            isBot: false,
                            username: userA.username,
                        }
                    }
                ],
                regions: [],
                settings: {
                    tribes: []
                },
                state: GameState.CREATED,
                turnOrder: [],
                updatedAt: game.updatedAt,
                winnerId: null
            });
        });
    });

    describe('getActions', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should fetch a user's actions", async () => {
            const {
                gameState,
                playerA,
            } = await createGame();

            await Game.update({
                activePlayerId: playerA.id
            }, {
                where: {
                    id: gameState.id,
                }
            });

            const request: any = {
                userId: userA.id,
                params: {
                    id: gameState.id
                }
            };

            await GamesController.getActions(request, response);

            expect(response.send).toHaveBeenCalledWith([
                {
                    type: ActionType.DRAW_CARD
                },
                {
                    cardId: expect.any(Number),
                    type: ActionType.PICK_UP_CARD
                },
                {
                    cardId: expect.any(Number),
                    type: ActionType.PICK_UP_CARD
                },
                {
                    cardId: expect.any(Number),
                    type: ActionType.PICK_UP_CARD
                },
                {
                    cardId: expect.any(Number),
                    type: ActionType.PICK_UP_CARD
                },
                {
                    cardId: expect.any(Number),
                    type: ActionType.PICK_UP_CARD
                },
                {
                    cardId: expect.any(Number),
                    type: ActionType.PICK_UP_CARD
                },
                {
                    cardId: expect.any(Number),
                    type: ActionType.PICK_UP_CARD
                },
                {
                    cardId: expect.any(Number),
                    type: ActionType.PICK_UP_CARD
                },
                {
                    cardIds: expect.arrayContaining([expect.any(Number)]),
                    leaderId: expect.any(Number),
                    type: ActionType.PLAY_BAND
                }
            ]);

        });
    });

    describe('getActiveGames', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should return all active games", async () => {
            const {
                gameState,
            } = await createGame();

            const request: any = {};

            await GamesController.getActiveGames(request, response);

            expect(response.send).toHaveBeenCalledWith([
                expect.objectContaining({ id: gameState.id }),
            ]);
        });
    });

    describe('getState', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should return the game state", async () => {
            const {
                gameState,
            } = await createGame();

            const request: any = {
                userId: userA.id,
                params: {
                    id: gameState.id
                }
            };

            const gameStateResponse = await GameService.getStateResponse(gameState.id);

            await GamesController.getState(request, response);

            expect(response.send).toHaveBeenCalledWith(gameStateResponse);
        });
    });

    describe('handleAction', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should perform the user's action", async () => {
            const {
                gameState,
                playerA,
            } = await createGame();

            await Game.update({
                activePlayerId: playerA.id
            }, {
                where: {
                    id: gameState.id,
                }
            });

            const request: any = {
                userId: userA.id,
                params: {
                    id: gameState.id,
                },
                body: {
                    type: ActionType.DRAW_CARD
                }
            };

            const handleActionSpy = jest.spyOn(CommandService, 'handleAction');

            await GamesController.handleAction(request, response);

            expect(handleActionSpy).toHaveBeenCalledWith(userA.id, gameState.id, request.body);
        });
    });

    describe('join', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should add a player to a game", async () => {
            const game = await GameService.create(userA.id);

            expect(game.players.length).toBe(1);

            const request: any = {
                userId: userB.id,
                params: {
                    id: game.id
                },
                body: {}
            };

            await GamesController.join(request, response);

            const updatedGame = await GameService.getState(game.id);

            expect(updatedGame.players.length).toBe(2);
            expect(updatedGame.players[1].userId).toBe(userB.id);
        });
    });

    describe('orderCards', () => {
        let gameState: IGameState;
        let playerA: Player;
        let response: any;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
            playerA = result.playerA;

            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should order the cards in a player's hand", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const cardsInHand =  gameState.cards.filter(card => card.tribe.name !== TribeName.DRAGON).slice(0, 5);

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const request: any = {
                userId: userA.id,
                params: {
                    id: gameState.id,
                },
                body: {
                    cardIds: [
                        cardIdsToAssign[3],
                        cardIdsToAssign[2],
                        cardIdsToAssign[4],
                        cardIdsToAssign[0],
                        cardIdsToAssign[1],
                    ]
                }
            };

            await gameController.orderCards(request, response);

            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsSortByIndex = updatedPlayer.cards.sort((cardA, cardB) => cardA.index - cardB.index);

            expect(cardsSortByIndex[0].id).toBe(cardIdsToAssign[3]);
            expect(cardsSortByIndex[1].id).toBe(cardIdsToAssign[2]);
            expect(cardsSortByIndex[2].id).toBe(cardIdsToAssign[4]);
            expect(cardsSortByIndex[3].id).toBe(cardIdsToAssign[0]);
            expect(cardsSortByIndex[4].id).toBe(cardIdsToAssign[1]);
        });
    });

    describe('removeBotPlayer', () => {
        let gameState: IGameState;
        let response: any;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;

            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it('should remove a bot from a game', async () => {
            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            await GameService.addBotPlayer(userA.id, gameState.id);

            gameState = await GameService.getState(gameState.id);

            let botPlayer = gameState.players.find(player => player.user.isBot);

            const request: any = {
                userId: userA.id,
                params: {
                    id: gameState.id,
                    botPlayerId: botPlayer.id,
                }
            };

            await gameController.removeBotPlayer(request, response);

            gameState = await GameService.getState(gameState.id);

            botPlayer = gameState.players.find(player => player.user.isBot);

            expect(botPlayer).toBe(undefined);
        });
    });

    describe('leave', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should remove a player from a game", async () => {
            const gameStateResponse = await GameService.create(userA.id);

            await GameService.join(userB.id, gameStateResponse.id);
            await GameService.join(userC.id, gameStateResponse.id);
            await GameService.join(userD.id, gameStateResponse.id);

            let gameState = await GameService.getState(gameStateResponse.id);

            expect(gameState.players.length).toBe(4);

            const request: any = {
                userId: userD.id,
                params: {
                    id: gameState.id
                }
            };

            await GamesController.leave(request, response);

            gameState = await GameService.getState(gameState.id);

            expect(gameState.players.length).toBe(3);
            expect(gameState.players.find(player => player.userId === userD.id)).toBe(undefined);
        });
    });

    describe('start', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should start the game", async () => {
            const gameStateResponse = await GameService.create(userA.id);

            await GameService.join(userB.id, gameStateResponse.id);
            await GameService.join(userC.id, gameStateResponse.id);
            await GameService.join(userD.id, gameStateResponse.id);

            let gameState = await GameService.getState(gameStateResponse.id);

            expect(gameState.state).toBe(GameState.CREATED);

            const request: any = {
                userId: userA.id,
                params: {
                    id: gameState.id
                },
                body: {
                    tribes: [
                        TribeName.DWARVES,
                        TribeName.MINOTAURS,
                        TribeName.MERFOLK,
                        TribeName.CENTAURS,
                        TribeName.ELVES,
                        TribeName.WIZARDS,
                    ]
                }
            };

            await GamesController.start(request, response);

            gameState = await GameService.getState(gameState.id);

            expect(gameState.state).toBe(GameState.STARTED);
            expect(gameState.cards.length).toBe(75);
        });
    });

    describe('updateSttings', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should update the game settings", async () => {
            const gameState = await GameService.create(userA.id);

            const settings = {
                tribes: [
                    TribeName.ORCS,
                    TribeName.ELVES,
                    TribeName.SKELETONS
                ]
            };

            const request: any = {
                userId: userA.id,
                params: {
                    id: gameState.id
                },
                body: settings,
            };

            await GamesController.updateSettings(request, response);

            const updatedGameState = await Game.findOne({ where: {
                id: gameState.id }
            });

            expect(updatedGameState.settings).toEqual(settings);
        });
    });
});
