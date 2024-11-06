'use strict';

const { generateBotSeeds } = require('../helpers');

module.exports = {
    up: async (queryInterface) => {
        const seed = await generateBotSeeds();
        return queryInterface.bulkInsert('users', await generateBotSeeds());
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.bulkDelete('users', {
            username: {
                [Sequelize.Op.in]: [
                    'Bismo',
                    'Violet',
                    'MacGruber',
                    'LittleHeart',
                    'SirMud'
                ]}
            },
        {});
    }
};
