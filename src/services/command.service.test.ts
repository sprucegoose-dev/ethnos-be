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
import { Color, GameState, IGameSettings, IGameState } from '../types/game.interface';
import { Card } from '../models/card.model';
import { Player } from '../models/player.model';
import { Op } from 'sequelize';
import { ERROR_BAD_REQUEST } from '../helpers/exception_handler';
import { ActionType } from '../types/action.interface';


const defaultSettings =  {
    tribes: [
        TribeName.DWARF,
        TribeName.MINOTAUR,
        TribeName.MERFOLK,
        TribeName.CENTAUR,
        TribeName.ELF,
        TribeName.WIZARD,
    ]
};

async function createGame(settings: IGameSettings = defaultSettings) {
    const game = await GameService.create(userA.id);
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
            }
        },
    });
}

describe('CommandService', () => {
    describe('handleDrawCard', () => {
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

            const updatedGame = await GameService.getState(gameId);

            try {
                await CommandService.handleDrawCard(updatedGame, player);
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

            await CommandService.handleDrawCard(updatedGame, player);

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

            await CommandService.handleDrawCard(updatedGame, player);

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

        it('should end the game if the last dragon is revealed', async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            let updatedGame = await GameService.getState(gameId);

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

            updatedGame = await GameService.getState(gameId);

            expect(updatedGame.state).toBe(GameState.ENDED);
        });
    });

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
                await CommandService.handlePickUpCard(updatedGame, player, cardToPickUp.id);
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
                await CommandService.handlePickUpCard(updatedGame, player, cardToPickUp.id);
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

            await CommandService.handlePickUpCard(updatedGame, player, cardToPickUp.id);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);
        });
    });

    describe('handleRemainingCards', () => {
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

        it("discards any remaining cards left in a player's hand", async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 5);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            let updatedGame = await GameService.getState(gameId);

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

            updatedGame = await GameService.getState(gameId);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(0);

            const updatedCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(updatedCardsInMarket.length).toBe(originalCardsInMarket.length + remainingCards.length);
        });

        it("retains some cards in the player's hand if the band leader is an Elf", async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 5);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            let updatedGame = await GameService.getState(gameId);

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

            updatedGame = await GameService.getState(gameId);

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

            let updatedGame = await GameService.getState(gameId);

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

            updatedGame = await GameService.getState(gameId);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(6);

            const updatedCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(updatedCardsInMarket.length).toBe(originalCardsInMarket.length);
        });
    });

    describe('assignCardsToBand', () => {
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

        it('assigns the provided cards to a band', async () => {
            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF
            ).slice(0, 5);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            await CommandService.assignCardsToBand(player, cardIdsToAssign, cardsToAssign[0].id);

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

    describe('getBandDetails', () => {

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it("returns a band details object with the 'tribe', 'color', and 'bandSize'", async () => {
            const {
                gameState,
            } = await createGame();

            const bandCards = gameState.cards.filter(card => card.tribe.name === TribeName.DWARF).slice(0, 3);

            const leader = bandCards[0];

            const bandDetails = CommandService.getBandDetails(leader, bandCards.map(card => card.id));

            expect(bandDetails).toEqual({
                color: leader.color,
                tribe: leader.tribe.name,
                bandSize: 3
            });
        });

        it('returns a band size of +1 when the leader is a Minotaur', async () => {
            const {
                gameState,
            } = await createGame();

            const bandCards = gameState.cards.filter(card => card.tribe.name === TribeName.MINOTAUR).slice(0, 3);

            const leader = bandCards[0];

            const bandDetails = CommandService.getBandDetails(leader, bandCards.map(card => card.id));

            expect(bandDetails).toEqual({
                color: leader.color,
                tribe: leader.tribe.name,
                bandSize: 4
            });
        });


        it('returns a band color based on the specified region when the leader is a Wingfolk', async () => {
            const {
                gameState
            } = await createGame({
                tribes: [
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.WINGFOLK,
                ]
            });

            const bandCards = gameState.cards.filter(card => card.tribe.name === TribeName.WINGFOLK).slice(0, 3);

            const leader = bandCards[0];
            leader.color = Color.GRAY;

            const bandDetails = CommandService.getBandDetails(leader, bandCards.map(card => card.id), Color.PURPLE);

            expect(bandDetails).toEqual({
                color: Color.PURPLE,
                tribe: leader.tribe.name,
                bandSize: 3
            });
        });

    });

    describe('validateBand', () => {
        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it("returns 'true' if the band is valid", async () => {
            const {
                gameState,
                playerA,
            } = await createGame();

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

            const isValid = CommandService.validateBand(cardsInHand, cardIdsToAssign, cardsInHand[0]);

            expect(isValid).toBe(true);
        });

        it("throws an error if the band is invalid", async () => {
            const {
                gameState,
                playerA,
            } = await createGame();

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

            try {
                CommandService.validateBand(cardsInHand, [100, 101, 102], cardsInHand[0]);
                throw new Error('Expected error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Invalid band');
            }
        });

        it("throws an error if the band leader is a skeleton", async () => {
            const {
                gameState,
                playerA,
            } = await createGame({
                tribes: [
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.SKELETON,
                ]
            });

            const leaderToAssign =  gameState.cards.find(card =>
                card.tribe.name === TribeName.SKELETON &&
                !card.playerId
            );

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF &&
                !card.playerId
            ).slice(0, 2);

            const cardIdsToAssign = [
                leaderToAssign.id,
                ...cardsToAssign.map(card => card.id),
            ]

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

            try {
                CommandService.validateBand(cardsInHand, cardIdsToAssign, leaderToAssign);
                throw new Error('Expected error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('A Skeleton cannot be the leader of a band');
            }
        });
    });

    describe('handleWizardDraw', () => {
        let gameId: number;
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
            gameId = result.gameId;
            gameState = result.gameState;
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });


        it('should draw cards equal to the size of the band played', async () => {
            await Card.update({
                playerId: null,
                state: CardState.IN_DECK
            }, {
                where: {
                    playerId: playerA.id
                }
            });

            gameState = await GameService.getState(gameId);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            await CommandService.handleWizardDraw(gameState, player, 3);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

            expect(cardsInHand.length).toBe(3);
        });
    });

    describe('handleTrollTokens', () => {
        let gameId: number;
        let gameState: IGameState;
        let playerA: Player;
        let playerB: Player;

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.TROLL,
                ]
            });
            gameId = result.gameId;
            playerA = result.playerA;
            playerB = result.playerB;
            gameState = result.gameState;
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });


        it('should assign a troll token equal to the size of the band played, if available', async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            await CommandService.handleTrollTokens(gameState, player, 5);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.trollTokens).toEqual([5]);
        });

        it("should assign the next largest troll token if the one matching the band size isn't available", async () => {
            await Player.update({
                trollTokens: [5]
            }, {
                where: {
                    id: playerB.id
                }
            });

            gameState = await GameService.getState(gameId);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            await CommandService.handleTrollTokens(gameState, player, 5);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.trollTokens).toEqual([4]);
        });
    });
});
