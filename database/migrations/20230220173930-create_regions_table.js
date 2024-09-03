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
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
        };

        return queryInterface.createTable('regions', schema);
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('regions');
    }
};
