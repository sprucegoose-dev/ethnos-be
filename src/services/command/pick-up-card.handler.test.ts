import { Game } from '../../models/game.model';
import GameService from '../game/game.service';
import PlayerService from '../player/player.service';
import PickUpCardHandler from './pick-up-card.handler';
import { CardState } from '../../types/card.interface';
import { IGameState } from '../../types/game.interface';
import { Card } from '../../models/card.model';
import { Player } from '../../models/player.model';
import { ERROR_BAD_REQUEST } from '../../helpers/exception_handler';
import { assignCardsToPlayer, createGame, getCardsFromDeck } from './test-helpers';

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

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

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
                throw new Error('Expected error not to be thrown');
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
                throw new Error('Expected error not to be thrown');
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