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
                allowNull: true,
            },
            color: {
                type: Sequelize.ENUM,
                values: [
                    'red',
                    'green',
                    'purple',
                    'blue',
                    'gray',
                    'orange'
                ],
            },
            values: {
                type: Sequelize.JSON,
            },
        };

        return queryInterface.createTable('regions', schema);
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('regions');
    }
};
