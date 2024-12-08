import Game from '@models/game.model';
import Player from '@models/player.model';
import Card from '@models/card.model';

import { CardState } from '@interfaces/card.interface';
import { Color, IGameState } from '@interfaces/game.interface';

import ActionService from '@services/action/action.service';
import PlayerService from '@services/player/player.service';

import {
    assignCardsToPlayer,
    createGame,
    ICreateGameResult,
    returnPlayerCardsToDeck,
} from '../test-helpers';
import BotPickUpCardHandler from './bot-pick-up-card.handler';
import GameService from '../game/game.service';
import { TribeName } from '../../interfaces/tribe.interface';
import { Op } from 'sequelize';
import Tribe from '../../models/tribe.model';

describe('BotPickUpCardHandler', () => {

    describe('emptyHandPickUpOrDrawCard', () => {
        let gameId: number;
        let playerA: Player;
        let gameState: IGameState;
        let cardsInMarket: Card[];

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.SKELETONS,
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                ]
            });

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
            const result = await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, player);
            expect(result).toBe(false);
        });

        it("should pick up an Orc card from the market of a color the player doesn't have on their Orc Hoard Board if the player's hand is empty", async () => {
            await Game.truncate();

            const gameWithOrcs = await createGame({
                tribes: [
                    TribeName.SKELETONS,
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ORCS,
                ]
            });

            gameId = gameWithOrcs.gameId;
            gameState = gameWithOrcs.gameState;
            playerA = gameWithOrcs.playerA;

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameId,
                }
            });

            await Card.update({
                state: CardState.IN_DECK
            }, {
                where: {
                    gameId,
                    state: [CardState.IN_MARKET, CardState.IN_HAND]
                }
            });

            const orcCard = gameState.cards.find(card => card.tribe.name === TribeName.ORCS);
            const nonOrcCards = gameState.cards.filter(card =>
                card.tribe.name !== TribeName.ORCS &&
                card.tribe.name !== TribeName.DRAGON
            ).slice(0, 7);

            await Card.update({
                state: CardState.IN_MARKET
            }, {
                where: {
                    gameId,
                    id: [orcCard.id, ...nonOrcCards.map(card => card.id)]
                }
            });

            let updatedGame = await GameService.getState(gameId);

            let cardsInHand: Card[] = [];
            let cardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);
            const actions = await ActionService.getActions(gameId, playerA.userId);

            expect(cardsInMarket.length).toBe(8);

            const result = await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);
            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);
            updatedGame = await GameService.getState(gameId);

            cardsInHand = updatedPlayer.cards.filter(card => card.state === CardState.IN_HAND);
            cardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(result).toBe(true);
            expect(cardsInHand[0].tribe.name).toBe(TribeName.ORCS);
            expect(cardsInHand.length).toBe(1);
            expect(cardsInMarket.length).toBe(7);
        });

        it("should pick up a random card from the market if a player's hand is empty and there are cards in the market", async () => {
            await returnPlayerCardsToDeck(playerA.id);
            let cardsInHand: Card[] = [];
            const actions = await ActionService.getActions(gameId, playerA.userId);

            expect(cardsInMarket.length).toBe(8);

            const result = await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);
            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);
            const updatedGame = await GameService.getState(gameId);

            cardsInHand = updatedPlayer.cards.filter(card => card.state === CardState.IN_HAND);
            cardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(result).toBe(true);
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

            const result = await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);
            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);
            updatedGame = await GameService.getState(gameId);

            cardsInHand = updatedPlayer.cards.filter(card => card.state === CardState.IN_HAND);

            const updatedCardsInDeck = updatedGame.cards.filter(card => card.state === CardState.IN_DECK);

            expect(result).toBe(true);
            expect(cardsInHand.length).toBe(1);
            expect(updatedCardsInDeck.length).toBe(cardsInDeck.length - 1);
        });
    });

    describe('getMostFrequentColor', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it("should return the most frequent color in a player's hand and the total count of that color", () => {
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

            const mostFrequentColor = BotPickUpCardHandler.getMostFrequentColor(cardsInHand);

            expect(mostFrequentColor).toEqual({
                color: Color.ORANGE,
                total: 3
            });
        });
    });

    describe('getMostFrequentTribe', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it("should return the most frequent color in a player's hand and the total count of that color", () => {
            const dwarfCards = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.DWARVES
            ).slice(0, 3);

            const minotaurCards = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.MINOTAURS
            ).slice(0, 2);

            const merfolkCards = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.MERFOLK
            ).slice(0, 1);

            const cardsInHand =  [...dwarfCards, ...minotaurCards, ...merfolkCards];

            const mostFrequentColor = BotPickUpCardHandler.getMostFrequentTribe(cardsInHand);

            expect(mostFrequentColor).toEqual({
                tribeName: TribeName.DWARVES,
                total: 3
            });
        });
    });

    describe('isSkeletonsOnlyHand', () => {

        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.SKELETONS,
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                ]
            });
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it("should return true if all cards in a player's hand are Skeletons", () => {
            const cardsInHand =  gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.SKELETONS
            ).slice(0, 3);

            const result = BotPickUpCardHandler.isSkeletonsOnlyHand(cardsInHand);

            expect(result).toBe(true);
        });

        it("should return false if only some of the cards in a player's hand are Skeletons", () => {
            const skeletonCards =  gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.SKELETONS
            ).slice(0, 2);

            const dwarfCards =  gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.DWARVES
            ).slice(0, 2);

            const cardsInHand = [...skeletonCards, ...dwarfCards];

            const result = BotPickUpCardHandler.isSkeletonsOnlyHand(cardsInHand);

            expect(result).toBe(false);
        });

        it("should return false if only some of the cards in a player's hand are Skeletons", () => {
            const skeletonCards =  gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.SKELETONS
            ).slice(0, 2);

            const dwarfCards =  gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name === TribeName.DWARVES
            ).slice(0, 2);

            const cardsInHand = [...skeletonCards, ...dwarfCards];

            const result = BotPickUpCardHandler.isSkeletonsOnlyHand(cardsInHand);

            expect(result).toBe(false);
        });

        it('should return false if a player has no cards in their hand', () => {
            const cardsInHand: Card[] = [];

            const result = BotPickUpCardHandler.isSkeletonsOnlyHand(cardsInHand);

            expect(result).toBe(false);
        });
    });

    describe('pickUpOrDrawCard', () => {
        let gameState: IGameState;
        let playerA: Player;
        let result: ICreateGameResult;

        beforeEach(async () => {
            result = await createGame({
                tribes: [
                    TribeName.WINGFOLK,
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                ]
            });
            playerA = result.playerA;
            gameState = result.gameState;

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameState.id,
                }
            });
        });

        afterEach(async () => await Game.truncate());

        it("should pick up a card from the market matching the most frequent color in a player's hand", async () => {
            await Card.update({
                state: CardState.IN_DECK,
                playerId: null,
            }, {
                where: {
                    gameId: gameState.id,
                    state: {
                        [Op.in]: [CardState.IN_MARKET,  CardState.IN_HAND]
                    }
                }
            });

            let updatedGame = await GameService.getState(gameState.id);

            let orangeCards = updatedGame.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.ORANGE &&
                [TribeName.DWARVES, TribeName.MERFOLK].includes(card.tribe.name)
            ).slice(0, 4);

            const blueCards = updatedGame.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.BLUE &&
                ![TribeName.DWARVES, TribeName.MERFOLK].includes(card.tribe.name),
            ).slice(0, 1);

            const grayCards = updatedGame.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.GRAY &&
                ![TribeName.DWARVES, TribeName.MERFOLK].includes(card.tribe.name),
            ).slice(0, 1);

            const cardsInHand = [...orangeCards, ...blueCards, ...grayCards];

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            await Card.update({
                state: CardState.IN_MARKET,
            }, {
                where: {
                    gameId: gameState.id,
                    color: Color.ORANGE,
                    id: {
                        [Op.notIn]: orangeCards.map(card => card.id),
                    },
                    state: CardState.IN_DECK,
                },
                limit: 1,
            });

            await Card.update({
                state: CardState.IN_MARKET,
            }, {
                where: {
                    gameId: gameState.id,
                    color: {
                        [Op.in]: [Color.BLUE, Color.GRAY]
                    },
                    state: CardState.IN_DECK,
                },
                limit: 3,
            });

            updatedGame = await GameService.getState(gameState.id);

            const actions = await ActionService.getActions(gameState.id, playerA.userId);

            const cardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(cardsInMarket.length).toBe(4);

            const result = await BotPickUpCardHandler.pickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);

            updatedGame = await GameService.getState(gameState.id);

            const updatedCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);

            const updatedOrangeCards = updatedPlayer.cards.filter(card => card.state === CardState.IN_HAND && card.color === Color.ORANGE);

            expect(updatedOrangeCards.length).toBe(5);
            expect(updatedCardsInMarket.length).toBe(3);
            expect(result).toBe(true);
        });

        it("should pick up a card from the market matching the most frequent tribe in a player's hand if they exceed same-color cards", async () => {
            await Card.update({
                state: CardState.IN_DECK,
                playerId: null,
            }, {
                where: {
                    gameId: gameState.id,
                    state: {
                        [Op.in]: [CardState.IN_MARKET,  CardState.IN_HAND]
                    }
                }
            });

            let updatedGame = await GameService.getState(gameState.id);

            let dwarfCards = updatedGame.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                ![Color.BLUE, Color.GRAY].includes(card.color) &&
                card.tribe.name === TribeName.DWARVES
            ).slice(0, 3);

            const centuarCard = updatedGame.cards.find(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.BLUE &&
                card.tribe.name === TribeName.CENTAURS
            );

            const merfolkCard = updatedGame.cards.find(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.GRAY &&
                card.tribe.name === TribeName.MERFOLK
            );

            const cardsInHand = [...dwarfCards, centuarCard, merfolkCard];

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const dwarfCardIds = dwarfCards.map(card => card.id);

            const dwarfForMarket = updatedGame.cards.find(card =>
                card.tribe.name === TribeName.DWARVES &&
                !dwarfCardIds.includes(card.id)
            );
            const nonDwarvesForMarket =  updatedGame.cards.filter(card =>
                card.tribe.name !== TribeName.DRAGON &&
                card.tribe.name !== TribeName.DWARVES
            ).slice(0, 3);

            await Card.update({
                state: CardState.IN_MARKET,
            }, {
                where: {
                    gameId: gameState.id,
                    id: dwarfForMarket.id,
                    state: CardState.IN_DECK,
                }
            });

            await Card.update({
                state: CardState.IN_MARKET,
            }, {
                where: {
                    gameId: gameState.id,
                    id: {
                        [Op.in]: nonDwarvesForMarket.map(card => card.id),
                    },
                    state: CardState.IN_DECK,
                }
            });

            updatedGame = await GameService.getState(gameState.id);

            const cardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(cardsInMarket.length).toBe(4);

            const actions = await ActionService.getActions(gameState.id, playerA.userId);

            const result = await BotPickUpCardHandler.pickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);

            updatedGame = await GameService.getState(gameState.id);

            const updatedCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);

            const updatedDwarfCards = updatedPlayer.cards.filter(card => card.state === CardState.IN_HAND && card.tribe.name === TribeName.DWARVES);

            expect(updatedDwarfCards.length).toBe(4);
            expect(updatedCardsInMarket.length).toBe(3);
            expect(result).toBe(true);
        });

        it("should draw a card from the deck if the market doesn't have cards matching the player's most frequent card color or tribe", async () => {
            await Card.update({
                state: CardState.IN_DECK,
                playerId: null,
            }, {
                where: {
                    gameId: gameState.id,
                    state: {
                        [Op.in]: [CardState.IN_MARKET,  CardState.IN_HAND]
                    }
                }
            });

            let updatedGame = await GameService.getState(gameState.id);

            let orangeCards = updatedGame.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.ORANGE &&
                [TribeName.DWARVES, TribeName.MERFOLK].includes(card.tribe.name)
            ).slice(0, 4);

            const blueCard = updatedGame.cards.find(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.BLUE &&
                ![TribeName.DWARVES, TribeName.MERFOLK].includes(card.tribe.name),
            );

            const cardsInHand = [...orangeCards, blueCard];

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const nonMatchingCards = updatedGame.cards.filter(card =>
                ![TribeName.DWARVES, TribeName.MERFOLK].includes(card.tribe.name) &&
                card.color !== Color.ORANGE &&
                !cardIdsToAssign.includes(card.id)
            ).slice(0, 3);

            await Card.update({
                state: CardState.IN_MARKET,
            }, {
                where: {
                    gameId: gameState.id,
                    id: {
                        [Op.in]: nonMatchingCards.map(card => card.id),
                    },
                    state: CardState.IN_DECK,
                }
            });

            updatedGame = await GameService.getState(gameState.id);

            const cardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);
            const cardsInDeck = updatedGame.cards.filter(card => card.state === CardState.IN_DECK);

            const actions = await ActionService.getActions(gameState.id, playerA.userId);

            const result = await BotPickUpCardHandler.pickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);

            updatedGame = await GameService.getState(gameState.id);

            const updatedCardsInDeck = updatedGame.cards.filter(card => card.state === CardState.IN_DECK);

            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);

            const updatedPlayerCards = updatedPlayer.cards.filter(card => card.state === CardState.IN_HAND);

            expect(updatedPlayerCards.length).toBe(6);
            expect(updatedCardsInDeck.length).toBe(cardsInDeck.length - 1);
            expect(result).toBe(true);
        });

        it("should pick up a Skeleton from the market if the market doesn't have cards matching the player's most frequent card color or tribe", async () => {
            await Game.truncate();

            result = await createGame({
                tribes: [
                    TribeName.SKELETONS,
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                ]
            });
            playerA = result.playerA;
            gameState = result.gameState;

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameState.id,
                }
            });

            await Card.update({
                state: CardState.IN_DECK,
                playerId: null,
            }, {
                where: {
                    gameId: gameState.id,
                    state: {
                        [Op.in]: [CardState.IN_MARKET,  CardState.IN_HAND]
                    }
                }
            });

            let updatedGame = await GameService.getState(gameState.id);

            let orangeCards = updatedGame.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.ORANGE &&
                [TribeName.DWARVES, TribeName.MERFOLK].includes(card.tribe.name)
            ).slice(0, 4);

            const blueCard = updatedGame.cards.find(card =>
                card.state === CardState.IN_DECK &&
                card.color === Color.BLUE &&
                ![TribeName.DWARVES, TribeName.MERFOLK].includes(card.tribe.name),
            );

            const cardsInHand = [...orangeCards, blueCard];

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const nonMatchingCards = updatedGame.cards.filter(card =>
                card.tribe.name === TribeName.SKELETONS &&
                !cardIdsToAssign.includes(card.id)
            ).slice(0, 3);

            await Card.update({
                state: CardState.IN_MARKET,
            }, {
                where: {
                    gameId: gameState.id,
                    id: {
                        [Op.in]: nonMatchingCards.map(card => card.id),
                    },
                    state: CardState.IN_DECK,
                }
            });

            updatedGame = await GameService.getState(gameState.id);

            const cardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);
            const cardsInDeck = updatedGame.cards.filter(card => card.state === CardState.IN_DECK);

            const actions = await ActionService.getActions(gameState.id, playerA.userId);

            const actionResult = await BotPickUpCardHandler.pickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);

            updatedGame = await GameService.getState(gameState.id);

            const updatedCardsInDeck = updatedGame.cards.filter(card => card.state === CardState.IN_DECK);
            const updatedMarketCards = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);

            const updatedPlayerCards = updatedPlayer.cards.filter(card => card.state === CardState.IN_HAND);

            expect(updatedPlayerCards.length).toBe(6);
            expect(updatedMarketCards.length).toBe(cardsInMarket.length - 1);
            expect(updatedCardsInDeck.length).toBe(cardsInDeck.length);
            expect(actionResult).toBe(true);
        });

        it("should return 'false' if a player already has 10 cards in their hand", async () => {
            const cardsInMarket = gameState.cards.filter(card => card.state === CardState.IN_MARKET);
            const cardsInHand = gameState.cards.filter(card => card.tribe.name !== TribeName.DRAGON).slice(0, 10);
            const actions = await ActionService.getActions(gameState.id, playerA.userId);
            const result = await BotPickUpCardHandler.pickUpOrDrawCard(actions, cardsInHand, cardsInMarket, playerA);
            expect(result).toBe(false);
        });
    });

    describe('shouldPickUpMarketCard', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.SKELETONS,
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                ]
            });
            playerA = result.playerA;
            gameState = result.gameState;

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameState.id,
                }
            });
        });

        afterEach(async () => await Game.truncate());

        it("should return the ID of a card from the market if the player only has Skeletons in their hand", async () => {
            const cardsInHand =  gameState.cards.filter(card =>
                card.tribe.name === TribeName.SKELETONS
            ).slice(0, 3);

            const nonSkeletonMarketCard =  gameState.cards.find(card =>
                card.tribe.name !== TribeName.SKELETONS
            );

            const cardsInMarket = [...gameState.cards.filter(card => card.state === CardState.IN_MARKET), nonSkeletonMarketCard];

            const nonSkeletonCardId = BotPickUpCardHandler.shouldPickUpMarketCard(cardsInHand, cardsInMarket);

            const nonSkeletonCard = await Card.findOne({
                where: {
                    id: nonSkeletonCardId
                },
                include: [
                    {
                        model: Tribe
                    }
                ]
            });

            expect(nonSkeletonCard.tribe.name).not.toBe(TribeName.SKELETONS)
        });

        it("should return 'undefined' if the player only has Skeletons in their hand and the market also has only Skeletons", async () => {
            await Card.update({
                state: CardState.IN_DECK,
                playerId: null,
            }, {
                where: {
                    gameId: gameState.id
                }
            });

            const cardsInHand =  gameState.cards.filter(card =>
                card.tribe.name === TribeName.SKELETONS
            ).slice(0, 3);

            const cardsInHandIds = cardsInHand.map(card => card.id);

            const skeletonMarketCards =  gameState.cards.filter(card =>
                card.tribe.name === TribeName.SKELETONS &&
                !cardsInHandIds.includes(card.id)
            ).slice(0, 3);

            const cardToPickUpId = BotPickUpCardHandler.shouldPickUpMarketCard(cardsInHand, skeletonMarketCards);

            expect(cardToPickUpId).toBe(undefined);
        });

        it("should return the ID of a card from the market matching the most frequent color in a player's hand", async () => {
            const orangeCards = gameState.cards.filter(card =>
                card.color === Color.ORANGE &&
                ![TribeName.CENTAURS, TribeName.ELVES].includes(card.tribe.name)
            ).slice(0, 3);

            const orangeCardIds = orangeCards.map(card => card.id);

            const blueCard = gameState.cards.find(card =>
                card.color === Color.BLUE &&
                card.tribe.name === TribeName.CENTAURS
            );

            const grayCard = gameState.cards.find(card =>
                card.color === Color.GRAY &&
                card.tribe.name === TribeName.ELVES
            );

            const cardsInHand = [...orangeCards, blueCard, grayCard];

            const orangeCardInMarket = gameState.cards.find(card => card.color === Color.ORANGE && !orangeCardIds.includes(card.id));
            const blueCardInMarket = gameState.cards.find(card => card.color === Color.BLUE && card.id !== blueCard.id);
            const grayCardInMarket = gameState.cards.find(card => card.color === Color.GRAY && card.id !== grayCard.id);

            const cardsInMarket = [orangeCardInMarket, blueCardInMarket, grayCardInMarket];

            const orangeCardId = BotPickUpCardHandler.shouldPickUpMarketCard(cardsInHand, cardsInMarket);

            const orangeCard = await Card.findOne({
                where: {
                    id: orangeCardId
                }
            });

            expect(orangeCard.color).toBe(Color.ORANGE)
        });

        it("should return the ID of a card from the market matching the most frequent tribe in a player's hand", async () => {
            const dwarfCards = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARVES
            ).slice(0, 3);

            const dwarfCardIds = dwarfCards.map(card => card.id);

            const nonDwarfCards = gameState.cards.filter(card =>
                card.tribe.name !== TribeName.DWARVES &&
                card.tribe.name !== TribeName.DRAGON
            ).slice(0, 2);

            const nonDwarfCardIds = nonDwarfCards.map(card => card.id);

            const cardsInHand =  [...dwarfCards, ...nonDwarfCards];

            const dwarfMarketCard = gameState.cards.find(card =>
                card.tribe.name === TribeName.DWARVES &&
                !dwarfCardIds.includes(card.id)
            );
            const nonDwarfMarketCards = gameState.cards.filter(card =>
                card.tribe.name !== TribeName.DWARVES &&
                !nonDwarfCardIds.includes(card.id)
            );

            const cardsInMarket = [dwarfMarketCard, ...nonDwarfMarketCards];

            const dwarfCardId = BotPickUpCardHandler.shouldPickUpMarketCard(cardsInHand, cardsInMarket);

            const dwarfCard = await Card.findOne({
                where: {
                    id: dwarfCardId
                },
                include: [
                    {
                        model: Tribe
                    }
                ]
            });

            expect(dwarfCard.tribe.name).toBe(TribeName.DWARVES);
        });
    });
});
