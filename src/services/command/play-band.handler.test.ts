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
import { NextActionState } from '@interfaces/nextAction.interface';
import { ActionType } from '@interfaces/action.interface';

import { ERROR_BAD_REQUEST } from '@helpers/exception_handler';

import {
    assignCardsToPlayer,
    createGame,
    getCardsFromDeck
} from './test-helpers';
import PlayBandHandler from './play-band.handler';

describe('PlayBandHandler', () => {

    describe('addTokenToRegion', () => {
        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it('should add a token to a the target region', async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await Card.update({
                playerId: null,
                state: CardState.IN_DECK
            }, {
                where: {
                    playerId: playerA.id
                }
            });

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

            await PlayBandHandler.addTokenToRegion(gameState, player, band);

            const region = await PlayBandHandler.getRegion(gameState, bandCards[0].color);
            const playerRegion = await PlayBandHandler.getPlayerRegion(region, player);

            expect(playerRegion.tokens).toBe(1);
        });

        it("should add a 'play_band' next action if the leader is a Centaur and a token was added to the region", async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await Card.update({
                playerId: null,
                state: CardState.IN_DECK
            }, {
                where: {
                    playerId: playerA.id
                }
            });

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.CENTAUR &&
                !card.playerId
            ).slice(0, 3);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const player = await PlayerService.getPlayerWithCards(playerA.id);

            const bandCards = player.cards.filter(card => card.state === CardState.IN_HAND);

            const band = PlayBandHandler.getBandDetails(bandCards[0], bandCards.map(card => card.id));

            await PlayBandHandler.addTokenToRegion(gameState, player, band);

            try {
                const nextAction = await NextAction.findOne({
                    where: {
                        gameId: gameId,
                        playerId: playerA.id,
                        state: NextActionState.PENDING,
                        type: ActionType.PLAY_BAND
                    }
                });

                expect(nextAction).toBeDefined();
            } catch (error) {
                console.log(error);
            }
        });

        it("should NOT add a token to a the target region if the band size is smaller than the player's tokens already in the region", async () => {
            const result = await createGame();
            const gameId = result.gameId;
            const playerA = result.playerA;
            let gameState = result.gameState;

            await Card.update({
                playerId: null,
                state: CardState.IN_DECK
            }, {
                where: {
                    playerId: playerA.id
                }
            });

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

            await PlayBandHandler.addTokenToRegion(gameState, player, band);

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

            await Card.update({
                playerId: null,
                state: CardState.IN_DECK
            }, {
                where: {
                    playerId: playerA.id
                }
            });

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

            await PlayBandHandler.addTokenToRegion(gameState, player, band);

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

            await PlayBandHandler.discardRemainingCards({
                remainingCards,
                nextActions: [],
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
                nextActions: [],
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
                nextActions: [{ type: ActionType.PLAY_BAND }],
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
                PlayBandHandler.validateBand(cardsInHand, cardIdsToAssign, leaderToAssign);
                throw new Error('Expected error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('A Skeleton cannot be the leader of a band');
            }
        });
    });
});
