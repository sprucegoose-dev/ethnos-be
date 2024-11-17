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
            snapshot: Sequelize.JSON,
            age: {
                type: Sequelize.INTEGER,
                defaultValue: 1,
            },
            reset_point: Sequelize.BOOLEAN,
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
        };

        return queryInterface.createTable('snapshots', schema);
    },

    down: (queryInterface) => {
        return queryInterface.dropTable('snapshots');
    }
};
