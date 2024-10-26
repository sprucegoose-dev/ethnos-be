'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.addConstraint('players', {
        fields: ['color', 'game_id'],
        type: 'unique',
        name: 'unique_color_game_id'
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.removeConstraint('players', 'unique_color_game_id');
  }
};
