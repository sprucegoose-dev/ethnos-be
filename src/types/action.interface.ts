import { Color } from './game.interface';
import { AuthRequest } from './index.interface';

export enum ActionType {
    DRAW_CARD = 'draw_card',
    PICK_UP_CARD = 'pick_up_card',
    PLAY_BAND = 'play_band',
    KEEP_CARDS = 'keep_cards',
    ADD_TOKEN = 'add_token'
}

export interface IActionPayload {
    cardIds?: number[];
    type: ActionType;
}

export interface IPlayBandPayload extends IActionPayload {
    leaderId: number;
    regionColor?: Color;
}

export interface IActionRequest extends AuthRequest {
    body: IActionPayload;
}
