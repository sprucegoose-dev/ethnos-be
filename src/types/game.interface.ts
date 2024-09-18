import { Card } from '../models/card.model';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { TribeName } from './tribe.interface';

export const TRIBES = [
    TribeName.CENTAUR,
    TribeName.DWARF,
    TribeName.ELF,
    TribeName.GIANT,
    TribeName.HALFLING,
    TribeName.MERFOLK,
    TribeName.MINOTAUR,
    TribeName.ORC,
    TribeName.SKELETON,
    TribeName.TROLL,
    TribeName.WINGFOLK,
    TribeName.WIZARD,
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
