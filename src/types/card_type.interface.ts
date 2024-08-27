export enum Tribe {
    CENTAUR = 'Centaur',
    DWARF = 'Dwarf',
    ELF = 'Elf',
    GIANT = 'Giant',
    HALFING = 'Halfing',
    MERFOLK = 'Merfolk',
    MINOTAUR = 'Minotaur',
    ORC = 'Orc',
    SKELETON = 'Skeleton',
    TROLL = 'Troll',
    WINGFOLK = 'Wingfolk',
    WIZARD = 'Wizard',
}

export enum Color {
    BLUE = 'blue',
    GRAY = 'gray',
    GREEN = 'green',
    ORANGE = 'orange',
    PURPLE = 'purple',
    RED = 'red',
}

export interface ICardType {
    id?: number;
    color: Color;
    value: number;
}
