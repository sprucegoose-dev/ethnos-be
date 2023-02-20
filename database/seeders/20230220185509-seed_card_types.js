'use strict';

const { generateCardTypes } = require('../helpers');

module.exports = {
    up: (queryInterface) => {
        return queryInterface.bulkInsert('card_types', generateCardTypes());
    },
    down: (queryInterface) => {
        return queryInterface.delete('card_types', null, {});
    }
};

module.exports = {
    up: (queryInterface) => {
        return queryInterface.bulkInsert('card_types', generateCardTypes());
    },
    down: (queryInterface) => {
        return queryInterface.bulkDelete('card_types', null, {});
    }
};
