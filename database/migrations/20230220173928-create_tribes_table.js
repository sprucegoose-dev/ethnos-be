'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        const schema = {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: Sequelize.STRING,
            description: Sequelize.STRING,
        };

        return queryInterface.createTable('tribes', schema);
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('tribes');
    }
};
