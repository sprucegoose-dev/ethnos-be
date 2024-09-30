import { DataTypes } from 'sequelize';
import sequelize from './database/connection';
import { IUserResponse } from './src/interfaces/user.interface';
import UserService from './src/services/user/user.service';

const glob = require('glob');
const path = require('path');

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
const userDataD = {
    username: 'Bismo',
    email: 'bismo.skint@gmail.com',
    password: 'sling3021',
};

let userA: IUserResponse;
let userB: IUserResponse;
let userC: IUserResponse;
let userD: IUserResponse;

const UNEXPECTED_ERROR_MSG = 'Expected this error not to be thrown';

beforeAll(async () => {
    const migrations = glob.sync('database/migrations/*.js');
    const seeders = glob.sync('database/seeders/*.js');

    for (const migration of migrations) {
        const { up } = require(path.resolve(migration));
        await up(sequelize.getQueryInterface(), DataTypes);
    }

    for (const seeder of seeders) {
        const { up } = require(path.resolve(seeder));
        await up(sequelize.getQueryInterface());
    }
});

beforeAll(async () => {
    userA = await UserService.create(userDataA);
    userB = await UserService.create(userDataB);
    userC = await UserService.create(userDataC);
    userD = await UserService.create(userDataD);
});

jest.mock('./src/services/event/event.service.ts', () => {
    return {
        emitEvent: jest.fn(),
    }
});

export { UNEXPECTED_ERROR_MSG, userA, userB, userC, userD };
