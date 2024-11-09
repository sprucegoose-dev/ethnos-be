import { Dialect } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

import Card from '@models/card.model';
import Tribe from '@models/tribe.model';
import Game from '@models/game.model';
import Player from '@models/player.model';
import Region from '@models/region.model';
import User from '@models/user.model';
import PlayerRegion from '@models/player_region.model';
import NextAction from '@models/nextAction.model';

interface IDatabaseEnvVars {
    NODE_ENV: string;
    DB_NAME: string;
    DB_USER: string;
    DB_PASS: string;
    DB_HOST: string;
}

const {
    NODE_ENV,
    DB_NAME,
    DB_USER,
    DB_PASS,
    DB_HOST
} = process.env as unknown as IDatabaseEnvVars;

const options = {
    host: DB_HOST,
    dialect: 'mysql' as Dialect,
    // logging: NODE_ENV === 'development' ? console.log : false,
    logging: false,
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    },
    define: {
        charset: 'utf8',
        collate: 'utf8_general_ci',
    },
    models: [
        User,
        Player,
        Game,
        Tribe,
        Card,
        Region,
        PlayerRegion,
        NextAction,
    ],
};

const sequelize = NODE_ENV === 'test' ?
    new Sequelize('sqlite::memory:', {
        logging: false,
        models: [
            User,
            Player,
            Game,
            Tribe,
            Card,
            Region,
            PlayerRegion,
            NextAction,
        ],
    }) :
    new Sequelize(DB_NAME, DB_USER, DB_PASS, options);

export default sequelize;

