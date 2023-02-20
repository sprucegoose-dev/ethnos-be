export enum PlayerOrientation {
    DEFAULT = 'default',
    INVERSE = 'inverse',
}

export interface IPlayer {
    id: number;
    userId: number;
    gameId: number;
    position: number;
    points: number;
    orientation: PlayerOrientation;
}
