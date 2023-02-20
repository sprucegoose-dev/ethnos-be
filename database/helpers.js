
function generateCardTypes() {
    const cardTypes = [];
    const tribes = [
        'centaur',
        'dwarf',
        'elf',
        'giant',
        'halfling',
        'merfolk',
        'minotaur',
        'orc',
        'skeleton',
        'troll',
        'wingfolk',
        'wizard',
    ];
    const descriptions = [
        'centaur',
        'dwarf',
        'elf',
        'giant',
        'halfling',
        'merfolk',
        'minotaur',
        'orc',
        'skeleton',
        'troll',
        'wingfolk',
        'wizard',
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
                    color: colors[k],
                    description: descriptions[i],
                }));
            }
        }

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
