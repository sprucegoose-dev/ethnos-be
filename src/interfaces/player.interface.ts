export enum PlayerColor {
    BLACK = 'black',
    BLUE = 'blue',
    GREEN = 'green',
    PINK = 'pink',
    WHITE = 'white',
    YELLOW = 'yellow',
}

export const PLAYER_COLORS = [
    PlayerColor.BLACK,
    PlayerColor.BLUE,
    PlayerColor.GREEN,
    PlayerColor.PINK,
    PlayerColor.WHITE,
    PlayerColor.YELLOW,
];

export interface IAgePointsBreakdown {
    bands: number;
    giants: number;
    orcs: number;
    merfolk: number;
    regions: number;
}

export interface IPointsBreakdown {
    [age: string]: IAgePointsBreakdown;
}
