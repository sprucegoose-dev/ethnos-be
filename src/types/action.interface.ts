import { Color } from './game.interface';
import { AuthRequest } from './index.interface';
import { TribeName } from './tribe.interface';

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

export interface IPickUpCardPayload {
    cardId: number;
    type: ActionType.PICK_UP_CARD;
}

export interface IPlayBandPayload {
    cardIds?: number[];
    cardIdsToKeep?: number[];
    leaderId: number;
    regionColor?: Color;
    type: ActionType.PLAY_BAND;
}

export type IActionPayload = IActionPayloadBase |
    IPlayBandPayload |
    IPickUpCardPayload;

export interface INextActionPayload {
    type: ActionType;
}

export interface IActionRequest extends AuthRequest {
    body: IActionPayloadBase;
}

export interface IBandDetails {
    color: Color;
    tribe: TribeName;
    bandSize: number;
}
