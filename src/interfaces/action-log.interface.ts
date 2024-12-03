import { PlayerColor } from '@interfaces/player.interface';
import { IActionPayload } from '@interfaces/action.interface';

import Card from '@models/card.model';

export interface IActionLogPayload {
    card: Card;
    id: number,
    label: string,
    leaderId: number,
    playerColor: PlayerColor,
}

export interface IActionLogParams {
    gameId: number;
    payload?: IActionPayload;
    type?: LogType;
    playerId: number;
    regionId?: number;
    snapshotId?: number;
    emit?: boolean;
}

export enum LogType {
    ADD_TOKEN = 'add_token',
    ADD_FREE_TOKEN = 'add_free_token',
    ADD_ORC_TOKEN = 'add_orc_token',
    ADVANCE_ON_MERFOLK_BOARD = 'advance_on_merfolk_board',
    DRAW_CARD = 'draw_card',
    GAIN_GIANT_TOKEN = 'gain_giant_token',
    GAIN_TROLL_TOKEN = 'gain_troll_token',
    KEEP_CARDS = 'keep_cards',
    PICK_UP_CARD = 'pick_up_card',
    PLAY_BAND = 'play_band',
    REVEAL_DRAGON = 'reveal_dragon',
    WIZARD_DRAW_CARDS = 'wizard_draw_cards',
}
