
function generateTribeSeeds() {
    const tribes = [];
    const tribeNames = [
        'Centaurs',
        'Dwarves',
        'Elves',
        'Giants',
        'Halflings',
        'Merfolk',
        'Minotaurs',
        'Orcs',
        'Skeletons',
        'Trolls',
        'Wingfolk',
        'Wizards',
    ];
    const descriptions = [
        'If you place a marker on the board, you may play another band of allies immediately.',
        'The band counts as X+1 for end of the age scoring.',
        'You may keep up to X cards in your hand.',
        'If you play the biggest band with a Giant leader, take control of the Giant Token and score 2 glory.',
        "Don't place a marker on the board.",
        'Advance X spaces on the Merfolk track.',
        'This band counts as X+1 for placing a marker on the board.',
        'Place a marker on the matching space of the Orc Board.',
        "Can't be a leader. Can be used with any band of allies. Must be discarded before end of age scoring.",
        'Take an unclaimed Troll token with a value up to X',
        'You can place your marker on any kingdom of the board.',
        'Draw X cards from the deck',
    ];

    for (let i = 0; i < tribeNames.length; i++) {
        tribes.push({
            name: tribeNames[i],
            description: descriptions[i],
        });
    }

    tribes.push(({
        name: 'Dragon',
        description: '',
    }));

    return tribes;
}

module.exports = {
    generateTribeSeeds,
};
