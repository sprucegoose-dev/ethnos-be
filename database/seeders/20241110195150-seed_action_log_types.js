'use strict';


module.exports = {
    up: async (queryInterface) => {
        const actionLogTypes = [
            'add_free_token',
            'add_orc_token',
            'add_token',
            'advance_on_merfolk_board',
            'draw_card',
            'gain_giant_token',
            'gain_troll_token',
            'keep_cards',
            'pick_up_card',
            'play_band',
            'reveal_dragon',
            'wizard_draw_cards',
            'remove_orc_tokens'
        ].map(type => ({ type }));

        return queryInterface.bulkInsert('action_log_types', actionLogTypes);
    },
    down: (queryInterface) => {
        return queryInterface.bulkDelete('action_log_types');
    }
};
