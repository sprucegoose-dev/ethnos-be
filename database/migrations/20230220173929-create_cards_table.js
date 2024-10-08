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
                    'revealed',
                ],
            },
            color: {
                type: Sequelize.ENUM,
                values: [
                    'blue',
                    'gray',
                    'green',
                    'orange',
                    'purple',
                    'red'
                ],
                allowNull: true,
            },
            tribe_id: {
                ...foreignKey,
                references: {
                    model: 'tribes',
                    key: 'id',
                },
            },
            leader_id: {
                ...foreignKey,
                ...{
                    references: {
                        model: 'cards',
                        key: 'id',
                    }
                },
                allowNull: true,
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
                allowNull: true,
            },
            index: {
                type: Sequelize.INTEGER,
                defaultValue: null,
                allowNull: true,
            },
        };

        return queryInterface.createTable('cards', schema);
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('cards');
    }
};
