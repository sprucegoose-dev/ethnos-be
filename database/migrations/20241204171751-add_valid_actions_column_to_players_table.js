'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('players', 'valid_actions', {
            type: Sequelize.JSON,
            allowNull: true,
            defaultValue: [],
        });
    },

    down: (queryInterface) => {
        return queryInterface.removeColumn('players', 'valid_actions');
    }
};
