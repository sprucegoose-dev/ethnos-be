import { CardState } from '@interfaces/card.interface';
import { Color, IGameStateResponse } from '@interfaces/game.interface';

export const COMPRESSED_KEY_ACTIVE_PLAYER_ID = 'apid';
export const COMPRESSED_KEY_GAME = 'g';
export const COMPRESSED_KEY_LEADER_ID = 'lid';
export const COMPRESSED_KEY_PLAYER_ID = 'pid';
export const COMPRESSED_KEY_REGION_ID = 'rid';
export const COMPRESSED_KEY_PLAYERS = 'p';
export const COMPRESSED_KEY_CARDS = 'c';
export const COMPRESSED_KEY_PLAYER_REGIONS = 'pr';
export const COMPRESSED_KEY_AGE = 'a';
export const COMPRESSED_KEY_TOKENS = 't';

export const COMPRESSED_KEY_IN_BAND = 'b';
export const COMPRESSED_KEY_IN_DECK = 'd';
export const COMPRESSED_KEY_IN_HAND = 'h';
export const COMPRESSED_KEY_IN_MARKET = 'm';
export const COMPRESSED_KEY_REVEALED = 'r';
export const COMPRESSED_KEY_INDEX = 'i';
export const COMPRESSED_KEY_PLAYER_POINTS= 'pp';
export const COMPRESSED_KEY_GIANT_TOKEN_VALUE = 'gt';
export const COMPRESSED_KEY_MERFOLK_TRACK_SCORE = 'mt';
export const COMPRESSED_KEY_TROLL_TOKENS = 'tt';
export const COMPRESSED_KEY_ORC_TOKENS = 'ot';

export const COMPRESSED_KEY_BLUE = 'b';
export const COMPRESSED_KEY_GRAY = 'gy';
export const COMPRESSED_KEY_GREEN = 'gn';
export const COMPRESSED_KEY_ORANGE = 'o';
export const COMPRESSED_KEY_PURPLE= 'p';
export const COMPRESSED_KEY_RED = 'r';

export const COMPRESSED_CARD_STATE_KEYS = {
    [CardState.IN_BAND]: COMPRESSED_KEY_IN_BAND,
    [CardState.IN_DECK]: COMPRESSED_KEY_IN_DECK,
    [CardState.IN_HAND]: COMPRESSED_KEY_IN_HAND,
    [CardState.IN_MARKET]: COMPRESSED_KEY_IN_MARKET,
    [CardState.REVEALED]: COMPRESSED_KEY_REVEALED,
}

export const COMPRESSED_COLOR_KEYS = {
    [Color.BLUE]: COMPRESSED_KEY_BLUE,
    [Color.GRAY]: COMPRESSED_KEY_GRAY,
    [Color.GREEN]: COMPRESSED_KEY_GREEN,
    [Color.ORANGE]: COMPRESSED_KEY_ORANGE,
    [Color.PURPLE]: COMPRESSED_KEY_PURPLE,
    [Color.RED]: COMPRESSED_KEY_RED,
}

export const DECOMPRESSED_COLOR_KEYS: {[key: string]: Color} = {
    [COMPRESSED_KEY_BLUE]: Color.BLUE,
    [COMPRESSED_KEY_GRAY]: Color.GRAY,
    [COMPRESSED_KEY_GREEN]: Color.GREEN,
    [COMPRESSED_KEY_ORANGE]: Color.ORANGE,
    [COMPRESSED_KEY_PURPLE]: Color.PURPLE,
    [COMPRESSED_KEY_RED]: Color.RED,
};

export const SNAPSHOT_FETCH_LIMIT = 20;

export interface ICompressedCard {
    id: number;
    [COMPRESSED_KEY_INDEX]?: number;
    [COMPRESSED_KEY_LEADER_ID]?: number;
}

export interface ICompressedCards {
    [COMPRESSED_KEY_IN_BAND]?: ICompressedCard[];
    [COMPRESSED_KEY_IN_DECK]?: ICompressedCard[];
    [COMPRESSED_KEY_IN_HAND]?: ICompressedCard[];
    [COMPRESSED_KEY_IN_MARKET]?: ICompressedCard[];
    [COMPRESSED_KEY_REVEALED]?: ICompressedCard[];
}

export interface ICompressedColor {

}

export interface ICompressedGame {
    [COMPRESSED_KEY_AGE]: number;
    [COMPRESSED_KEY_ACTIVE_PLAYER_ID]: number;
}

export interface ICompressedPlayer {
    id: number;
    [COMPRESSED_KEY_PLAYER_POINTS]: number;
    [COMPRESSED_KEY_GIANT_TOKEN_VALUE]: number;
    [COMPRESSED_KEY_MERFOLK_TRACK_SCORE]: number;
    [COMPRESSED_KEY_TROLL_TOKENS]: number[];
    [COMPRESSED_KEY_ORC_TOKENS]: string[];
    [COMPRESSED_KEY_CARDS]: ICompressedCards,
}

export interface ICompressedPlayerRegion {
    [COMPRESSED_KEY_REGION_ID]: number;
    [COMPRESSED_KEY_PLAYER_ID]: number;
    [COMPRESSED_KEY_TOKENS]: number;
}

export interface ICompressedSnapshot {
    [COMPRESSED_KEY_GAME]: ICompressedGame;
    [COMPRESSED_KEY_PLAYERS]: ICompressedPlayer[];
    [COMPRESSED_KEY_CARDS]: ICompressedCards;
    [COMPRESSED_KEY_PLAYER_REGIONS]: ICompressedPlayerRegion[];
}

export interface IDecompressedGame {
    age: number;
    activePlayerId: number;
}

export interface IDecompressedCard {
    id: number;
    state: CardState;
    leaderId?: number | null;
    playerId?: number;
    index?: number;
}

export interface IDecompressedPlayer {
    id: number;
    points: number;
    giantTokenValue: number;
    merfolkTrackScore: number;
    trollTokens: number[];
    orcTokens: Color[];
    cards: IDecompressedCard[];
}

export interface IDecompressedPlayerRegion {
    regionId: number;
    playerId: number;
    tokens: number;
}

export interface IDecompressedSnapshot {
    game: IDecompressedGame;
    players: IDecompressedPlayer[];
    cards: IDecompressedCard[];
    playerRegions: IDecompressedPlayerRegion[];
}

export interface ISnapshotResponse extends IGameStateResponse {
    snapshotId: number;
}
