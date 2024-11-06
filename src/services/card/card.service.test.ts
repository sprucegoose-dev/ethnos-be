import Game from '@models/game.model';
import Player from '@models/player.model';

import {
    createGame,
} from '../test-helpers';

import CardService from './card.service';

describe('CardService', () => {
    describe('getCardsWithType', () => {
        let gameId: number;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            gameId = result.gameId;
            playerA = result.playerA;
        });

        afterEach(async () => await Game.truncate());

        it('should return all cards with the related tribes', async () => {
            const cards = await CardService.getCardsWithType(gameId);

            expect(cards.length).toBe(75);
            expect(cards[0].tribe).toBeDefined();
        });

        it('should return cards filtered by the player when filters.playerIds is provided', async () => {
            const cards = await CardService.getCardsWithType(gameId, { playerIds: [playerA.id]});

            expect(cards.length).toBe(1);
            expect(cards[0].playerId).toBe(playerA.id);
        });
    });

});
