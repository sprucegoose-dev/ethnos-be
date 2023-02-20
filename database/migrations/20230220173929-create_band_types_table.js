'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        const schema = {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            player_id: {
                ...foreignKey,
                references: {
                    model: 'players',
                    key: 'id',
                },
                allowNull: true,
            },
        };

        return queryInterface.createTable('card_types', schema);
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('card_types');
    }
};
