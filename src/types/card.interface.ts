export interface ICard {
    gameId?: number;
    index?: number;
    playerId?: number;
    cardTypeId: number;
}

export interface ICardFilters {
    continuum?: boolean;
    playerIds?: number[];
}
