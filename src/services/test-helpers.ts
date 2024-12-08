import { Op } from 'sequelize';

import Card from '@models/card.model';

import { CardState } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { IGameSettings, IGameState } from '@interfaces/game.interface';

import GameService from '@services/game/game.service';
import PlayerService from '@services/player/player.service';
import {
    userA,
    userB,
    userC,
    userD,
} from '@jest.setup';
import Player from '../models/player.model';

const defaultSettings = {
    tribes: [
        TribeName.DWARVES,
        TribeName.MINOTAURS,
        TribeName.MERFOLK,
        TribeName.CENTAURS,
        TribeName.ELVES,
        TribeName.WIZARDS,
    ]
};

export interface ICreateGameResult {
    gameId: number;
    gameState: IGameState;
    playerA: Player;
    playerB: Player;
    playerC: Player;
    playerD: Player;
}

export async function createGame(settings: IGameSettings = defaultSettings): Promise<ICreateGameResult> {
    const game = await GameService.create(userA.id, false);
    const playerA = await PlayerService.create(userA.id, game.id);
    const playerB = await PlayerService.create(userB.id, game.id);
    const playerC = await PlayerService.create(userC.id, game.id);
    const playerD = await PlayerService.create(userD.id, game.id);

    await GameService.start(userA.id, game.id, settings);

    const gameState = await GameService.getState(game.id);

    return {
        gameId: game.id,
        gameState,
        playerA,
        playerB,
        playerC,
        playerD
    }
}

export function getCardsFromDeck(cards: Card[], quantity: number): number[] {
    return cards.filter(card =>
            card.state === CardState.IN_DECK &&
            card.tribe.name !== TribeName.DRAGON
        )
        .sort((cardA, cardB) => cardA.index - cardB.index)
        .slice(0, quantity)
        .map(card => card.id);
}

export async function assignCardsToPlayer(playerId: number, cardIdsToAssign: number[]) {
    await Card.update({
        playerId,
        state: CardState.IN_HAND,
    }, {
        where: {
            id: {
                [Op.in]: cardIdsToAssign
            }
        },
    });
}

export async function returnPlayerCardsToDeck(playerId: number) {
    await Card.update({
        playerId: null,
        state: CardState.IN_DECK
    }, {
        where: {
            playerId,
        }
    });
}
