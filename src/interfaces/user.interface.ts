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

export const PASSWORD_MIN_CHARS = 8;
export const USERNAME_MIN_CHARS = 3;
export const USERNAME_MAX_CHARS = 15;
