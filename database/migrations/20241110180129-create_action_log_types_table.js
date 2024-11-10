'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {

        const schema = {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            action_type: {
                type: Sequelize.ENUM,
                values: [
                    'add_free_token',
                    'draw_card',
                    'keep_cards',
                    'pick_up_card',
                    'play_band',
                    'reveal_dragon'
                ],
            },
        };

        return queryInterface.createTable('action_log_types', schema);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('action_log_types');
    }
};
