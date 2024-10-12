import Card from '@models/card.model';
import Game from '@models/game.model';
import Player from '@models/player.model';

import { TribeName } from './tribe.interface';

export const TRIBES = [
    TribeName.CENTAURS,
    TribeName.DWARVES,
    TribeName.ELVES,
    TribeName.GIANTS,
    TribeName.HALFLINGS,
    TribeName.MERFOLK,
    TribeName.MINOTAURS,
    TribeName.ORCS,
    TribeName.SKELETONS,
    TribeName.TROLLS,
    TribeName.WINGFOLK,
    TribeName.WIZARDS,
];

export enum Color {
    BLUE = 'blue',
    GRAY = 'gray',
    GREEN = 'green',
    ORANGE = 'orange',
    PURPLE = 'purple',
    RED = 'red',
}

export enum GameState {
    CANCELLED = 'cancelled',
    CREATED = 'created',
    ENDED = 'ended',
    STARTED = 'started',
}

export interface IGameState extends Game {
    cards: Card[];
    hasPassword?: number;
    players: Player[];
}

export interface IGameSettings {
   tribes: TribeName[];
}

export interface ITribeCard {
    color: Color;
    name: TribeName;
    tribeId: number;
}

export interface ICreateGamePayload {
    password?: string;
}
