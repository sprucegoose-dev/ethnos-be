import Game from '@models/game.model';
import Card from '@models/card.model';
import Player from '@models/player.model';

import GameService from '@services/game/game.service';

import { TribeName } from '@interfaces/tribe.interface';
import { Color, IGameState } from '@interfaces/game.interface';

import { createGame, returnPlayerCardsToDeck } from '../test-helpers';
import ScoringService from './scoring.service';
import { CardState } from '../../interfaces/card.interface';

describe('ScoringService', () => {

    describe('groupCardsByLeader', () => {
        let gameId: number;
        let gameState: IGameState;
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
            gameId = result.gameId;
            playerA = result.playerA;
            gameState = result.gameState;
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it('should return cards grouped by the leader ID', async () => {
            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const bandA = gameState.cards.filter(card =>
                card.tribe.name === TribeName.CENTAUR &&
                card.color !== Color.ORANGE &&
                !card.playerId
            ).slice(0, 3);

            const bandB = gameState.cards.filter(card =>
                card.color === Color.ORANGE &&
                !card.playerId
            ).slice(0, 5);

            bandA.map(card => card.leaderId = bandA[0].id);
            bandB.map(card => card.leaderId = bandB[0].id);

            const groupedCards = await ScoringService.groupCardsByLeader([...bandA, ...bandB]);

            expect(groupedCards[bandA[0].id].length).toBe(3);
            expect(groupedCards[bandB[0].id].length).toBe(5);
        });

    });

    describe('getTrollTokenTotals', () => {
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;

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
            playerB = result.playerB;
            playerC = result.playerC;
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it('returns the total sum of troll tokens for each player', () => {
            playerA.trollTokens = [2, 3];
            playerB.trollTokens = [4];
            playerC.trollTokens = [1, 5];

            const trollTokenTotals = ScoringService.getTrollTokenTotals([playerA, playerB, playerC]);

            expect(trollTokenTotals[playerA.id]).toBe(5);
            expect(trollTokenTotals[playerB.id]).toBe(4);
            expect(trollTokenTotals[playerC.id]).toBe(6);
        });
    });

    describe('scoreBands', () => {
        let playerA: Player;
        let gameState: IGameState
        let gameId: number;

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
            gameState = result.gameState;
            gameId = result.gameId;
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it("returns the total points for a player's bands", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            // 3 points
            const bandA = gameState.cards.filter(card =>
                card.tribe.name === TribeName.CENTAUR &&
                card.color !== Color.ORANGE &&
                !card.playerId
            ).slice(0, 3);

            // 10 points
            const bandB = gameState.cards.filter(card =>
                card.color === Color.ORANGE &&
                card.tribe.name !== TribeName.DWARF &&
                !card.playerId
            ).slice(0, 5);

            // 6 points (dwarfs are +1 band size)
            const bandC = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARF &&
                card.color !== Color.ORANGE &&
                !card.playerId
            ).slice(0, 3);

            bandA.map(card => {
                card.leaderId = bandA[0].id;
                card.state = CardState.IN_BAND;
                card.playerId = playerA.id;
            });
            bandB.map(card => {
                card.leaderId = bandB[0].id;
                card.state = CardState.IN_BAND;
                card.playerId = playerA.id;
            });
            bandC.map(card => {
                card.leaderId = bandC[0].id;
                card.state = CardState.IN_BAND;
                card.playerId = playerA.id;
            });

            playerA.cards = [...bandA, ...bandB, ...bandC];

            const points = ScoringService.scoreBands(playerA);

            expect(points).toBe(19);
        });
    });
});
