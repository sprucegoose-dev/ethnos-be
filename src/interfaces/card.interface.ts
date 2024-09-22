import Card from '../models/card.model';

export enum CardState {
    IN_MARKET = 'in_market',
    IN_DECK = 'in_deck',
    IN_HAND = 'in_hand',
    IN_BAND = 'in_band',
    REVEALED = 'revealed',
}

export interface ICardFilters {
    playerIds?: number[];
}

export interface IGroupedCards {
    [leaderId: string]: Card[];
}
