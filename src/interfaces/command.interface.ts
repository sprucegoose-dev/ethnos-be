import Card from '@models/card.model';
import Game from '@models/game.model';
import Player from '@models/player.model';

import { Color } from './game.interface';

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
    cardIdsToKeep: number[];
    band: IBandDetails;
}
