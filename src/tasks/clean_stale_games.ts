import { Game } from '../models/game.model';
import { Op } from 'sequelize';
import { GameState } from '../types/game.interface';

const moment = require('moment');

export const PENDING_GAMES_TIMEOUT_HRS = 5;
export const IN_PROGRESS_GAMES_TIMEOUT_HRS = 24;

class StaleGamesCleaner {

    static async cleanUp() {
        const pendingStaleDate = moment().subtract(PENDING_GAMES_TIMEOUT_HRS, 'hours').toDate();
        const inProgressStaleDate = moment().subtract(IN_PROGRESS_GAMES_TIMEOUT_HRS, 'hours').toDate();

        await Game.update({
            state: GameState.CANCELLED,
        },
        {
            where: {
                state: {
                    [Op.notIn]: [
                        GameState.CANCELLED,
                        GameState.ENDED,
                        GameState.STARTED,
                    ],
                },
                createdAt: {
                    [Op.lte]: pendingStaleDate,
                }
            }
        });

        await Game.update({
            state: GameState.CANCELLED,
        },
        {
            where: {
                state: GameState.STARTED,
                updatedAt: {
                    [Op.lte]: inProgressStaleDate,
                }
            }
        });
    }
};

export default StaleGamesCleaner;




