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
            player_id: {
                ...foreignKey,
                ...{
                    references: {
                        model: 'players',
                        key: 'id',
                    }
                },
                ...{
                    allowNull: false,
                }
            },
            snapshot_id: {
                ...foreignKey,
                onDelete: 'SET NULL',
                ...{
                    references: {
                        model: 'snapshots',
                        key: 'id',
                    }
                },
                ...{
                    allowNull: true,
                }
            },
            state: {
                type: Sequelize.ENUM,
                values: [
                    'pending',
                    'approved',
                    'rejected'
                ],
            },
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
        };

        return queryInterface.createTable('undo_requests', schema);
    },

    down: (queryInterface) => {
        return queryInterface.dropTable('undo_requests');
    }
};
