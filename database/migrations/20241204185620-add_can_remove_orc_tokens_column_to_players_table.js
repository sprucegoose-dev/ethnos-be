'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('players', 'can_remove_orc_tokens', {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            after: 'orc_tokens'
        });
    },

    down: (queryInterface) => {
        return queryInterface.removeColumn('players', 'can_remove_orc_tokens');
    }
};
