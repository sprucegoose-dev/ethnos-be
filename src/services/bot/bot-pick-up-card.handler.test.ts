import Game from '@models/game.model';
import Player from '@models/player.model';
import Card from '@models/card.model';

import { CardState } from '@interfaces/card.interface';
import { Color, IGameState } from '@interfaces/game.interface';

import ActionService from '@services/action/action.service';
import PlayerService from '@services/player/player.service';

import {
    // assignCardsToPlayer,
    createGame,
    returnPlayerCardsToDeck,
} from '../test-helpers';
import BotPickUpCardHandler from './bot-pick-up-card.handler';
import GameService from '../game/game.service';
import { TribeName } from '../../interfaces/tribe.interface';

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

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameId,
                }
            });
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

        it("should draw a card from the deck if a player's hand is empty and there are no cards in the market", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            await Card.update({
                state: CardState.IN_DECK
            }, {
                where: {
                    gameId,
                    state: CardState.IN_MARKET
                }
            });

            let cardsInHand: Card[] = [];
            const actions = await ActionService.getActions(gameId, playerA.userId);

            let updatedGame = await GameService.getState(gameId);
            const cardsInDeck = updatedGame.cards.filter(card => card.state === CardState.IN_DECK);

            const response = await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);
            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);
            updatedGame = await GameService.getState(gameId);

            cardsInHand = updatedPlayer.cards.filter(card => card.state === CardState.IN_HAND);

            const updatedCardsInDeck = updatedGame.cards.filter(card => card.state === CardState.IN_DECK);

            expect(response).toBe(true);
            expect(cardsInHand.length).toBe(1);
            expect(updatedCardsInDeck.length).toBe(cardsInDeck.length - 1);
        });
    });

    describe('getMostFrequentColorInHand', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it("should return the most frequent color in a player's hand and the total count of that color", async () => {
            const orangeCards = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.ORANGE
            ).slice(0, 3);

            const blueCards = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.BLUE
            ).slice(0, 2);

            const grayCards = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.GRAY
            ).slice(0, 1);

            const cardsInHand =  [...orangeCards, ...blueCards, ...grayCards];

            const mostFrequentColor = BotPickUpCardHandler.getMostFrequentColorInHand(cardsInHand);

            expect(mostFrequentColor).toEqual({
                color: Color.ORANGE,
                total: 3
            })
        });
    });

    describe('getMostFrequentTribeInHand', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it("should return the most frequent color in a player's hand and the total count of that color", async () => {
            const orangeCards = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.DWARVES
            ).slice(0, 3);

            const blueCards = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.MINOTAURS
            ).slice(0, 2);

            const grayCards = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.MERFOLK
            ).slice(0, 1);

            const cardsInHand =  [...orangeCards, ...blueCards, ...grayCards];

            const mostFrequentColor = BotPickUpCardHandler.getMostFrequentTribeInHand(cardsInHand);

            expect(mostFrequentColor).toEqual({
                tribeName: TribeName.DWARVES,
                total: 3
            })
        });
    });
});
