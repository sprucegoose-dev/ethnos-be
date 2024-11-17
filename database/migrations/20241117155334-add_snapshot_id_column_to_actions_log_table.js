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
                model: 'snapshots',
                key: 'id',
            },
            allowNull: true,
        };

        return queryInterface.addColumn('action_logs', 'snapshot_id', schema);
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn('action_logs', 'snapshot_id');
    }
};
