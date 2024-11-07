import Game from '@models/game.model';
import Player from '@models/player.model';
import Card from '@models/card.model';

import { CardState } from '@interfaces/card.interface';
import { IGameState } from '@interfaces/game.interface';

import ActionService from '@services/action/action.service';
import PlayerService from '@services/player/player.service';

import {
    createGame,
    returnPlayerCardsToDeck,
} from '../test-helpers';
import BotPickUpCardHandler from './bot-pick-up-card.handler';
import GameService from '../game/game.service';

describe('BotPickUpCardHandler', () => {

    describe('emptyHandPickUpOrDrawCard', () => {
        let gameId: number;
        let playerA: Player;
        let gameState: IGameState;
        let cardsInMarket: Card[];

        beforeEach(async () => {
            const result = await createGame();

            gameId = result.gameId;
            playerA = result.playerA;
            gameState = result.gameState;
            cardsInMarket = gameState.cards.filter(card => card.state === CardState.IN_MARKET);
        });

        afterEach(async () => await Game.truncate());

        it('should return false if the player has cards in their hand', async () => {
            const player = await PlayerService.getPlayerWithCards(playerA.id);
            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);
            const actions = await ActionService.getActions(gameId, player.userId);
            const response = await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, player);
            expect(response).toBe(false);
        });

        it("should pick up a random card from the market if a player's hand is empty and there are cards in the market", async () => {
            await returnPlayerCardsToDeck(playerA.id);
            let cardsInHand: Card[] = [];
            const actions = await ActionService.getActions(gameId, playerA.userId);

            expect(cardsInMarket.length).toBe(8);

            const response = await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);
            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);
            const updatedGame = await GameService.getState(gameId);

            cardsInHand = updatedPlayer.cards.filter(card => card.state === CardState.IN_HAND);
            cardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(response).toBe(true);
            expect(cardsInHand.length).toBe(1);
            expect(cardsInMarket.length).toBe(7);
        });
    });
});
