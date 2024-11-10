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
            type: {
                type: Sequelize.ENUM,
                values: [
                    'draw_card',
                    'pick_up_card',
                    'play_band',
                    'keep_cards',
                    'add_free_token',
                ],
            },
            game_id: {
                ...foreignKey,
                references: {
                    model: 'games',
                    key: 'id',
                },
            },
            player_id: {
                ...foreignKey,
                references: {
                    model: 'players',
                    key: 'id',
                },
            },
            region_id: {
                ...foreignKey,
                references: {
                    model: 'regions',
                    key: 'id',
                },
                allowNull: true,
            },
            leader_id: {
                ...foreignKey,
                references: {
                    model: 'cards',
                    key: 'id',
                },
                allowNull: true,
            },
        };

        return queryInterface.createTable('action_logs', schema);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('action_logs');
    }
};
