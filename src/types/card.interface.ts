export enum CardState {
    IN_MARKET = 'in_market',
    IN_DECK = 'in_deck',
    IN_HAND = 'in_hand',
    IN_BAND = 'in_band',
}

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
