import { DataTypes } from 'sequelize';
import sequelize from './database/connection';

const glob = require('glob');
const path = require('path');

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

jest.mock('./src/services/event.service.ts', () => {
    return {
        emitEvent: jest.fn(),
    }
});
