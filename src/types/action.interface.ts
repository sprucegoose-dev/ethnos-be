import { AuthRequest } from './index.interface';

export enum ActionType {
    DRAW_CARD = 'draw_card',
    PICK_UP_CARD = 'pick_up_card',
    PLAY_BAND = 'play_band',
}

export interface IActionPayload {
    cardIds?: number[];
    type: ActionType;
}

export interface IActionRequest extends AuthRequest {
    body: IActionPayload;
}
