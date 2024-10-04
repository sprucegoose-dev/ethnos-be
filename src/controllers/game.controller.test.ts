import Game from '@models/game.model';

import { userA } from '@jest.setup';

import GameController from './game.controller';
import { GameState } from '../interfaces/game.interface';
import Player from '../models/player.model';

describe('GameController', () => {

    describe('create', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await Game.truncate());

        it("should create a new user", async () => {
            const request: any = {
                userId: userA.id
            };

            await GameController.create(request, response);

            const game = await Game.findOne({
                where: {
                    state: GameState.CREATED,
                    creatorId: userA.id
                }
            });

            expect(game).not.toBeNull();
        });

        it("should return the new user", async () => {
            const request: any = {
                userId: userA.id
            };

            await GameController.create(request, response);

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
                id: game.id,
                creatorId: userA.id,
                activePlayerId: null,
                age: 1,
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
                cards: [],
                settings: null,
                state: GameState.CREATED,
                turnOrder: [],
                createdAt: game.createdAt,
                updatedAt: game.updatedAt,
                winnerId: null,
            });
        });
    });
});
