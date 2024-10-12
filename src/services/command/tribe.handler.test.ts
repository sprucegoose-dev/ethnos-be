import Game from '@models/game.model';
import Player from '@models/player.model';
import NextAction from '@models/nextAction.model';

import GameService from '@services/game/game.service';
import PlayerService from '@services/player/player.service';

import { TribeName } from '@interfaces/tribe.interface';
import { CardState } from '@interfaces/card.interface';
import { Color, IGameState } from '@interfaces/game.interface';
import { NextActionState } from '@interfaces/next-action.interface';
import { ActionType } from '@interfaces/action.interface';

import { createGame, returnPlayerCardsToDeck } from '../test-helpers';
import TribeHandler from './tribe.handler';
import PlayBandHandler from './play-band.handler';

describe('TribeHandler', () => {

    describe('handleGiantBand', () => {
        let playerA: Player;
        let playerB: Player;

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });
            playerA = result.playerA;
            playerB = result.playerB;
        });

        afterEach(async () => await Game.truncate());

        it("should increment a player's 'giant token value' and give them 2 points if they've played the largest giant band so far", async () => {
            await Player.update({
                giantTokenValue: 2
            }, {
                where: {
                    id: playerB.id
                }
            });

            await TribeHandler.handleGiantBand(playerA, 3);

            const updatedPlayer = await Player.findOne({
                where: {
                    id: playerA.id
                }
            });

            expect(updatedPlayer.giantTokenValue).toEqual(3);
            expect(updatedPlayer.points).toEqual(2);
        });

        it("should do nothing if a player has not played the largest giant band", async () => {
            await Player.update({
                giantTokenValue: 4
            }, {
                where: {
                    id: playerB.id
                }
            });

            await TribeHandler.handleGiantBand(playerA, 2);

            const updatedPlayer = await Player.findOne({
                where: {
                    id: playerA.id
                }
            });

            expect(updatedPlayer.giantTokenValue).toEqual(0);
            expect(updatedPlayer.points).toEqual(0);
        });
    });

    describe('handleOrcTokens', () => {
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });
            playerA = result.playerA;
        });

        afterEach(async () => await Game.truncate());

        it("should add a color to a player's orc board if they don't already have that color", async () => {
            await TribeHandler.handleOrcTokens(playerA, Color.ORANGE);

            const updatedPlayer = await Player.findOne({
                where: {
                    id: playerA.id
                }
            });

            expect(updatedPlayer.orcTokens).toEqual([Color.ORANGE]);
        });

        it("should do nothing if a player already has the specified color in their orc board", async () => {
            await Player.update({
                orcTokens: [Color.ORANGE, Color.BLUE, Color.PURPLE]
            }, {
                where: {
                    id: playerA.id
                }
            });

            let updatedPlayer = await Player.findOne({
                where: {
                    id: playerA.id
                }
            });

            await TribeHandler.handleOrcTokens(updatedPlayer, Color.BLUE);

            updatedPlayer = await Player.findOne({
                where: {
                    id: playerA.id
                }
            });

            expect(updatedPlayer.orcTokens).toEqual([Color.ORANGE, Color.BLUE, Color.PURPLE]);
        });
    });

    describe('handleMerfolkTrack', () => {
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });
            playerA = result.playerA;
        });

        afterEach(async () => await Game.truncate());

        it("should update a player's Merfolk Track Score", async () => {
            await TribeHandler.handleMerfolkTrack(playerA, 2);

            const updatedPlayer = await Player.findOne({
                where: {
                    id: playerA.id
                }
            });

            expect(updatedPlayer.merfolkTrackScore).toBe(2);
        });


        it("should give a player an 'add free token' action if a player has reached a checkpoint on the Merfolk Track", async () => {
            await TribeHandler.handleMerfolkTrack(playerA, 3);

            const nextAction = await NextAction.findOne({
                where: {
                    playerId: playerA.id,
                    state: NextActionState.PENDING,
                    type: ActionType.ADD_FREE_TOKEN,
                }
            });

            expect(nextAction).not.toBeNull();
        });
    });

    describe('handleTribeLogic', () => {
        afterEach(async () => await Game.truncate());

        it("should call 'handleOrcTokens' with the correct parameters", async () => {
            const {
                gameState,
                playerA,
            } = await createGame({
                tribes: [
                    TribeName.ORCS,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });

            const orcBand = gameState.cards.filter(card => card.tribe.name === TribeName.ORCS).slice(0, 3);

            const leader = orcBand[0];

            const bandDetails = PlayBandHandler.getBandDetails(leader, orcBand.map(card => card.id));

            const handleOrcTokenSpy = jest.spyOn(TribeHandler, 'handleOrcTokens');

            await TribeHandler.handleTribeLogic(gameState, playerA, bandDetails);

            expect(handleOrcTokenSpy).toHaveBeenCalledWith(playerA, leader.color)
        });

        it("should call 'handleGiantBand' with the correct parameters", async () => {
            const {
                gameState,
                playerA,
            } = await createGame({
                tribes: [
                    TribeName.GIANTS,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });

            const giantBand = gameState.cards.filter(card => card.tribe.name === TribeName.GIANTS).slice(0, 3);

            const leader = giantBand[0];

            const bandDetails = PlayBandHandler.getBandDetails(leader, giantBand.map(card => card.id));

            const handleGiantBandSpy = jest.spyOn(TribeHandler, 'handleGiantBand');

            await TribeHandler.handleTribeLogic(gameState, playerA, bandDetails);

            expect(handleGiantBandSpy).toHaveBeenCalledWith(playerA, bandDetails.bandSize);
        });

        it("should call 'handleMerfolkTrack' with the correct parameters", async () => {
            const {
                gameState,
                playerA,
            } = await createGame({
                tribes: [
                    TribeName.MERFOLK,
                    TribeName.MINOTAURS,
                    TribeName.DWARVES,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });

            const merfolkBand = gameState.cards.filter(card => card.tribe.name === TribeName.MERFOLK).slice(0, 3);

            const leader = merfolkBand[0];

            const bandDetails = PlayBandHandler.getBandDetails(leader, merfolkBand.map(card => card.id));

            const handleMerfolkTrackSpy = jest.spyOn(TribeHandler, 'handleMerfolkTrack');

            await TribeHandler.handleTribeLogic(gameState, playerA, bandDetails);

            expect(handleMerfolkTrackSpy).toHaveBeenCalledWith(playerA, bandDetails.bandSize);
        });

        it("should call 'handleWizardDraw' with the correct parameters", async () => {
            const {
                gameState,
                playerA,
            } = await createGame({
                tribes: [
                    TribeName.WIZARDS,
                    TribeName.MINOTAURS,
                    TribeName.DWARVES,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });

            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);

            const wizardBand = gameState.cards.filter(card => card.tribe.name === TribeName.WIZARDS).slice(0, 3);

            const leader = wizardBand[0];

            const bandDetails = PlayBandHandler.getBandDetails(leader, wizardBand.map(card => card.id));

            const handleWizardDrawSpy = jest.spyOn(TribeHandler, 'handleWizardDraw');

            await TribeHandler.handleTribeLogic(gameState, updatedPlayer, bandDetails);

            expect(handleWizardDrawSpy).toHaveBeenCalledWith(gameState, updatedPlayer, bandDetails.bandSize);
        });

        it("should call 'handleTrollTokens' with the correct parameters", async () => {
            const {
                gameState,
                playerA,
            } = await createGame({
                tribes: [
                    TribeName.TROLLS,
                    TribeName.WIZARDS,
                    TribeName.MINOTAURS,
                    TribeName.DWARVES,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                ]
            });

            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);

            const trollBand = gameState.cards.filter(card => card.tribe.name === TribeName.TROLLS).slice(0, 3);

            const leader = trollBand[0];

            const bandDetails = PlayBandHandler.getBandDetails(leader, trollBand.map(card => card.id));

            const handleTrollTokensSpy = jest.spyOn(TribeHandler, 'handleTrollTokens');

            await TribeHandler.handleTribeLogic(gameState, updatedPlayer, bandDetails);

            expect(handleTrollTokensSpy).toHaveBeenCalledWith(gameState, updatedPlayer, bandDetails.bandSize);
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
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });
            gameId = result.gameId;
            playerA = result.playerA;
            playerB = result.playerB;
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it('should assign a troll token equal to the size of the band played, if available', async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            await TribeHandler.handleTrollTokens(gameState, player, 5);

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

            await TribeHandler.handleTrollTokens(gameState, player, 5);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.trollTokens).toEqual([4]);
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

        afterEach(async () => await Game.truncate());

        it('should draw cards equal to the size of the band played', async () => {
            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            const bandSize = 3;

            await TribeHandler.handleWizardDraw(gameState, player, bandSize);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

            expect(cardsInHand.length).toBe(3);
        });
    });
});
