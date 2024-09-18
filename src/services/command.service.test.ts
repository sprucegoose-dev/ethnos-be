import { Game } from '../models/game.model';
import GameService from './game.service';
import {
    userA,
    userB,
    userC,
    userD,
} from '../../jest.setup';
import PlayerService from './player.service';
import { TribeName } from '../types/tribe.interface';
import { CommandService } from './command.service';
import { CardState } from '../types/card.interface';
import { Color, GameState, IGameState } from '../types/game.interface';
import { Card } from '../models/card.model';
import { Player } from '../models/player.model';
import { Op } from 'sequelize';
import { ERROR_BAD_REQUEST } from '../helpers/exception_handler';
import { ActionType } from '../types/action.interface';

function getCardsFromDeck(cards: Card[], quantity: number): number[] {
    return cards.filter(card =>
            card.state === CardState.IN_DECK
        )
        .sort((cardA, cardB) => cardA.index - cardB.index)
        .slice(0, quantity)
        .map(card => card.id);
}

async function assignCardsToPlayer(playerId: number, cardIdsToAssign: number[]) {
    await Card.update({
        playerId,
        state: CardState.IN_HAND,
    }, {
        where: {
            id: {
                [Op.in]: cardIdsToAssign
            },
            index: {
                [Op.lte]: cardIdsToAssign.length - 1
            }
        },
    });

}


describe('CommandService', () => {
    const settings = {
        tribes: [
            TribeName.DWARF,
            TribeName.MINOTAUR,
            TribeName.MERFOLK,
            TribeName.CENTAUR,
            TribeName.ELF,
            TribeName.WIZARD,
        ]
    };

    describe('handleDrawCard', () => {
        let game: Game;
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            game = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, game.id);
            await PlayerService.create(userB.id, game.id);
            await PlayerService.create(userC.id, game.id);
            await PlayerService.create(userD.id, game.id);
            await GameService.start(userA.id, game.id, settings);

            gameState = await GameService.getState(game.id);
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it('should throw an error if a player already has 10 cards in hand', async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 9);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const updatedGame = await GameService.getState(game.id);

            try {
                await CommandService.handleDrawCard(updatedGame, player);
                throw new Error('Expected error not thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Cannot exceed hand limit of 10 cards');
            }
        });

        it("should add a card from the deck to the player's hand", async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            let updatedGame = await GameService.getState(game.id);

            const cardsInDeckCount = updatedGame.cards.filter(card => card.state == CardState.IN_DECK).length;

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(1);

            await CommandService.handleDrawCard(updatedGame, player);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);

            updatedGame = await GameService.getState(game.id);

            const updatedCardInDeckCount = updatedGame.cards.filter(card => card.state == CardState.IN_DECK).length;

            expect(updatedCardInDeckCount).toBe(cardsInDeckCount - 1);
        });

        it("should skip a dragon card and instead draw the next card", async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            let updatedGame = await GameService.getState(game.id);

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

            await CommandService.handleDrawCard(updatedGame, player);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);

            updatedGame = await GameService.getState(game.id);

            const updatedCardInDeckCount = updatedGame.cards.filter(card => card.state == CardState.IN_DECK).length;

            expect(updatedCardInDeckCount).toBe(cardsInDeckCount - 2);

            const revealedDragons = updatedGame.cards.filter(card =>
                card.tribe.name === TribeName.DRAGON &&
                card.state === CardState.REVEALED
            );

            expect(revealedDragons.length).toBe(1);
        });

        it('should end the game if the last dragon is revealed', async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            let updatedGame = await GameService.getState(game.id);

            const dragonCard = updatedGame.cards
                .find(card =>
                    card.state === CardState.IN_DECK &&
                    card.tribe.name === TribeName.DRAGON
                );

            const nonDragonCard = updatedGame.cards
                .filter(card => card.state === CardState.IN_DECK)
                .find(card => card.tribe.name !== TribeName.DRAGON);

            dragonCard.index = 0;
            nonDragonCard.index = 1;

            updatedGame.cards = [dragonCard, nonDragonCard];

            await CommandService.handleDrawCard(updatedGame, player);

            updatedGame = await GameService.getState(game.id);

            expect(updatedGame.state).toBe(GameState.ENDED);
        });
    });

    describe('handlePickUpCard', () => {
        let game: Game;
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            game = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, game.id);
            await PlayerService.create(userB.id, game.id);
            await PlayerService.create(userC.id, game.id);
            await PlayerService.create(userD.id, game.id);
            await GameService.start(userA.id, game.id, settings);

            gameState = await GameService.getState(game.id);
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
                    gameId: game.id,
                    state: CardState.IN_MARKET
                }
            });

            const updatedGame = await GameService.getState(game.id);

            try {
                await CommandService.handlePickUpCard(updatedGame, player, cardToPickUp.id);
                throw new Error('Expected error not thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Cannot exceed hand limit of 10 cards');
            }
        });

        it('should throw an error if the target card being picked up is not in the market', async () => {
            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardToPickUp = await Card.findOne({
                where: {
                    gameId: game.id,
                    state: CardState.IN_DECK
                }
            });

            const updatedGame = await GameService.getState(game.id);

            try {
                await CommandService.handlePickUpCard(updatedGame, player, cardToPickUp.id);
                throw new Error('Expected error not thrown');
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
                    gameId: game.id,
                    state: CardState.IN_MARKET
                }
            });

            const updatedGame = await GameService.getState(game.id);

            await CommandService.handlePickUpCard(updatedGame, player, cardToPickUp.id);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);
        });
    });

    describe('handleRemainingCards', () => {
        let game: Game;
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            game = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, game.id);
            await PlayerService.create(userB.id, game.id);
            await PlayerService.create(userC.id, game.id);
            await PlayerService.create(userD.id, game.id);
            await GameService.start(userA.id, game.id, settings);

            gameState = await GameService.getState(game.id);
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it("discards any remaining cards left in a player's hand", async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 5);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            let updatedGame = await GameService.getState(game.id);

            const originalCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(originalCardsInMarket.length).toBe(8);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            const remainingCards = player.cards.filter(card => card.state === CardState.IN_HAND);

            expect(remainingCards.length).toBe(6);

            await CommandService.handleRemainingCards({
                remainingCards,
                nextAction: null,
                player,
                cardIdsToKeep: [],
                band: {
                    tribe: TribeName.MINOTAUR,
                    color: Color.BLUE,
                    bandSize: 3,
                }
            });

            updatedGame = await GameService.getState(game.id);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(0);

            const updatedCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(updatedCardsInMarket.length).toBe(originalCardsInMarket.length + remainingCards.length);
        });

        it("retains some cards in the player's hand if the band leader is an Elf", async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 5);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            let updatedGame = await GameService.getState(game.id);

            const originalCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(originalCardsInMarket.length).toBe(8);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            const remainingCards = player.cards.filter(card => card.state === CardState.IN_HAND);

            const cardIdsToKeep = remainingCards.slice(0, 3).map(card => card.id);

            expect(remainingCards.length).toBe(6);

            await CommandService.handleRemainingCards({
                remainingCards,
                nextAction: null,
                player,
                cardIdsToKeep,
                band: {
                    tribe: TribeName.ELF,
                    color: Color.ORANGE,
                    bandSize: 3,
                }
            });

            updatedGame = await GameService.getState(game.id);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(3);

            const updatedCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(updatedCardsInMarket.length).toBe(
                originalCardsInMarket.length + remainingCards.length - cardIdsToKeep.length
            );
        });

        it("doesn't discard any cards if there's a next action of the type 'play_band'", async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 5);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            let updatedGame = await GameService.getState(game.id);

            const originalCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(originalCardsInMarket.length).toBe(8);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            const remainingCards = player.cards.filter(card => card.state === CardState.IN_HAND);

            expect(remainingCards.length).toBe(6);

            await CommandService.handleRemainingCards({
                remainingCards,
                nextAction: { type: ActionType.PLAY_BAND },
                player,
                cardIdsToKeep: [],
                band: {
                    tribe: TribeName.CENTAUR,
                    color: Color.BLUE,
                    bandSize: 3,
                }
            });

            updatedGame = await GameService.getState(game.id);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(6);

            const updatedCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(updatedCardsInMarket.length).toBe(originalCardsInMarket.length);
        });
    });

    describe('assignCardsToBand', () => {
        let game: Game;
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            game = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, game.id);
            await PlayerService.create(userB.id, game.id);
            await PlayerService.create(userC.id, game.id);
            await PlayerService.create(userD.id, game.id);

            await GameService.start(userA.id, game.id, settings);

            gameState = await GameService.getState(game.id);
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it('assigns the provided cards to a band', async () => {
            gameState = await GameService.getState(game.id);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF
            ).slice(0, 5);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            await CommandService.assignCardsToBand(player, cardsToAssign, cardsToAssign[0].id);

            const cardsInBand = await Card.findAll({
                where: {
                    id: cardIdsToAssign,
                    state: CardState.IN_BAND,
                    leaderId: cardsToAssign[0].id
                }
            });

            expect(cardsInBand.length).toBe(5);
        });

    });

});
