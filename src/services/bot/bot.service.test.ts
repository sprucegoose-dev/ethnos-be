import shuffle from 'lodash.shuffle';

import Game from '@models/game.model';
import Player from '@models/player.model';

import {
    assignCardsToPlayer,
    createGame,
    returnPlayerCardsToDeck,
} from '../test-helpers';

import BotService from './bot.service';
import { CardState } from '../../interfaces/card.interface';
import { Color, IGameState } from '../../interfaces/game.interface';
import PlayerService from '../player/player.service';
import { TribeName } from '../../interfaces/tribe.interface';
import ActionService from '../action/action.service';
import { ActionType } from '../../interfaces/action.interface';
import BotTokenHandler from './bot-token.handler';
import BotPickUpCardHandler from './bot-pick-up-card.handler';
import BotPlayBandHandler from './bot-play-band.handler';

describe('BotService', () => {

    describe('getCardsInHand', () => {
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
        });

        afterEach(async () => await Game.truncate());

        it("should return the cards in a player's hand", async () => {
            const playerWithCards = await PlayerService.getPlayerWithCards(playerA.id);
            const cardsInHand = BotService.getCardsInHand(playerWithCards);
            expect(cardsInHand.length).toBe(1);
            expect(cardsInHand[0].state).toBe(CardState.IN_HAND);
        });
    });

    describe('getCardsInMarket', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it("should return all cards in the market", () => {
            const cardsInMarket = BotService.getCardsInMarket(gameState);
            expect(cardsInMarket.length).toBe(8);
            expect(cardsInMarket.every(card => card.state === CardState.IN_MARKET)).toBe(true);
        });
    });

    describe('preSortBandActions', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
            playerA = result.playerA;
        });

        afterEach(async () => await Game.truncate());

        it("should sort 'play band' actions so that Centaurs are sorted first", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const centaurCards = gameState.cards.filter(card => card.tribe.name === TribeName.CENTAURS).slice(0, 2);
            const nonCentaurCards = gameState.cards.filter(card =>
                card.tribe.name !== TribeName.CENTAURS &&
                card.tribe.name !== TribeName.DRAGON
            ).slice(0, 2);

            const cardsInHand = [...centaurCards, ...nonCentaurCards];

            const centaurCardIds = centaurCards.map(card => card.id);

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const actions = (await ActionService.getActions(gameState.id, playerA.userId))
                .filter(action => action.type === ActionType.PLAY_BAND);

            const sortedPlayBandActions = BotService.preSortBandActions(shuffle(actions), cardsInHand);

            expect(centaurCardIds).toContain(sortedPlayBandActions[0].leaderId);
        });

        it("should sort 'play band' actions so that Elves are sorted first when Centaurs are not available", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const elfCards = gameState.cards.filter(card => card.tribe.name === TribeName.ELVES).slice(0, 2);
            const nonCentaurCards = gameState.cards.filter(card =>
                card.tribe.name !== TribeName.ELVES &&
                card.tribe.name !== TribeName.CENTAURS &&
                card.tribe.name !== TribeName.DRAGON
            ).slice(0, 2);

            const cardsInHand = [...elfCards, ...nonCentaurCards];

            const elfCardIds = elfCards.map(card => card.id);

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const actions = (await ActionService.getActions(gameState.id, playerA.userId))
                .filter(action => action.type === ActionType.PLAY_BAND);

            const sortedPlayBandActions = BotService.preSortBandActions(shuffle(actions), cardsInHand);

            expect(elfCardIds).toContain(sortedPlayBandActions[0].leaderId);
        });

        it("should sort the actions by the size of the bands", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const orangeDwarfCard = gameState.cards.find(card => card.tribe.name === TribeName.DWARVES && card.color === Color.ORANGE);
            const blueDwarfCard = gameState.cards.find(card => card.tribe.name === TribeName.DWARVES && card.color === Color.BLUE);
            const grayDwarfCard = gameState.cards.find(card => card.tribe.name === TribeName.DWARVES && card.color === Color.GRAY);
            const grayMerfolkCard = gameState.cards.find(card => card.tribe.name === TribeName.MERFOLK && card.color === Color.GRAY);

            const cardsInHand = [orangeDwarfCard, blueDwarfCard, grayDwarfCard, grayMerfolkCard];

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const actions = (await ActionService.getActions(gameState.id, playerA.userId))
                .filter(action => action.type === ActionType.PLAY_BAND);

            const sortedPlayBandActions = BotService.preSortBandActions(shuffle(actions), cardsInHand);

            expect(sortedPlayBandActions[0].cardIds.length).toBe(3);
            expect(sortedPlayBandActions[sortedPlayBandActions.length - 1].cardIds.length).toBe(1);
        });
    });

    describe('takeTurn', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
            playerA = result.playerA;

            jest.spyOn(BotService, 'delayBot').mockResolvedValue();
        });

        afterEach(async () => await Game.truncate());

        it('should call BotTokenHandler.handleFreeTokenAction', async () => {
            jest.spyOn(BotTokenHandler, 'handleFreeTokenAction').mockResolvedValueOnce(true);

            await BotService.takeTurn(gameState.id, playerA.id);

            expect(BotTokenHandler.handleFreeTokenAction).toHaveBeenCalled();
        });

        it('should call BotPickUpCardHandler.emptyHandPickUpOrDrawCard if the precedeing action was falsy', async () => {
            jest.spyOn(BotTokenHandler, 'handleFreeTokenAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPickUpCardHandler, 'emptyHandPickUpOrDrawCard').mockResolvedValueOnce(true);

            await BotService.takeTurn(gameState.id, playerA.id);

            expect(BotPickUpCardHandler.emptyHandPickUpOrDrawCard).toHaveBeenCalled();
        });

        it('should call BotPlayBandHandler.playSingleOrc if all precedeing actions were falsy', async () => {
            jest.spyOn(BotTokenHandler, 'handleFreeTokenAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPickUpCardHandler, 'emptyHandPickUpOrDrawCard').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playSingleOrc').mockResolvedValueOnce(true);

            await BotService.takeTurn(gameState.id, playerA.id);

            expect(BotPlayBandHandler.playSingleOrc).toHaveBeenCalled();
        });

        it('should call BotPlayBandHandler.playBestBandAction if all precedeing actions were falsy', async () => {
            jest.spyOn(BotTokenHandler, 'handleFreeTokenAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPickUpCardHandler, 'emptyHandPickUpOrDrawCard').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playSingleOrc').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playBestBandAction').mockResolvedValueOnce(true);

            await BotService.takeTurn(gameState.id, playerA.id);

            expect(BotPlayBandHandler.playBestBandAction).toHaveBeenCalled();
        });

        it('should call BotPlayBandHandler.playHighValueBandAction if all precedeing actions were falsy', async () => {
            jest.spyOn(BotTokenHandler, 'handleFreeTokenAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPickUpCardHandler, 'emptyHandPickUpOrDrawCard').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playSingleOrc').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playBestBandAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playHighValueBandAction').mockResolvedValueOnce(true);

            await BotService.takeTurn(gameState.id, playerA.id);

            expect(BotPlayBandHandler.playHighValueBandAction).toHaveBeenCalled();
        });

        it('should call BotPickUpCardHandler.pickUpOrDrawCard if all precedeing actions were falsy', async () => {
            jest.spyOn(BotTokenHandler, 'handleFreeTokenAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPickUpCardHandler, 'emptyHandPickUpOrDrawCard').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playSingleOrc').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playBestBandAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playHighValueBandAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPickUpCardHandler, 'pickUpOrDrawCard').mockResolvedValueOnce(true);

            await BotService.takeTurn(gameState.id, playerA.id);

            expect(BotPickUpCardHandler.pickUpOrDrawCard).toHaveBeenCalled();
        });

        it('should call BotPlayBandHandler.playBandFallbackAction if all precedeing actions were falsy', async () => {
            jest.spyOn(BotTokenHandler, 'handleFreeTokenAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPickUpCardHandler, 'emptyHandPickUpOrDrawCard').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playSingleOrc').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playBestBandAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playHighValueBandAction').mockResolvedValueOnce(false);
            jest.spyOn(BotPickUpCardHandler, 'pickUpOrDrawCard').mockResolvedValueOnce(false);
            jest.spyOn(BotPlayBandHandler, 'playBandFallbackAction').mockResolvedValueOnce();

            await BotService.takeTurn(gameState.id, playerA.id);

            expect(BotPlayBandHandler.playBandFallbackAction).toHaveBeenCalled();
        });
    });
});
