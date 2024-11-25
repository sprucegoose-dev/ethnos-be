import { IGameSettings } from "./game.interface";
import { PlayerColor } from "./player.interface";

export interface IUserRequest {
    email: string;
    password: string;
    username: string;
}

export interface IUserResponse {
    id: number;
    username: string;
    sessionId: string;
    sessionExp: string;
}

export interface IMatchUser {
    id: number;
    delete: boolean;
    isBot: boolean;
    username: string;
}

export interface IMatchPlayer {
    id: number;
    color: PlayerColor;
    gameId: number;
    user: IMatchUser;
}

export interface IMatch {
    createdAt: string;
    creatorId: number;
    id: number;
    players: IMatchPlayer[];
    settings: IGameSettings;
    winnerId: number;
}

export interface IMatchesResponse {
    data: IMatch[];
    pages: number;
}

export const PASSWORD_MIN_CHARS = 8;
export const USERNAME_MIN_CHARS = 3;
export const USERNAME_MAX_CHARS = 15;
