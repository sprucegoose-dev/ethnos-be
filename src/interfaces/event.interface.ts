import { IChatMessagePayload } from './chat.interface';
import { IGameState } from './game.interface';

export const EVENT_GAME_UPDATE = 'onUpdateGameState';
export const EVENT_ACTIVE_GAMES_UPDATE = 'onUpdateActiveGames';
export const EVENT_JOIN_GAME = 'onJoinGame';
export const EVENT_LEAVE_GAME = 'onLeaveGame';
export const EVENT_CHAT_UPDATE = 'onUpdateChat';

export interface IActiveGamesUpdateEvent {
    type: typeof EVENT_ACTIVE_GAMES_UPDATE;
    payload: Omit<IGameState, 'cards'>[]
}

export interface IChatUpdateEvent {
    type: typeof EVENT_CHAT_UPDATE;
    channelId: number;
    payload: IChatMessagePayload[];
}

export interface IGameUpdateEvent {
    type: typeof EVENT_GAME_UPDATE;
    payload: IGameState;
}

export type IEventType =
    IActiveGamesUpdateEvent |
    IChatUpdateEvent |
    IGameUpdateEvent;
