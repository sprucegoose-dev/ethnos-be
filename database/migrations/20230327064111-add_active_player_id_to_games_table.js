'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        const foreignKey = {
            type: Sequelize.INTEGER,
            onUpdate: 'cascade',
            onDelete: 'cascade',
        };

        const schema = {
            ...foreignKey,
            references: {
                model: 'players',
                key: 'id',
            },
            after: 'creator_id',
            allowNull: true,
        };

        return queryInterface.addColumn('games', 'active_player_id', schema);
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn('games', 'active_player_id');
    }
};
