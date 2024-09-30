import Game from '@models/game.model';
import Card from '@models/card.model';
import Player from '@models/player.model';

import GameService from '@services/game/game.service';
import PlayerService from '@services/player/player.service';

import { CardState } from '@interfaces/card.interface';
import { IGameState } from '@interfaces/game.interface';

import { ERROR_BAD_REQUEST } from '@helpers/exception-handler';

import {
    UNEXPECTED_ERROR_MSG,
} from '@jest.setup';

import {
    assignCardsToPlayer,
    createGame,
    getCardsFromDeck
} from '../test-helpers';
import PickUpCardHandler from './pick-up-card.handler';

describe('PickUpCardHandler', () => {
    describe('handlePickUpCard', () => {
        let gameId: number;
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            gameId = result.gameId;
            playerA = result.playerA;
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it('should throw an error if a player already has 10 cards in hand', async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 9);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardToPickUp = await Card.findOne({
                where: {
                    gameId: gameId,
                    state: CardState.IN_MARKET
                }
            });

            const updatedGame = await GameService.getState(gameId);

            try {
                await PickUpCardHandler.handlePickUpCard(updatedGame, player, cardToPickUp.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Cannot exceed hand limit of 10 cards');
            }
        });

        it('should throw an error if the target card being picked up is not in the market', async () => {
            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardToPickUp = await Card.findOne({
                where: {
                    gameId: gameId,
                    state: CardState.IN_DECK
                }
            });

            const updatedGame = await GameService.getState(gameId);

            try {
                await PickUpCardHandler.handlePickUpCard(updatedGame, player, cardToPickUp.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Invalid card');
            }
        });

        it('should assign the target card to the player if the card is in the market', async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(1);

            const cardToPickUp = await Card.findOne({
                where: {
                    gameId: gameId,
                    state: CardState.IN_MARKET
                }
            });

            const updatedGame = await GameService.getState(gameId);

            await PickUpCardHandler.handlePickUpCard(updatedGame, player, cardToPickUp.id);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);
        });
    });

});
