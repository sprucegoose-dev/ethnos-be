'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('action_logs', 'value', {
            type: Sequelize.INTEGER,
            defaultValue: null,
            allowNull: true,
            after: 'leader_id'
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn('action_logs', 'value');
    }
};
