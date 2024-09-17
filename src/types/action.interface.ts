import { Color } from './game.interface';
import { AuthRequest } from './index.interface';

export enum ActionType {
    DRAW_CARD = 'draw_card',
    PICK_UP_CARD = 'pick_up_card',
    PLAY_BAND = 'play_band',
    KEEP_CARDS = 'keep_cards',
    ADD_TOKEN = 'add_token'
}

export interface IActionPayloadBase {
    cardIds?: number[];
    type: ActionType.DRAW_CARD |
        ActionType.KEEP_CARDS |
        ActionType.ADD_TOKEN;
}

export interface IPickUpCarddPayload {
    cardId: number;
    type: ActionType.PICK_UP_CARD;
}

export interface IPlayBandPayload {
    cardIds?: number[];
    type: ActionType.PLAY_BAND;
    leaderId: number;
    regionColor?: Color;
    cardIdsToKeep?: number[];
}

export type IActionPayload = IActionPayloadBase |
    IPlayBandPayload |
    IPickUpCarddPayload;

export interface INextActionPayload {
    type: ActionType;
}

export interface IActionRequest extends AuthRequest {
    body: IActionPayloadBase;
}
