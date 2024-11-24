'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('players', 'points_breakdown', {
            type: Sequelize.JSON,
            defaultValue: {},
            allowNull: false,
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn('players', 'points_breakdown');
    }
};
