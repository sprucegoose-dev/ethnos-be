import Game from '@models/game.model';
import Player from '@models/player.model';

import GameService from '@services/game/game.service';
import PlayerService from '@services/player/player.service';

import { TribeName } from '@interfaces/tribe.interface';
import { CardState } from '@interfaces/card.interface';
import { Color, IGameState } from '@interfaces/game.interface';

import { createGame, returnPlayerCardsToDeck } from '../test-helpers';
import TribeHandler from './tribe.handler';

describe('TribeHandler', () => {

    describe('handleGiantBand', () => {
        let gameId: number;
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

            await TribeHandler.handleGiantBand(gameId, playerA, 3);

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

            await TribeHandler.handleGiantBand(gameId, playerA, 2);

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
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.TROLL,
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

            await TribeHandler.handleWizardDraw(gameState, player, 3);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

            expect(cardsInHand.length).toBe(3);
        });
    });
});
