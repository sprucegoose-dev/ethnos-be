'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        const foreignKey = {
            type: Sequelize.INTEGER,
            onUpdate: 'cascade',
            onDelete: 'cascade',
        };

        const schema = {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            game_id: {
                ...foreignKey,
                references: {
                    model: 'games',
                    key: 'id',
                },
                allowNull: false,
            },
            user_id: {
                ...foreignKey,
                references: {
                    model: 'users',
                    key: 'id',
                },
                allowNull: false,
            },
            message: {
                type: Sequelize.STRING(1000),
                collate: 'utf8_general_ci',
            },
            filtered_message: {
                type: Sequelize.STRING(1000),
                collate: 'utf8_general_ci'
            },
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
        };

        return queryInterface.createTable('chat_messages', schema);
    },

    down: (queryInterface) => {
        return queryInterface.dropTable('chat_messages');
    }
};
