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
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                ...foreignKey,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            game_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                ...foreignKey,
                references: {
                    model: 'games',
                    key: 'id',
                },
            },
            giant_token_value: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            orc_tokens: {
                type: Sequelize.JSON,
                defaultValue: []
            },
            troll_tokens: {
                type: Sequelize.JSON,
                defaultValue: []
            },
            merfolk_track_score: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            points: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
        };

        return queryInterface.createTable('players', schema, {
            uniqueKeys: {
                unique_game_id_user_id: {
                    fields: ['game_id', 'user_id']
                }
            }
        });
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('players');
    }
};
