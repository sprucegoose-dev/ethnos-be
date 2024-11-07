import Game from '@models/game.model';
import Player from '@models/player.model';
import Card from '@models/card.model';

import { CardState } from '@interfaces/card.interface';
import { IGameState } from '@interfaces/game.interface';

import ActionService from '@services/action/action.service';

import {
    createGame,
} from '../test-helpers';
import BotPickUpCardHandler from './bot-pick-up-card.handler';
import PlayerService from '../player/player.service';

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

        it("should return false if the player has cards in their hand", async () => {
            const player = await PlayerService.getPlayerWithCards(playerA.id);
            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);
            const actions = await ActionService.getActions(gameId, player.userId);
            const response = await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, player);
            expect(response).toBe(false);
        });

    });
});
