import Game from '@models/game.model';
import PlayerRegion from '@models/player_region.model';
import NextAction from '@models/nextAction.model';
import Card from '@models/card.model';
import Player from '@models/player.model';

import GameService from '@services/game/game.service';
import PlayerService from '@services/player/player.service';

import { TribeName } from '@interfaces/tribe.interface';
import { Color, IGameState } from '@interfaces/game.interface';
import { CardState } from '@interfaces/card.interface';
import { NextActionState } from '@interfaces/next-action.interface';
import { ActionType, IPlayBandPayload } from '@interfaces/action.interface';

import { ERROR_BAD_REQUEST } from '@helpers/exception-handler';

import {
    assignCardsToPlayer,
    createGame,
    getCardsFromDeck,
    returnPlayerCardsToDeck
} from '../test-helpers';
import PlayBandHandler from './play-band.handler';
import { Op } from 'sequelize';

describe('PlayBandHandler', () => {

    describe('addTokenToRegion', () => {
        afterEach(async () => await Game.truncate());

        it('should add a token to a the target region', async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF &&
                !card.playerId
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const bandCards = player.cards.filter(card => card.state === CardState.IN_HAND);

            const band = PlayBandHandler.getBandDetails(bandCards[0], bandCards.map(card => card.id));

            await PlayBandHandler.addTokenToRegion(gameState, player, band, []);

            const region = await PlayBandHandler.getRegion(gameState, bandCards[0].color);
            const playerRegion = await PlayBandHandler.getPlayerRegion(region, player);

            expect(playerRegion.tokens).toBe(1);
        });

        it("should add a 'play_band' next action if the leader is a Centaur and a token was added to the region", async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.CENTAUR &&
                !card.playerId
            ).slice(0, 5);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);
            const bandCards = cardsInHand.slice(0, 3);
            const bandCardIds = bandCards.map(card => card.id);
            const band = PlayBandHandler.getBandDetails(bandCards[0], bandCards.map(card => card.id));
            const remainingCards = PlayBandHandler.getRemainingCards(cardsInHand, bandCardIds);

            await PlayBandHandler.addTokenToRegion(gameState, player, band, remainingCards);

            const nextAction = await NextAction.findOne({
                where: {
                    gameId: gameId,
                    playerId: playerA.id,
                    state: NextActionState.PENDING,
                    type: ActionType.PLAY_BAND
                }
            });

            expect(nextAction).not.toBeNull();
        });

        it("should NOT add a token to a the target region if the band size is smaller than the player's tokens already in the region", async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const bandCards = player.cards.filter(card => card.state === CardState.IN_HAND);

            const band = PlayBandHandler.getBandDetails(bandCards[0], bandCards.map(card => card.id));

            const region = await PlayBandHandler.getRegion(gameState, bandCards[0].color);

            await PlayerRegion.create({
                playerId: playerA.id,
                regionId: region.id,
                tokens: 3
            });

            await PlayBandHandler.addTokenToRegion(gameState, player, band, []);

            const playerRegion = await PlayBandHandler.getPlayerRegion(region, player);

            expect(playerRegion.tokens).toBe(3);
        });

        it("should NOT add a token to a the target region if the band leader is a Halfling", async () => {
            const result = await createGame({
                tribes: [
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.HALFLING,
                ]
            });
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.HALFLING
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const bandCards = player.cards.filter(card => card.state === CardState.IN_HAND);

            const band = PlayBandHandler.getBandDetails(bandCards[0], bandCards.map(card => card.id));

            const region = await PlayBandHandler.getRegion(gameState, bandCards[0].color);

            await PlayBandHandler.addTokenToRegion(gameState, player, band, []);

            const playerRegion = await PlayBandHandler.getPlayerRegion(region, player);

            expect(playerRegion.tokens).toBe(0);
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

        afterEach(async () => await Game.truncate());

        it('assigns the provided cards to a band', async () => {
            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF
            ).slice(0, 5);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            await PlayBandHandler.assignCardsToBand(player, cardIdsToAssign, cardsToAssign[0].id);

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

    describe('discardRemainingCards', () => {
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

        it("discards any remaining cards left in a player's hand", async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 5);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            let updatedGame = await GameService.getState(gameId);

            const originalCardsInMarket = updatedGame.cards.filter(card => card.state === CardState.IN_MARKET);

            expect(originalCardsInMarket.length).toBe(8);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            const remainingCards = player.cards.filter(card => card.state === CardState.IN_HAND);

            expect(remainingCards.length).toBe(6);

            await PlayBandHandler.discardRemainingCards({
                remainingCards,
                tokenAdded: false,
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

            await PlayBandHandler.discardRemainingCards({
                remainingCards,
                tokenAdded: false,
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

            await PlayBandHandler.discardRemainingCards({
                remainingCards,
                tokenAdded: true,
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

    describe('filterOutCardsToKeep', () => {
        afterEach(async () => await Game.truncate());

        it("filters out the card IDs to keep from the remaining cards in a player's hand", async () => {
            const {
                gameState,
                playerA,
            } = await createGame();

            await returnPlayerCardsToDeck(playerA.id);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

            expect(cardsInHand.length).toBe(3);

            const remainingCards = PlayBandHandler.filterOutCardsToKeep(cardsInHand, [cardsInHand[0].id, cardsInHand[1].id], 2);

            expect(remainingCards.length).toBe(1);
            expect(remainingCards[0].id).toEqual(cardsInHand[2].id);
        });

        it("throws an error if the 'cardIdsToKeep' parameter is not an array", () => {
            try {
                PlayBandHandler.filterOutCardsToKeep([], null, 5);
                throw new Error('Expected this error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('cardIdsToKeep must be an array');
            }
        });

        it("throws an error if the card IDs to keep don't match the cards in the player's hand", async () => {
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
                PlayBandHandler.filterOutCardsToKeep(cardsInHand, [100, 102], 3);
                throw new Error('Expected this error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe("cardIdsToKeep must only include IDs of cards in a player's hand");
            }
        });

        it("throws an error if the card IDs to keep exceed the size of the band played", async () => {
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
                PlayBandHandler.filterOutCardsToKeep(cardsInHand, cardsInHand.map(card => card.id), 2);
                throw new Error('Expected this error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe("cardIdsToKeep must not exceed the size of the band");
            }
        });
    });

    describe('getBandDetails', () => {

        afterEach(async () => await Game.truncate());

        it("returns a band details object with the 'tribe', 'color', and 'bandSize'", async () => {
            const {
                gameState,
            } = await createGame();

            const bandCards = gameState.cards.filter(card => card.tribe.name === TribeName.DWARF).slice(0, 3);

            const leader = bandCards[0];

            const bandDetails = PlayBandHandler.getBandDetails(leader, bandCards.map(card => card.id));

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

            const bandDetails = PlayBandHandler.getBandDetails(leader, bandCards.map(card => card.id));

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

            const bandDetails = PlayBandHandler.getBandDetails(leader, bandCards.map(card => card.id), Color.PURPLE);

            expect(bandDetails).toEqual({
                color: Color.PURPLE,
                tribe: leader.tribe.name,
                bandSize: 3
            });
        });

    });

    describe('getRemainingCards', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it("returns the cards remaining in a player's hand after having played a band", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND)

            const bandCardIds = cardIdsToAssign.slice(0, 2);

            const remainingCards = PlayBandHandler.getRemainingCards(cardsInHand, bandCardIds);

            expect(remainingCards.length).toBe(1);
            expect(remainingCards[0].id).toBe(cardsToAssign[2].id);
        });
    });

    describe('handlePlayBand', () => {

        afterEach(async () => await Game.truncate());

        it('adds a token to the target region', async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF &&
                !card.playerId
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const leader = cardsToAssign[0];

            const payload: IPlayBandPayload = {
                cardIds: cardIdsToAssign,
                leaderId: leader.id,
                type: ActionType.PLAY_BAND
            };

            await PlayBandHandler.handlePlayBand(gameState, player, payload);

            const region = await PlayBandHandler.getRegion(gameState, leader.color);
            const playerRegion = await PlayBandHandler.getPlayerRegion(region, player);

            expect(playerRegion.tokens).toBe(1);
        });

        it('assigns the cards to a band', async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF &&
                !card.playerId
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const leaderId = cardIdsToAssign[0];

            const payload: IPlayBandPayload = {
                cardIds: cardIdsToAssign,
                leaderId,
                type: ActionType.PLAY_BAND
            }

            await PlayBandHandler.handlePlayBand(gameState, player, payload);

            const bandCards = await Card.findAll({
                where: {
                    playerId: playerA.id,
                    leaderId,
                    state: CardState.IN_BAND,
                }
            });

            expect(bandCards.length).toBe(3);
        });

        it("discards any cards remaining in the player's hand", async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF &&
                !card.playerId
            ).slice(0, 5);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const bandCardIds = cardIdsToAssign.slice(0, 3);

            const remainingCardIds = cardIdsToAssign.slice(3)

            const leaderId = bandCardIds[0];

            const payload: IPlayBandPayload = {
                cardIds: bandCardIds.slice(0, 3),
                leaderId,
                type: ActionType.PLAY_BAND
            }

            await PlayBandHandler.handlePlayBand(gameState, player, payload);

            const discardedCards = await Card.findAll({
                where: {
                    playerId: null,
                    leaderId: null,
                    state: CardState.IN_MARKET,
                    id: {
                        [Op.in]: remainingCardIds,
                    }
                }
            });

            expect(discardedCards.length).toBe(2);
        });

        it("resolves a pending 'next action' if the payload includes a 'nextActionId'", async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF &&
                !card.playerId
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const leader = cardsToAssign[0];

            let nextAction = await NextAction.create({
                gameId: gameId,
                playerId: playerA.id,
                state: NextActionState.PENDING,
                type: ActionType.PLAY_BAND
            });

            const payload: IPlayBandPayload = {
                cardIds: cardIdsToAssign,
                leaderId: leader.id,
                type: ActionType.PLAY_BAND,
                nextActionId: nextAction.id,
            };

            await PlayBandHandler.handlePlayBand(gameState, player, payload);

            nextAction = await NextAction.findOne({
                where: {
                    gameId: gameId,
                    playerId: playerA.id,
                    type: ActionType.PLAY_BAND
                }
            });

            expect(nextAction.state).toBe(NextActionState.RESOLVED);
        });
    });

    describe('validateBand', () => {

        afterEach(async () => await Game.truncate());

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

            const isValid = PlayBandHandler.validateBand(cardsInHand, cardIdsToAssign, cardsInHand[0]);

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
                PlayBandHandler.validateBand(cardsInHand, [100, 101, 102], cardsInHand[0]);
                throw new Error('Expected this error not to be thrown');
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
                PlayBandHandler.validateBand(cardsInHand, cardIdsToAssign, leaderToAssign);
                throw new Error('Expected this error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('A Skeleton cannot be the leader of a band');
            }
        });
    });

});
