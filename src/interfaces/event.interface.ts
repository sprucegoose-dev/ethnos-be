import { IActionLogPayload } from './action-log.interface';
import { IChatMessagePayload } from './chat.interface';
import { IGameState } from './game.interface';

export const EVENT_GAME_UPDATE = 'onUpdateGameState';
export const EVENT_ACTIVE_GAMES_UPDATE = 'onUpdateActiveGames';
export const EVENT_JOIN_GAME = 'onJoinGame';
export const EVENT_LEAVE_GAME = 'onLeaveGame';
export const EVENT_CHAT_UPDATE = 'onUpdateChat';
export const EVENT_UNDO_REQUEST = 'onRequestUndo';
export const EVENT_ACTIONS_LOG_UPDATE = 'onUpdateActionsLog';

export interface IActiveGamesUpdateEvent {
    type: typeof EVENT_ACTIVE_GAMES_UPDATE;
    payload: Omit<IGameState, 'cards'>[];
}

export interface IChatUpdateEvent {
    type: typeof EVENT_CHAT_UPDATE;
    gameId: number;
    payload: IChatMessagePayload[];
}

export interface IGameUpdateEvent {
    type: typeof EVENT_GAME_UPDATE;
    payload: IGameState;
}

export interface IUndoRequestEvent {
    type: typeof EVENT_UNDO_REQUEST;
    gameId: number;
}

export interface IEventActionsLogUpdate {
    type: typeof EVENT_ACTIONS_LOG_UPDATE;
    gameId: number;
    payload: IActionLogPayload[];
}

export type IEventType =
    IActiveGamesUpdateEvent |
    IChatUpdateEvent |
    IGameUpdateEvent |
    IEventActionsLogUpdate |
    IUndoRequestEvent;
