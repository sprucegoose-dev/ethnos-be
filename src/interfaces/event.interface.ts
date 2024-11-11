import Card from '@models/card.model';
import { IGameState } from './game.interface';

export const EVENT_GAME_UPDATE = 'onUpdateGameState';
export const EVENT_GAME_UPDATE_PRIVATE = 'onUpdateGameStatePrivate';
export const EVENT_ACTIVE_GAMES_UPDATE = 'onUpdateActiveGames';
export const EVENT_JOIN_GAME = 'onJoinGame';
export const EVENT_JOIN_GAME_PRIVATE = 'onJoinGamePrivate';
export const EVENT_LEAVE_GAME = 'onLeaveGame';

export interface IGameUpdateEvent {
    type: typeof EVENT_GAME_UPDATE;
    payload: IGameState;
}

export interface IGameUpdatePrivateEvent {
    type: typeof EVENT_GAME_UPDATE_PRIVATE;
    payload: {
        id: number;
        userId: number;
        cardsInHand: Card[];
    }
}

export interface IActiveGamesUpdateEvent {
    type: typeof EVENT_ACTIVE_GAMES_UPDATE;
    payload: Omit<IGameState, 'cards'>[]
}

export type IEventType =
    IGameUpdateEvent |
    IGameUpdatePrivateEvent |
    IActiveGamesUpdateEvent;
