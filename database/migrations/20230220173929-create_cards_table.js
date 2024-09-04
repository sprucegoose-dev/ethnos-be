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
            state: {
                type: Sequelize.ENUM,
                values: [
                    'in_market',
                    'in_deck',
                    'in_hand',
                    'in_band',
                ],
            },
            color: {
                type:  Sequelize.STRING,
                allowNull: true,
            },
            tribe_id: {
                ...foreignKey,
                references: {
                    model: 'tribes',
                    key: 'id',
                },
            },
            band_id: {
                ...foreignKey,
                references: {
                    model: 'bands',
                    key: 'id',
                },
                allowNull: true,
            },
            game_id: {
                ...foreignKey,
                references: {
                    model: 'games',
                    key: 'id',
                },
                allowNull: true,
            },
            player_id: {
                ...foreignKey,
                references: {
                    model: 'players',
                    key: 'id',
                },
                allowNull: true,
            },
            index: {
                type: Sequelize.INTEGER,
                defaultValue: null,
                allowNull: true,
            },
            is_leader: {
                type: Sequelize.BOOLEAN,
                defaultValue: null,
                allowNull: true,
            },
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
        };

        return queryInterface.createTable('cards', schema);
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('cards');
    }
};
