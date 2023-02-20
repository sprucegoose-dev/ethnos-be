export enum Suit {
    FEATHER = 'feather',
    KEY = 'key',
    RING = 'ring',
    SKULL = 'skull',
}

export enum Color {
    RED = 'red',
    PURPLE = 'purple',
    GREEN = 'green',
    BLUE = 'blue',
}

export interface ICardType {
    id?: number;
    color: Color;
    suit: Suit;
    value: number;
}
