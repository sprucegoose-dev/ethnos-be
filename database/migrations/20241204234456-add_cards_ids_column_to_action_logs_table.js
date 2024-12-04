'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('action_logs', 'card_ids', {
            type: Sequelize.JSON,
            defaultValue: [],
            allowNull: true,
            after: 'card_id'
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn('action_logs', 'card_ids');
    }
};
