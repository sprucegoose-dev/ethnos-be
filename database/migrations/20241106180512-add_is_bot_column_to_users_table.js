'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('users', 'is_bot', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            after: 'session_exp'
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn('users', 'is_bot');
    }
};
