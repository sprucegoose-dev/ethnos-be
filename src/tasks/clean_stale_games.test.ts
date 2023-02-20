import { Game } from '../models/game.model';
import { GameState } from '../types/game.interface';
import { IUserResponse } from '../types/user.interface';
import UserService from '../services/user.service';
import GameService from '../services/game.service';
import StaleGamesCleaner, {
    IN_PROGRESS_GAMES_TIMEOUT_HRS,
    PENDING_GAMES_TIMEOUT_HRS,
} from './clean_stale_games';
import moment from 'moment';

const {
    CREATED,
    SETUP,
    STARTED,
} = GameState;

describe('StaleGamesCleaner', () => {
    const userDataA = {
        username: 'SpruceGoose',
        email: 'spruce.goose@gmail.com',
        password: 'alrighty.then',
    };

    let userA: IUserResponse;

    beforeAll(async () => {
        userA = await UserService.create(userDataA);
    });

    describe('cleanUp', () => {

        beforeEach(async () => {
            await Game.truncate();
        });

        it(`should cancel a game in a '${CREATED}' state if ${PENDING_GAMES_TIMEOUT_HRS} hours have elapsed`, async () => {
            const newGame = await GameService.create(userA.id);

            await Game.update({
                createdAt: moment().subtract(PENDING_GAMES_TIMEOUT_HRS + 1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
            }, {
                where: {
                    id: newGame.id
                }
            });

            await StaleGamesCleaner.cleanUp();

            const cancelledGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(cancelledGame.state).toBe(GameState.CANCELLED);
        });

        it(`should cancel a game in a '${SETUP}' state if ${PENDING_GAMES_TIMEOUT_HRS} hours have elapsed`, async () => {
            const newGame = await GameService.create(userA.id);

            await Game.update({
                createdAt: moment().subtract(PENDING_GAMES_TIMEOUT_HRS + 1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                state: SETUP,
            }, {
                where: {
                    id: newGame.id
                }
            });

            await StaleGamesCleaner.cleanUp();

            const cancelledGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(cancelledGame.state).toBe(GameState.CANCELLED);
        });


        it(`should cancel a game in a '${STARTED}' state if ${IN_PROGRESS_GAMES_TIMEOUT_HRS} hours have elapsed`, async () => {
            const newGame = await GameService.create(userA.id);

            await Game.update({
                updatedAt: moment().subtract(IN_PROGRESS_GAMES_TIMEOUT_HRS + 1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                state: STARTED,
            }, {
                where: {
                    id: newGame.id
                },
                silent: true,
            });

            await StaleGamesCleaner.cleanUp();

            const cancelledGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(cancelledGame.state).toBe(GameState.CANCELLED);
        });

    });

});
