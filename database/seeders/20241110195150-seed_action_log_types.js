'use strict';


module.exports = {
    up: async (queryInterface) => {
        const actionLogTypes = [
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
        ].map(type => ({ type }));

        return queryInterface.bulkInsert('action_log_types', actionLogTypes);
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.bulkDelete('action_log_types');
    }
};