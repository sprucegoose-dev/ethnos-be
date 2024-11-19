'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('users', 'deleted', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            after: 'session_exp'
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn('users', 'deleted');
    }
};
