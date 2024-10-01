import StaleGamesCleaner, {
    IN_PROGRESS_GAMES_TIMEOUT_HRS,
    PENDING_GAMES_TIMEOUT_HRS,
} from './clean_stale_games';

import Game from '@models/game.model';
import { GameState } from '@interfaces/game.interface';
import GameService from '@services/game/game.service';
import { userA } from '@jest.setup';

import moment from 'moment';

const {
    CREATED,
    STARTED,
} = GameState;

describe('StaleGamesCleaner', () => {

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

        it(`should cancel a game in a '${CREATED}' state if ${PENDING_GAMES_TIMEOUT_HRS} hours have elapsed`, async () => {
            const newGame = await GameService.create(userA.id);

            await Game.update({
                createdAt: moment().subtract(PENDING_GAMES_TIMEOUT_HRS + 1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                state: CREATED,
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
