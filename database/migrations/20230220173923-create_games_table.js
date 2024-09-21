'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        const foreignKey = {
            type: Sequelize.INTEGER,
            onUpdate: 'cascade',
            onDelete: 'cascade',
            allowNull: false,
        };

        const schema = {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            creator_id: {
                type: Sequelize.INTEGER,
                ...foreignKey,
                references: {
                    model: 'users',
                    key: 'id',
                },
                allowNull: false,
            },
            winner_id: {
                type: Sequelize.INTEGER,
                ...foreignKey,
                references: {
                    model: 'users',
                    key: 'id',
                },
                allowNull: true,
            },
            state: {
                type: Sequelize.ENUM,
                values: [
                    'cancelled',
                    'created',
                    'ended',
                    'started',
                ],
            },
            max_players: {
                type: Sequelize.INTEGER,
                defaultValue: 6,
            },
            password: {
                type: Sequelize.STRING,
            },
            age: {
                type: Sequelize.INTEGER,
                defaultValue: 1,
            },
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
        };

        return queryInterface.createTable('games', schema);
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('games');
    }
};
