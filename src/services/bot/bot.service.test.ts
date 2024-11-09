import Game from '@models/game.model';
import Player from '@models/player.model';

import {
    createGame,
} from '../test-helpers';

import BotService from './bot.service';
import { CardState } from '../../interfaces/card.interface';
import { IGameState } from '../../interfaces/game.interface';
import PlayerService from '../player/player.service';

describe('BotService', () => {

    describe('getCardsInHand', () => {
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
        });

        afterEach(async () => await Game.truncate());

        it("should return the cards in a player's hand", async () => {
            const playerWithCards = await PlayerService.getPlayerWithCards(playerA.id);
            const cardsInHand = BotService.getCardsInHand(playerWithCards);
            expect(cardsInHand.length).toBe(1);
            expect(cardsInHand[0].state).toBe(CardState.IN_HAND);
        });
    });

    describe('getCardsInMarket', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it("should return all cards in the market", () => {
            const cardsInMarket = BotService.getCardsInMarket(gameState);
            expect(cardsInMarket.length).toBe(8);
            expect(cardsInMarket.every(card => card.state === CardState.IN_MARKET)).toBe(true);
        });
    });

});
