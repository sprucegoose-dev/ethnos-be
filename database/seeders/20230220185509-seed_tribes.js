'use strict';

const { generateTribeSeeds } = require('../helpers');

module.exports = {
    up: (queryInterface) => {
        return queryInterface.bulkInsert('tribes', generateTribeSeeds());
    },
    down: (queryInterface) => {
        return queryInterface.delete('tribes', null, {});
    }
};
