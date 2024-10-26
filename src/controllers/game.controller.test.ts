import bcrypt from 'bcrypt';

import Game from '@models/game.model';
import Player from '@models/player.model';

import { GameState, IGameState } from '@interfaces/game.interface';
import { ActionType } from '@interfaces/action.interface';
import { TribeName } from '@interfaces/tribe.interface';
import GamesController from './game.controller';

import GameService from '@services/game/game.service';
import CommandService from '@services/command/command.service';
import { createGame } from '@services/test-helpers';

import { userA, userB, userC, userD } from '@jest.setup';
import { PlayerColor } from '../interfaces/player.interface';

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

            await GamesController.assignPlayerColor(request, response);

            gameState = await GameService.getState(gameState.id);

            const updatedPlayer = gameState.players.find(player => player.userId === userA.id);
            expect(updatedPlayer.color).toBe(PlayerColor.BLUE);
        });
    });

    describe('create', () => {
        let response: any;

        beforeEach(() => {
            response = {
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
