// import { Op } from 'sequelize';
// import { ERROR_BAD_REQUEST } from '../helpers/exception_handler';
// import { Card } from '../models/card.model';
import { Game } from '../models/game.model';
// import { Player } from '../models/player.model';
import { EVENT_ACTIVE_GAMES_UPDATE } from '../types/event.interface';
import { GameState } from '../types/game.interface';
import { IUserResponse } from '../types/user.interface';
import EventService from './event.service';
import GameService from './game.service';
// import PlayerService from './player.service';
import UserService from './user.service';

describe('GameService', () => {
    const userDataA = {
        username: 'SpruceGoose',
        email: 'spruce.goose@gmail.com',
        password: 'alrighty.then',
    };
    // const userDataB = {
    //     username: 'VioleTide',
    //     email: 'violet.tide@gmail.com',
    //     password: 'animaniacs',
    // };
    // const userDataC = {
    //     username: 'Milky',
    //     email: 'milky.fury@yahoo.com',
    //     password: 'smoothie',
    // };
    let userA: IUserResponse;
    // let userB: IUserResponse;
    // let userC: IUserResponse;

    beforeAll(async () => {
        userA = await UserService.create(userDataA);
        // userB = await UserService.create(userDataB);
        // userC = await UserService.create(userDataC);
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
});
