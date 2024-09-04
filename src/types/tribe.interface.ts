export enum TribeName {
    CENTAUR = 'Centaur',
    DWARF = 'Dwarf',
    DRAGON = 'Dragon',
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

export interface ITribe {
    id?: number;
    name: TribeName;
    description: string;
}
