
function generateCardTypes() {
    const cardTypes = [];
    const tribes = [
        'Centaur',
        'Dwarf',
        'Elf',
        'Giant',
        'Halfling',
        'Halfling',
        'Merfolk',
        'Minotaur',
        'Orc',
        'Skeleton',
        'Troll',
        'Wingfolk',
        'Wizard',
    ];
    const descriptions = [
        'If you place a marker on the board, you may play another band of allies immediately.',
        'The band counts as X+1 for end of the age scoring.',
        'You may keep up to X cards in your hand.',
        'If you play the biggest band with a Giant leader, take control of the Giant Token and score 2 glory.',
        "Don't place a marker on the board.",
        "Don't place a marker on the board.",
        'Advance X spaces on the Merfolk track.',
        'This band counts as X+1 for placing a marker on the board.',
        'Place a marker on the matching space of the Orc Board.',
        "Can't be a leader. Can be used with any band of allies. Must be discarded before end of age scoring.",
        'Take an unclaimed Troll token with a value up to X',
        'You can place your marker on any kingdom of the board.',
        'Draw X cards from the deck',
    ];
    const colors = [
        'blue',
        'gray',
        'green',
        'orange',
        'purple',
        'red',
    ];

    let startingNumber = 1;
    let value;

    for (let i = 0; i < tribes.length; i++) {
        for (let j = 0; j < 2; j++) {
            for (let k = 0; k < colors.length; k++) {
                cardTypes.push(generateCardType({
                    tribe: tribes[i],
                    color: tribes[i] == 'Skeleton' ? null : colors[k],
                    description: descriptions[i],
                }));
            }
        }
    }

    for (let i = 0; i < 3; i++) {
        cardTypes.push(generateCardType({
            tribe: 'Dragon',
            color: null,
            description: '',
        }));
    }

    return cardTypes.sort((a, b) => a.value - b.value);
}

function generateCardType({
    tribe,
    color,
    description,
}) {
    return {
        tribe,
        color,
        description,
    };
}

module.exports = {
    generateCardTypes,
};
