'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {

        const schema = {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            username: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            session_id: {
                type: Sequelize.UUID,
                unique: true,
            },
            session_exp: Sequelize.STRING,
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
        };

        return queryInterface.createTable('users', schema);
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('users');
    }
};
