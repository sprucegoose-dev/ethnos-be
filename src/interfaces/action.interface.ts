import { Color } from './game.interface';
import { AuthRequest } from './index.interface';
import { TribeName } from './tribe.interface';

export enum ActionType {
    DRAW_CARD = 'draw_card',
    PICK_UP_CARD = 'pick_up_card',
    PLAY_BAND = 'play_band',
    KEEP_CARDS = 'keep_cards',
    ADD_FREE_TOKEN = 'add_free_token',
    REMOVE_ORC_TOKENS = 'remove_orc_tokens'
}

export interface IDrawCardPayload {
    type: ActionType.DRAW_CARD;
}

export interface IPickUpCardPayload {
    cardId: number;
    type: ActionType.PICK_UP_CARD;
}

export interface IAddFreeTokenPayload {
    nextActionId: number;
    regionColor: Color;
    type: ActionType.ADD_FREE_TOKEN;
}

export interface IKeepCardsPayload {
    nextActionId: number;
    cardIds: number[];
    type: ActionType.KEEP_CARDS;
    value?: number;
}

export interface IPlayBandPayload {
    nextActionId?: number;
    cardIds?: number[];
    leaderId: number;
    regionColor?: Color;
    type: ActionType.PLAY_BAND;
}

export interface IRemoveOrcTokensPayload {
    tokens: Color[];
    type: ActionType.REMOVE_ORC_TOKENS;
}

export type IActionPayload =
    IDrawCardPayload |
    IPlayBandPayload |
    IPickUpCardPayload |
    IAddFreeTokenPayload |
    IKeepCardsPayload |
    IRemoveOrcTokensPayload;

export interface INextActionPayload {
    type: ActionType;
}

export interface IActionRequest extends AuthRequest {
    body: IActionPayload;
}

export interface IBandDetails {
    bandSize: number;
    color: Color;
    points: number;
    tribe: TribeName;
}
