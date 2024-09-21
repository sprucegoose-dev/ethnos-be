
import { Game } from '../../models/game.model';
import GameService from '../game/game.service';
import PlayerService from '../player/player.service';
import { TribeName } from '../../types/tribe.interface';
import { CardState } from '../../types/card.interface';
import {
    // GameState,
    IGameState
} from '../../types/game.interface';
import { Card } from '../../models/card.model';
import { Player } from '../../models/player.model';
import { ERROR_BAD_REQUEST } from '../../helpers/exception_handler';
import { assignCardsToPlayer, createGame, getCardsFromDeck } from './test-helpers';
import DrawCardHandler from './draw-card.handler';

describe('DrawCardHandler', () => {
    let gameId: number;
    let gameState: IGameState;
    let playerA: Player;

    describe('handleDrawCard', () => {
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

            const updatedGame = await GameService.getState(gameId);

            try {
                await DrawCardHandler.handleDrawCard(updatedGame, player);
                throw new Error('Expected error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Cannot exceed hand limit of 10 cards');
            }
        });

        it("should add a card from the deck to the player's hand", async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            let updatedGame = await GameService.getState(gameId);

            const cardsInDeckCount = updatedGame.cards.filter(card => card.state == CardState.IN_DECK).length;

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(1);

            await DrawCardHandler.handleDrawCard(updatedGame, player);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);

            updatedGame = await GameService.getState(gameId);

            const updatedCardInDeckCount = updatedGame.cards.filter(card => card.state == CardState.IN_DECK).length;

            expect(updatedCardInDeckCount).toBe(cardsInDeckCount - 1);
        });

        it("should skip a dragon card and instead draw the next card", async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            let updatedGame = await GameService.getState(gameId);

            const cardsInDeckCount = updatedGame.cards.filter(card => card.state == CardState.IN_DECK).length;

            const dragonCards = updatedGame.cards
                .filter(card =>
                    card.state === CardState.IN_DECK &&
                    card.tribe.name === TribeName.DRAGON
                );

            const nonDragonCard = updatedGame.cards
                .find(card => card.state === CardState.IN_DECK &&
                    card.tribe.name !== TribeName.DRAGON
                );

            dragonCards[0].index = 0;
            nonDragonCard.index = 1;
            dragonCards[1].index = 2

            updatedGame.cards = [dragonCards[0], nonDragonCard, dragonCards[1]];

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(1);

            await DrawCardHandler.handleDrawCard(updatedGame, player);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);

            updatedGame = await GameService.getState(gameId);

            const updatedCardInDeckCount = updatedGame.cards.filter(card => card.state == CardState.IN_DECK).length;

            expect(updatedCardInDeckCount).toBe(cardsInDeckCount - 2);

            const revealedDragons = updatedGame.cards.filter(card =>
                card.tribe.name === TribeName.DRAGON &&
                card.state === CardState.REVEALED
            );

            expect(revealedDragons.length).toBe(1);
        });

        // it('should end the game if the last dragon is revealed', async () => {
        //     let player = await PlayerService.getPlayerWithCards(playerA.id);

        //     let updatedGame = await GameService.getState(gameId);

        //     const dragonCard = updatedGame.cards
        //         .find(card =>
        //             card.state === CardState.IN_DECK &&
        //             card.tribe.name === TribeName.DRAGON
        //         );

        //     const nonDragonCard = updatedGame.cards
        //         .filter(card => card.state === CardState.IN_DECK)
        //         .find(card => card.tribe.name !== TribeName.DRAGON);

        //     dragonCard.index = 0;
        //     nonDragonCard.index = 1;

        //     updatedGame.cards = [dragonCard, nonDragonCard];

        //     await DrawCardHandler.handleDrawCard(updatedGame, player);

        //     updatedGame = await GameService.getState(gameId);

        //     expect(updatedGame.state).toBe(GameState.ENDED);
        // });
    });
});
