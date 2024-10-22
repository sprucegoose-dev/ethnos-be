import { Op } from 'sequelize';

import GameService from './game.service';

import Game from '@models/game.model';
import Player from '@models/player.model';
import Card from '@models/card.model';

import EventService from '@services/event/event.service';
import PlayerService from '@services/player/player.service';

import { EVENT_ACTIVE_GAMES_UPDATE } from '@interfaces/event.interface';
import { GameState, IGameSettings, IGameState } from '@interfaces/game.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { CardState } from '@interfaces/card.interface';

import {
    ERROR_BAD_REQUEST,
    ERROR_FORBIDDEN,
    ERROR_NOT_FOUND,
} from '@helpers/exception-handler';

import {
    UNEXPECTED_ERROR_MSG,
    userA,
    userB,
    userC,
    userD,
} from '@jest.setup';
import { assignCardsToPlayer, createGame, returnPlayerCardsToDeck } from '../test-helpers';

describe('GameService', () => {

    describe('create', () => {

        afterEach(async () => await Game.truncate());

        it('should create a new game', async () => {
            const newGame = await GameService.create(userA.id);

            const existingGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(existingGame.creatorId).toBe(userA.id);
            expect(existingGame.state).toBe(GameState.CREATED);
        });

        it('should emit an \'update active games\' websocket event', async () => {
            await GameService.create(userA.id);

            const activeGames = await GameService.getActiveGames();

            const emitEventSpy = jest.spyOn(EventService, 'emitEvent');

            expect(emitEventSpy).toHaveBeenCalledWith({
                type: EVENT_ACTIVE_GAMES_UPDATE,
                payload: activeGames
            });
        });

        it('should throw an error if the user already has an active game', async () => {
            await GameService.create(userA.id);

            try {
                await GameService.create(userA.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Please leave your other active game(s) before creating a new one.');
            }
        });
    });

    describe('getActiveGames', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it('should return all active games', async () => {
            const activeGames = await GameService.getActiveGames();
            expect(activeGames[0].id).toBe(gameState.id);
        });

        it("should return a game with a 'hasPassword' value of 1 if the active game has a password", async () => {
            await Game.update({
                password: 'some-password'
            }, {
                where: {
                    id: gameState.id
                }
            });

            const activeGames = await GameService.getActiveGames();

            expect(activeGames[0].id).toBe(gameState.id);
            expect(activeGames[0].toJSON().hasPassword).toBe(1);
        });
    });

    describe('getCardsInHand', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
            playerA = result.playerA;
        });

        afterEach(async () => await Game.truncate());

        it("should return all cards in a player's hand", async () => {

            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameState.id);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARVES &&
                card.index !== null
            ).slice(0, 3)
            .sort((cardA, cardB) => cardA.index - cardB.index);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const cardsInHand = await GameService.getCardsInHand(playerA.userId, gameState.id);

            expect(cardsInHand.length).toBe(3);

            for (let i = 0; i < cardsInHand.length; i++) {
                expect(cardsInHand[i]).toEqual( expect.objectContaining({
                    id: cardsToAssign[i].id,
                    color: cardsToAssign[i].color,
                    index: cardsToAssign[i].index,
                    state: CardState.IN_HAND,
                    tribeId: cardsToAssign[i].tribeId,
                }));
            }
        });
    });

    describe('leave', () => {

        afterEach(async () => await Game.truncate());

        it('should delete the game if the creator has left before the game started and the room is empty', async () => {
            const newGame = await GameService.create(userA.id);

            await GameService.leave(userA.id, newGame.id);

            const existingGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(existingGame).toBe(null);
        });

        it('should cancel the game if the creator has left before the game started and there is another player in the room', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userB.id, newGame.id);

            await GameService.leave(userA.id, newGame.id);

            const existingGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(existingGame.state).toBe(GameState.CANCELLED);
        });

        it('should prevent leaving the game if it has already ended', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userB.id, newGame.id);

            await Game.update({
                state: GameState.ENDED,
            }, {
                where: {
                    id: newGame.id
                }
            });

            try {
                await GameService.leave(userA.id, newGame.id);

            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);

            }
        });

        // TODO: change logic as there are multiple players in the game
        // TODO: maybe replace the player whose left with a bot
        it('should end the game if it had already started and set the other player as winner', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userB.id, newGame.id);

            await Game.update({
                state: GameState.STARTED,
            }, {
                where: {
                    id: newGame.id
                }
            });

            await GameService.leave(userA.id, newGame.id);

            const updatedGame = await Game.findOne({
                where: {
                    id: newGame.id
                }
            });

            expect(updatedGame.state).toBe(GameState.ENDED);
            expect(updatedGame.winnerId).toBe(userB.id);
        });

        it('should emit an \'update active games\' websocket event', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userB.id, newGame.id);

            await GameService.leave(userA.id, newGame.id);

            const activeGames = await GameService.getActiveGames();

            const emitEventSpy = jest.spyOn(EventService, 'emitEvent');

            expect(emitEventSpy).toHaveBeenCalledWith({
                type: EVENT_ACTIVE_GAMES_UPDATE,
                payload: activeGames
            });
        });

        it('should throw an error if the game is not found', async () => {
            try {
                await GameService.leave(userA.id, 1);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it('should throw an error if the user is not in the game', async () => {
            const newGame = await GameService.create(userA.id);

            try {
                await GameService.leave(userB.id, newGame.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('You are not in this game');
            }
        });
    });

    describe('join', () => {

        afterEach(async () => await Game.truncate());

        it('should assign the user as a player in the game', async () => {
            const newGame = await GameService.create(userA.id);
            await GameService.join(userB.id, newGame.id);

            const player = await Player.findOne({
                where: {
                    gameId: newGame.id,
                    userId: userB.id,
                }
            });

            expect(player).toBeDefined();
        });

        it('should throw an error if the user is already in another active game', async () => {
            await GameService.create(userA.id);
            const newGame2 = await GameService.create(userB.id);

            try {
                await GameService.join(userA.id, newGame2.id);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toContain('Please leave');
            }
        });

        it('should throw an error if the game is already full', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userB.id, newGame.id);
            await PlayerService.create(userC.id, newGame.id);

            await Game.update({
                maxPlayers: 3
            }, {
                where: {
                    id: newGame.id
                }
            });

            try {
                await GameService.join(userD.id, newGame.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('This game is already full');
            }
        });

        it('should throw an error if the game is not found', async () => {
            try {
                await GameService.join(userA.id, 1);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it('should throw an error if the game has a password and an incorrect password is provided', async () => {
            const newGame = await GameService.create(userA.id, true, 'some-password');
            await PlayerService.create(userB.id, newGame.id);
            await PlayerService.create(userC.id, newGame.id);

            try {
                await GameService.join(userD.id, newGame.id, 'incorrect-password');
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_FORBIDDEN);
                expect(error.message).toBe('Incorrect room password');
            }
        });

        it('should throw an error if the game has a password and no password is provided', async () => {
            const newGame = await GameService.create(userA.id, true, 'some-password');
            await PlayerService.create(userB.id, newGame.id);
            await PlayerService.create(userC.id, newGame.id);

            try {
                await GameService.join(userD.id, newGame.id, null);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_FORBIDDEN);
                expect(error.message).toBe('Incorrect room password');
            }
        });
    });

    describe('start', () => {
        let game: Game;
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;
        let settings: IGameSettings;

        beforeEach(async () => {
            game = await GameService.create(userA.id, false);
            playerA = await PlayerService.create(userA.id, game.id);
            playerB = await PlayerService.create(userB.id, game.id);
            playerC = await PlayerService.create(userC.id, game.id);
            playerD = await PlayerService.create(userD.id, game.id);

            settings = {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                ]
            };
        });

        afterEach(async () => await Game.truncate());

        it("should set the game state to 'started'", async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            expect(updatedGame.state).toBe(GameState.STARTED);
        });

        it('should deal 1 card to each player', async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            const playerCards = updatedGame.cards.filter(card => card.state === CardState.IN_HAND);

            expect(playerCards.length).toBe(4);

            expect(playerCards.filter(card => card.playerId === playerA.id).length).toBe(1);
            expect(playerCards.filter(card => card.playerId === playerB.id).length).toBe(1);
            expect(playerCards.filter(card => card.playerId === playerC.id).length).toBe(1);
            expect(playerCards.filter(card => card.playerId === playerD.id).length).toBe(1);
        });

        it('should deal twice as many cards to the market as there are players', async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            const marketCards = updatedGame.cards.filter(card => card.state == CardState.IN_MARKET);

            expect(marketCards.length).toBe(8);
        });

        it('should create a draw pile from the remaining cards plus three dragon cards', async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            const deckCards = updatedGame.cards.filter(card => card.state == CardState.IN_DECK);

            const marketCards = updatedGame.cards.filter(card => card.state == CardState.IN_MARKET);

            const totalCardsInclDragons = 75;

            expect(deckCards.length).toBe(totalCardsInclDragons - updatedGame.players.length - marketCards.length);
            expect(deckCards.filter(card => card.tribe.name === TribeName.DRAGON).length).toBe(3);
        });

        it('should create 6 regions with 3 ascending values each', async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            expect(updatedGame.regions.length).toBe(6);

            for (const region of updatedGame.regions) {
                expect(region.values.length).toBe(3);
                expect(region.values[0]).toBeLessThanOrEqual(region.values[1]);
                expect(region.values[1]).toBeLessThanOrEqual(region.values[2]);
            }
        });

        it('should throw an error if the game is not found', async () => {
            try {
                await GameService.start(userA.id, 1, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it("should throw an error if the user starting the game isn't the room creator", async () => {
            try {
                await GameService.start(userB.id, game.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_FORBIDDEN);
                expect(error.message).toBe('Only the game creator can start the game');
            }
        });

        it("should throw an error if the game has already started", async () => {
            await Game.update({
                state: GameState.STARTED,
            }, {
                where: {
                    id: game.id,
                }
            });

            try {
                await GameService.start(userA.id, game.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('The game has already started');
            }
        });

        it("should throw an error if the game has fewer than 2 players", async () => {
            await Player.destroy({
                where: {
                    userId: {
                        [Op.not]: userA.id
                    }
                }
            });

            try {
                await GameService.start(userA.id, game.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('The game must have at least two players');
            }
        });

        it.each([
            null,
            {},
            { tribes: 'not an array' },
            { tribes: [], invalidOption: {} },
            {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                    'invalid tribe'
                ]
            },
            {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                ]
            },
        ])('should throw an error when the game settings are invalid: %s', async (settings) => {

            try {
                await GameService.start(userA.id, game.id, settings as IGameSettings);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Invalid game settings');
            }
        });
    });

    describe('startNewAge', () => {
        let gameId: number;
        let gameState: IGameState;
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
            playerB = result.playerB;
            playerC = result.playerC;
            playerD = result.playerD;
            gameId = result.gameId;
            gameState = result.gameState;
            gameState.players.map(async player => await returnPlayerCardsToDeck(player.id));

            await Card.update({
                state: CardState.IN_DECK
            }, {
                where: {
                    gameId,
                    state: CardState.IN_MARKET
                }
            });
        });

        afterEach(async () => await Game.truncate());

        it("should deal a card to each player and cards to the market based on the number of players", async () => {
            await GameService.startNewAge(gameState);

            const updatedGame = await GameService.getState(gameId);

            for (const player of updatedGame.players) {
                expect(player.cards.length).toBe(1);
                expect(player.cards[0].state).toBe(CardState.IN_HAND);
            }

            expect(updatedGame.cards.filter(card => card.state === CardState.IN_MARKET).length).toBe(8);
        });

        it("should reset the players' 'giant token value' and 'troll tokens''", async () => {
            await Player.update({
                giantTokenValue: 5,
                trollTokens: [1]
            }, {
                where: {
                    id: playerA.id,
                }
            });
            await Player.update({
                giantTokenValue: 2,
                trollTokens: [4]
            }, {
                where: {
                    id: playerB.id,
                }
            });
            await Player.update({
                giantTokenValue: 3,
                trollTokens: [5]
            }, {
                where: {
                    id: playerC.id,
                }
            });
            await Player.update({
                giantTokenValue: 1,
                trollTokens: [2, 3]
            }, {
                where: {
                    id: playerD.id,
                }
            });

            await GameService.startNewAge(gameState);

            const updatedGame = await GameService.getState(gameId);

            for (const player of updatedGame.players) {
                expect(player.giantTokenValue).toBe(0);
                expect(player.trollTokens).toEqual([]);
            }
        });
    });

    describe('getNextPlayerId', () => {
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
            playerB = result.playerB;
            playerC = result.playerC;
            playerD = result.playerD;
        });

        afterEach(async () => await Game.truncate());

        it("should return the ID of the next player in turn order", () => {
            const activePlayerId = playerA.id;
            const turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];

            const nextPlayerId = GameService.getNextPlayerId(activePlayerId, turnOrder);
            expect(nextPlayerId).toBe(playerB.id);
        });

        it("should return the ID of the first player if the current active player is the last player", () => {
            const activePlayerId = playerD.id;
            const turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];

            const nextPlayerId = GameService.getNextPlayerId(activePlayerId, turnOrder);
            expect(nextPlayerId).toBe(playerA.id);
        });
    });

    describe('getNewAgeFirstPlayerId', () => {
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;
        let prevPlayerId: number;
        let turnOrder: number[];

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });
            playerA = result.playerA;
            playerB = result.playerB;
            playerC = result.playerC;
            playerD = result.playerD;
            prevPlayerId = playerA.id;
            turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];
        });

        afterEach(async () => await Game.truncate());

        it('should return the ID of the player with the fewest points', () => {
            const scoringResults = {
                totalPoints: {
                    [playerA.id]: 18,
                    [playerB.id]: 12,
                    [playerC.id]: 10,
                    [playerD.id]: 14,
                },
                trollTokenTotals: {},
            };

            const playerId = GameService.getNewAgeFirstPlayerId(scoringResults, prevPlayerId, turnOrder);

            expect(playerId).toBe(playerC.id);
        });

        it('should break ties between the players with the fewest points based on the greatest troll token value', () => {
            const scoringResults = {
                totalPoints: {
                    [playerA.id]: 18,
                    [playerB.id]: 10,
                    [playerC.id]: 10,
                    [playerD.id]: 14,
                },
                trollTokenTotals: {
                    [playerA.id]: 0,
                    [playerB.id]: 3,
                    [playerC.id]: 1,
                    [playerD.id]: 6,
                },
            };

            const playerId = GameService.getNewAgeFirstPlayerId(scoringResults, prevPlayerId, turnOrder);

            expect(playerId).toBe(playerB.id);
        });

        it('should assign the player who drew the last dragon if they are among the players with fewest points and players are still tied', () => {
            const scoringResults = {
                totalPoints: {
                    [playerA.id]: 10,
                    [playerB.id]: 10,
                    [playerC.id]: 10,
                    [playerD.id]: 14,
                },
                trollTokenTotals: {
                    [playerA.id]: 0,
                    [playerB.id]: 0,
                    [playerC.id]: 0,
                    [playerD.id]: 0,
                },
            };

            turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];

            const playerId = GameService.getNewAgeFirstPlayerId(scoringResults, prevPlayerId, turnOrder);

            expect(playerId).toBe(playerA.id);
        });

        it('should assign the player closest in turn order to the player who drew the last dragon if players are still tied', () => {
            const scoringResults = {
                totalPoints: {
                    [playerA.id]: 12,
                    [playerB.id]: 10,
                    [playerC.id]: 10,
                    [playerD.id]: 14,
                },
                trollTokenTotals: {
                    [playerA.id]: 0,
                    [playerB.id]: 0,
                    [playerC.id]: 0,
                    [playerD.id]: 0,
                },
            };

            turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];

            const playerId = GameService.getNewAgeFirstPlayerId(scoringResults, prevPlayerId, turnOrder);

            expect(playerId).toBe(playerB.id);
        });
    });

    describe('validateSettings', () => {
        it.each([
            null,
            {},
            { tribes: 'not an array' },
            { tribes: [], invalidOption: {} },
            {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                    'invalid tribe'
                ]
            },
            {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                ]
            },
        ])('should return false when the game settings are invalid: %s', (settings) => {
            expect(GameService.validateSettings(settings as IGameSettings)).toEqual(false);
        });

        it('should return true when the game settings are valid: %s', () => {
            const settings = {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                    TribeName.MERFOLK,
                ]
            };
            expect(GameService.validateSettings(settings)).toEqual(true);
        });
    });

    describe('updateSettings', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            gameState = await GameService.create(userA.id, false);
        });

        afterEach(async () => await Game.truncate());

        it('should update the game settings', async () => {
            const settings = {
                tribes: [
                    TribeName.ORCS,
                    TribeName.ELVES,
                    TribeName.SKELETONS
                ]
            }
            await GameService.updateSettings(userA.id, gameState.id, settings);

            const updatedGameState = await Game.findOne({ where: {
                id: gameState.id }
            });

            expect(updatedGameState.settings).toEqual(settings);
        });

        it('should throw an error if the game is not found', async () => {
            try {
                await Game.truncate();
                await GameService.updateSettings(userA.id, 1, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it("should throw an error if the user updating the game isn't the room creator", async () => {
            try {
                await GameService.updateSettings(userB.id, gameState.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_FORBIDDEN);
                expect(error.message).toBe('Only the game creator can update the settings');
            }
        });

        it("should throw an error if the game has already started", async () => {
            await Game.update({
                state: GameState.STARTED,
            }, {
                where: {
                    id: gameState.id,
                }
            });

            try {
                await GameService.updateSettings(userA.id, gameState.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('The game has already started');
            }
        });

        it.each([
            null,
            {},
            { tribes: 'not an array' },
        ])('should throw an error when the game settings are invalid: %s', async (settings) => {

            try {
                await GameService.updateSettings(userA.id, gameState.id, settings as IGameSettings);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Invalid game settings');
            }
        });

    });
});
