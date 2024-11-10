'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {

        const schema = {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            type: {
                type: Sequelize.ENUM,
                values: [
                    'add_free_token',
                    'add_orc_token',
                    'advance_on_merfolk_board',
                    'draw_card',
                    'gain_giant_token',
                    'gain_troll_token',
                    'keep_cards',
                    'pick_up_card',
                    'play_band',
                    'reveal_dragon',
                    'wizard_draw_cards',
                ],
            },
        };

        return queryInterface.createTable('action_log_types', schema);
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('action_log_types');
    }
};
