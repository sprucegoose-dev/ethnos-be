import { Color } from './game.interface';

export enum CardState {
    IN_MARKET = 'in_market',
    IN_DECK = 'in_deck',
    IN_HAND = 'in_hand',
    IN_BAND = 'in_band',
    REVEALED = 'revealed',
}

export interface ICard {
    bandId?: number;
    color: Color;
    index?: number;
    gameId?: number;
    playerId?: number;
    state: CardState;
    tribeId: number;
}

export interface ICardFilters {
    playerIds?: number[];
}
