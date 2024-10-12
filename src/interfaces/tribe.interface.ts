export enum TribeName {
    CENTAURS = 'Centaurs',
    DWARVES = 'Dwarves',
    DRAGON = 'Dragon',
    ELVES = 'Elves',
    GIANTS = 'Giants',
    HALFLINGS = 'Halflings',
    MERFOLK = 'Merfolk',
    MINOTAURS = 'Minotaurs',
    ORCS = 'Orcs',
    SKELETONS = 'Skeletons',
    TROLLS = 'Trolls',
    WINGFOLK = 'Wingfolk',
    WIZARDS = 'Wizards',
}

export interface ITribe {
    id?: number;
    name: TribeName;
    description: string;
}
