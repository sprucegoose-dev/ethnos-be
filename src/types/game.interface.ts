import { Card } from '../models/card.model';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { Tribe } from './card_type.interface';

export enum GameState {
    CANCELLED = 'cancelled',
    CREATED = 'created',
    ENDED = 'ended',
    SETUP = 'setup',
    STARTED = 'started',
}

export interface IGameState extends Game {
    cards: Card[];
    players: Player[];
}

export interface ICombatData {
    game: Game;
    player: Player;
    opponent: Player;
    playerCards: Card[];
    opponentCards: Card[];
}

export interface IGameSettings {
   tribes: Tribe[];
}
