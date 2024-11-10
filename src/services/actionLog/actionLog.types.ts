import { PlayerColor } from '@interfaces/player.interface';
import { IActionPayload } from '../../interfaces/action.interface';

export interface IActionLogPayload {
    id: number,
    label: string,
    playerColor: PlayerColor,
}

export interface IActionLogParams {
    gameId: number;
    payload: IActionPayload;
    playerId: number;
    regionId?: number;
    snapshotId?: number
}

export enum LogType {
    ADD_FREE_TOKEN = 'add_free_token',
    DRAW_CARD = 'draw_card',
    KEEP_CARDS = 'keep_cards',
    PICK_UP_CARD = 'pick_up_card',
    PLAY_BAND = 'play_band',
    REVEAL_DRAGON = 'reveal_dragon'
}
