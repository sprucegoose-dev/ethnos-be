import GameService from './game.service';

import Card from '@models/card.model';
import Game from '@models/game.model';
import Player from '@models/player.model';

import EventService from '@services/event/event.service';
import PlayerService from '@services/player/player.service';

import { EVENT_ACTIVE_GAMES_UPDATE } from '@interfaces/event.interface';
import { GameState, IGameSettings } from '@interfaces/game.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { CardState } from '@interfaces/card.interface';

import { ERROR_BAD_REQUEST } from '@helpers/exception_handler';

import {
    userA,
    userB,
    userC,
    userD,
} from '@jest.setup';
import { createGame } from '../test-helpers';

describe('GameService', () => {

    describe('create', () => {

        afterEach(async () => {
            await Game.truncate();
        });

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
    });

    describe('leave', () => {

        afterEach(async () => {
            await Game.truncate();
        });

        afterEach(async () => {
            await Game.truncate();
        });

        it('should delete the game if the creator has left before the game started and the room is empty', async () => {
            const newGame = await GameService.create(userA.id, true);

            await GameService.leave(userA.id, newGame.id);

            const existingGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(existingGame).toBe(null);
        });

        it('should cancel the game if the creator has left before the game started and there is another player in the room', async () => {
            const newGame = await GameService.create(userA.id, true);
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
            const newGame = await GameService.create(userA.id, true);
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
            const newGame = await GameService.create(userA.id, true);
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
            const newGame = await GameService.create(userA.id, true);
            await PlayerService.create(userB.id, newGame.id);

            await GameService.leave(userA.id, newGame.id);

            const activeGames = await GameService.getActiveGames();

            const emitEventSpy = jest.spyOn(EventService, 'emitEvent');

            expect(emitEventSpy).toHaveBeenCalledWith({
                type: EVENT_ACTIVE_GAMES_UPDATE,
                payload: activeGames
            });
        });
    });

    describe('join', () => {

        afterEach(async () => {
            await Game.truncate();
        });

        it('should assign the user as a player in the game', async () => {
            const newGame = await GameService.create(userA.id, true);
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
            await GameService.create(userA.id, true);
            const newGame2 = await GameService.create(userB.id, true);

            try {
                await GameService.join(userA.id, newGame2.id);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toContain('Please leave');
            }
        });

        // TODO: update
        // it('should throw an error if the game is already full', async () => {
        //     const newGame = await GameService.create(userA.id);
        //     await PlayerService.create(userA.id, newGame.id);
        //     await PlayerService.create(userB.id, newGame.id);

        //     try {
        //         await GameService.join(userC.id, newGame.id);
        //     } catch (error: any) {
        //         expect(error.type).toBe(ERROR_BAD_REQUEST);
        //         expect(error.message).toBe('This game is already full');
        //     }
        // });
    });

    describe('start', () => {
        let game: Game;
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;
        let settings: IGameSettings;

        beforeEach(async () => {
            game = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, game.id);
            playerB = await PlayerService.create(userB.id, game.id);
            playerC = await PlayerService.create(userC.id, game.id);
            playerD = await PlayerService.create(userD.id, game.id);

            settings = {
                tribes: [
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.WIZARD,
                ]
            };
        });

        afterEach(async () => {
            await Card.truncate();
            await Player.truncate();
            await Game.truncate();
        });

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
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.TROLL,
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
});
