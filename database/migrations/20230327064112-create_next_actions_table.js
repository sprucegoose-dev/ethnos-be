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
            state: {
                type: Sequelize.ENUM,
                values: [
                    'pending',
                    'resolved',
                ],
                defaultValue: 'pending',
            },
        };

        return queryInterface.createTable('next_actions', schema);
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('next_actions');
    }
};
