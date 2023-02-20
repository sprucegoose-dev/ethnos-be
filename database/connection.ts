import { Dialect } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Card } from '../src/models/card.model';
import { CardType } from '../src/models/card_type.model';
import { Game } from '../src/models/game.model';
import { Player } from '../src/models/player.model';
import { User } from '../src/models/user.model';

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
    logging: NODE_ENV === 'development' ? console.log : false,
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
        CardType,
        Card,
    ],
};

const sequelize = NODE_ENV === 'test' ?
    new Sequelize('sqlite::memory:', {
        logging: false,
        models: [
            User,
            Player,
            Game,
            CardType,
            Card,
        ],
    }) :
    new Sequelize(DB_NAME, DB_USER, DB_PASS, options);

export default sequelize;

