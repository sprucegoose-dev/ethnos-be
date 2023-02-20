import { Op } from 'sequelize';
import { ERROR_BAD_REQUEST } from '../helpers/exception_handler';
import { Card } from '../models/card.model';
import { CardType } from '../models/card_type.model';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { EVENT_ACTIVE_GAMES_UPDATE } from '../types/event.interface';
import { GamePhase, GameState } from '../types/game.interface';
import { PlayerOrientation } from '../types/player.interface';
import { IUserResponse } from '../types/user.interface';
import EventService from './event.service';
import GameService from './game.service';
import PlayerService from './player.service';
import UserService from './user.service';

describe('GameService', () => {
    const userDataA = {
        username: 'SpruceGoose',
        email: 'spruce.goose@gmail.com',
        password: 'alrighty.then',
    };
    const userDataB = {
        username: 'VioleTide',
        email: 'violet.tide@gmail.com',
        password: 'animaniacs',
    };
    const userDataC = {
        username: 'Milky',
        email: 'milky.fury@yahoo.com',
        password: 'smoothie',
    };
    let userA: IUserResponse;
    let userB: IUserResponse;
    let userC: IUserResponse;

    beforeAll(async () => {
        userA = await UserService.create(userDataA);
        userB = await UserService.create(userDataB);
        userC = await UserService.create(userDataC);
    });

    describe('create', () => {

        beforeEach(async () => {
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

        afterAll(async () => {
            await Game.truncate();
        });

    });

    describe('leave', () => {

        it('should delete the game if the creator has left before the game started and the room is empty', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userA.id, newGame.id);

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
            await PlayerService.create(userA.id, newGame.id);
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
            await PlayerService.create(userA.id, newGame.id);
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

        it('should end the game if it had already started and set the other player as winner', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userA.id, newGame.id);
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
            await PlayerService.create(userA.id, newGame.id);
            await PlayerService.create(userB.id, newGame.id);

            await GameService.leave(userA.id, newGame.id);

            const activeGames = await GameService.getActiveGames();

            const emitEventSpy = jest.spyOn(EventService, 'emitEvent');

            expect(emitEventSpy).toHaveBeenCalledWith({
                type: EVENT_ACTIVE_GAMES_UPDATE,
                payload: activeGames
            });
        });

        afterAll(async () => {
            await Game.truncate();
        });

    });

    describe('join', () => {

        beforeEach(async () => {
            await Game.truncate();
        });

        it('should assign the user as a player in the game', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userA.id, newGame.id);
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
            const newGame = await GameService.create(userA.id);
            const newGame2 = await GameService.create(userA.id);

            await PlayerService.create(userA.id, newGame.id);

            try {
                await GameService.join(userA.id, newGame2.id);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toContain('Please leave');
            }
        });

        it('should throw an error if the game is already full', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userA.id, newGame.id);
            await PlayerService.create(userB.id, newGame.id);

            try {
                await GameService.join(userC.id, newGame.id);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('This game is already full');
            }
        });

        afterAll(async () => {
            await Game.truncate();
        });

    });

    describe('start', () => {
        let game: Game;
        let playerA: Player;
        let playerB: Player;

        beforeAll(async () => {
            game = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, game.id);
            playerB = await PlayerService.create(userB.id, game.id);
        });

        afterEach(async () => {
            await Card.truncate();
        });

        afterAll(async () => {
            await Game.truncate();
        });

        it('should deal 9 continuum cards', async () => {
            await GameService.start(userA.id, game.id);

            const continuumCards = await Card.findAll({
                where: {
                    gameId: game.id,
                    playerId: null,
                    index: {
                        [Op.not]: null,
                    }
                }
            });

            expect(continuumCards.length).toBe(9);
        });

        it('should deal 3 cards to each player', async () => {
            await GameService.start(userA.id, game.id);

            const playerACards = await Card.findAll({
                where: {
                    gameId: game.id,
                    playerId: playerA.id,
                }
            });

            const playerBCards = await Card.findAll({
                where: {
                    gameId: game.id,
                    playerId: playerB.id,
                }
            });

            expect(playerACards.length).toBe(3);
            expect(playerBCards.length).toBe(3);
        });

        it('should deal one Codex card', async () => {
            await GameService.start(userA.id, game.id);

            const codexCard = await Card.findOne({
                where: {
                    gameId: game.id,
                    playerId: null,
                    index: null,
                }
            });

            expect(codexCard).toBeDefined();
        });

        it('should set the starting Codex color to the color of the last card in the continuum', async () => {
            await GameService.start(userA.id, game.id);

            const updatedGame = await Game.findOne({
                where: {
                    id: game.id,
                }
            });

            const lastCard = await Card.findOne({
                where: {
                    gameId: game.id,
                    playerId: null,
                    index: {
                        [Op.not]: null,
                    },
                },
                order: [['id', 'DESC']],
                include: [
                    CardType,
                ]
            });

            expect(updatedGame.codexColor).toBe(lastCard.type.color);
        });

        it('should set the starting game phase to \'deployment\'', async () => {
            await GameService.start(userA.id, game.id);

            const updatedGame = await Game.findOne({
                where: {
                    id: game.id,
                }
            });

            expect(updatedGame.phase).toBe(GamePhase.DEPLOYMENT);
        });

        it('should orient one player at the top and one at the bottom', async () => {
            await GameService.start(userA.id, game.id);

            const players = await Player.findAll({
                where: {
                    gameId: game.id,
                }
            });

            expect(players.map(p => p.orientation).sort()).toEqual([PlayerOrientation.DEFAULT, PlayerOrientation.INVERSE]);
        });

        it('should emit an \'update active games\' websocket event', async () => {
            await GameService.start(userA.id, game.id);

            const activeGames = await GameService.getActiveGames();

            const emitEventSpy = jest.spyOn(EventService, 'emitEvent');

            expect(emitEventSpy).toHaveBeenCalledWith({
                type: EVENT_ACTIVE_GAMES_UPDATE,
                payload: activeGames
            });
        });

        afterAll(async () => {
            await Game.truncate();
        });

    });

});
