import Card from '@models/card.model';
import Game from '@models/game.model';
import Player from '@models/player.model';

import { Color } from './game.interface';
import { IPlayBandPayload } from './action.interface';

export interface IBandDetails {
    tribe: string;
    bandSize: number;
    color: Color;
}

export interface IHandleTribeOptions {
    band: IBandDetails;
    game: Game;
    player: Player;
}

export interface IRemainingCardsOptions {
    remainingCards: Card[];
    tokenAdded: boolean;
    player: Player;
    playBandAction: IPlayBandPayload;
    band: IBandDetails;
}

export interface IScoringResults {
    totalPoints: {[playerId: number]: number};
    trollTokenTotals: {[playerId: number]: number};
}
