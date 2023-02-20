'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        const foreignKey = {
            type: Sequelize.INTEGER,
            onUpdate: 'cascade',
            onDelete: 'cascade',
        };

        const schema = {
            region_id: {
                ...foreignKey,
                references: {
                    model: 'regions',
                    key: 'id',
                },
                allowNull: false,
                primaryKey: true,
                autoIncrement: false,
            },
            player_id: {
                ...foreignKey,
                references: {
                    model: 'players',
                    key: 'id',
                },
                allowNull: false,
                primaryKey: true,
                autoIncrement: false,
            },
            tokens: {
                type: Sequelize.INTEGER,
            },
        };

        return queryInterface.createTable('player_region', schema, {
            uniqueKeys: {
                unique_conversation_id_user_id: {
                    fields: ['region_id', 'player_id']
                }
            }
        });
    },

    down: (queryInterface) => {
        return queryInterface.dropTable('player_region');
    }
};
