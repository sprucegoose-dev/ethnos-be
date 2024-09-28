import Game from '@models/game.model';
import Player from '@models/player.model';

import GameService from '@services/game/game.service';

import { TribeName } from '@interfaces/tribe.interface';
import { Color, IGameState } from '@interfaces/game.interface';

import { createGame, returnPlayerCardsToDeck } from '../test-helpers';
import ScoringService from './scoring.service';
import { CardState } from '@interfaces/card.interface';
import Region from '../../models/region.model';
import PlayerRegion from '../../models/player_region.model';

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

        afterEach(async () => await Game.truncate());

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

        afterEach(async () => await Game.truncate());

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

        afterEach(async () => await Game.truncate());

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

    describe('scoreGiantToken', () => {
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;

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
            playerD = result.playerD;
        });

        afterEach(async () => await Game.truncate());

        it('it should return the points for the player with the largest giant band', () => {
            playerA.giantTokenValue = 4;
            playerB.giantTokenValue = 5;
            playerC.giantTokenValue = 3;
            playerD.giantTokenValue = 0;
            const age = 2;
            const giantScore = ScoringService.scoreGiantToken([playerA, playerB, playerC, playerD], age);
            const expectedPoints = 4;
            expect(giantScore).toEqual({ playerId: playerB.id, points: expectedPoints });
        });

        it('should return null if no player has played a giant band', () => {
            playerA.giantTokenValue = 0;
            playerB.giantTokenValue = 0;
            playerC.giantTokenValue = 0;
            playerD.giantTokenValue = 0;
            const age = 2;
            const giantScore = ScoringService.scoreGiantToken([playerA, playerB, playerC, playerD], age);
            expect(giantScore).toEqual(null);
        });
    });

    describe('scoreRegion', () => {
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;
        let gameId: number;
        let playerARegion: PlayerRegion;
        let playerBRegion: PlayerRegion;
        let playerCRegion: PlayerRegion;
        let playerDRegion: PlayerRegion;
        let trollTokenTotals: { [playerId: number]: number };

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
            playerD = result.playerD;
            gameId = result.gameId;

            trollTokenTotals = {
                [playerA.id]: 0,
                [playerB.id]: 0,
                [playerC.id]: 0,
                [playerD.id]: 0,
            };
        });

        afterEach(async () => await Game.truncate());

        it('should give the player with the most tokens in a region the highest point value for that region (age: 1)', async () => {
            const region = await Region.findOne({
                where: {
                    gameId
                }
            });

            const trollTokenTotals = {
                [playerA.id]: 0,
                [playerB.id]: 0,
                [playerC.id]: 0,
                [playerD.id]: 0,
            };

            const gameAge = 1;

            playerARegion = await PlayerRegion.create({
                playerId: playerA.id,
                regionId: region.id,
                tokens: 4
            });

            playerBRegion = await PlayerRegion.create({
                playerId: playerB.id,
                regionId: region.id,
                tokens: 1
            });

            playerCRegion = await PlayerRegion.create({
                playerId: playerC.id,
                regionId: region.id,
                tokens: 2,
            });

            region.values = [2, 6, 10];

            const totalPoints = ScoringService.scoreRegion(region, [playerARegion, playerBRegion, playerCRegion], trollTokenTotals, gameAge);

            expect(totalPoints).toEqual({ [playerA.id]: region.values[0] });
        });

        it('should give the 1st, 2nd, and 3rd players with the most tokens in a region points (age: 3)', async () => {
            const region = await Region.findOne({
                where: {
                    gameId
                }
            });

            const gameAge = 3;

            playerARegion = await PlayerRegion.create({
                playerId: playerA.id,
                regionId: region.id,
                tokens: 4
            });

            playerBRegion = await PlayerRegion.create({
                playerId: playerB.id,
                regionId: region.id,
                tokens: 1
            });

            playerCRegion = await PlayerRegion.create({
                playerId: playerC.id,
                regionId: region.id,
                tokens: 2,
            });

            playerDRegion = await PlayerRegion.create({
                playerId: playerD.id,
                regionId: region.id,
                tokens: 5,
            });

            region.values = [2, 6, 10];

            const totalPoints = ScoringService.scoreRegion(region, [
                playerARegion,
                playerBRegion,
                playerCRegion,
                playerDRegion
            ], trollTokenTotals, gameAge);

            expect(totalPoints).toEqual({
                [playerC.id]: region.values[0],
                [playerA.id]: region.values[1],
                [playerD.id]: region.values[2]
            });
        });

        it('should combine and split region points when players are tied (age: 3) (example 1)', async () => {
            const region = await Region.findOne({
                where: {
                    gameId
                }
            });

            const gameAge = 3;

            playerARegion = await PlayerRegion.create({
                playerId: playerA.id,
                regionId: region.id,
                tokens: 5
            });

            playerBRegion = await PlayerRegion.create({
                playerId: playerB.id,
                regionId: region.id,
                tokens: 1
            });

            playerCRegion = await PlayerRegion.create({
                playerId: playerC.id,
                regionId: region.id,
                tokens: 2,
            });

            playerDRegion = await PlayerRegion.create({
                playerId: playerD.id,
                regionId: region.id,
                tokens: 5,
            });

            region.values = [2, 6, 10];

            const totalPoints = ScoringService.scoreRegion(region, [
                playerARegion,
                playerBRegion,
                playerCRegion,
                playerDRegion
            ], trollTokenTotals, gameAge);

            expect(totalPoints).toEqual({
                [playerC.id]: 2,
                [playerA.id]: 8,
                [playerD.id]: 8
            });
        });

        it('should combine and split region points when players are tied (age: 3) (example 2)', async () => {
            const region = await Region.findOne({
                where: {
                    gameId
                }
            });

            const gameAge = 3;

            playerARegion = await PlayerRegion.create({
                playerId: playerA.id,
                regionId: region.id,
                tokens: 5
            });

            playerBRegion = await PlayerRegion.create({
                playerId: playerB.id,
                regionId: region.id,
                tokens: 5
            });

            playerCRegion = await PlayerRegion.create({
                playerId: playerC.id,
                regionId: region.id,
                tokens: 2,
            });

            playerDRegion = await PlayerRegion.create({
                playerId: playerD.id,
                regionId: region.id,
                tokens: 5,
            });

            region.values = [2, 6, 10];

            const totalPoints = ScoringService.scoreRegion(region, [
                playerARegion,
                playerBRegion,
                playerCRegion,
                playerDRegion
            ], trollTokenTotals, gameAge);

            expect(totalPoints).toEqual({
                [playerA.id]: 6,
                [playerB.id]: 6,
                [playerD.id]: 6
            });
        });
    });

    describe('scoreMerfolkTrack', () => {
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;
        let gameState: IGameState;

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
            playerD = result.playerD;
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it('it should return the points for the player with the largest giant band', () => {
            playerA.merfolkTrackScore = 2;
            playerB.merfolkTrackScore = 8;
            playerC.merfolkTrackScore = 5;
            playerD.merfolkTrackScore = 4;
            gameState.players = [playerA, playerB, playerC, playerD];
            gameState.age = 1;
            const trollTokenTotals = ScoringService.getTrollTokenTotals(gameState.players);
            const merfolkScore = ScoringService.scoreMerfolkTrack(gameState, trollTokenTotals);
            expect(merfolkScore).toEqual({ [playerB.id]: 1 });
        });

        it('should break ties based on troll tokens', () => {
            playerA.merfolkTrackScore = 8;
            playerA.trollTokens = [4,1];

            playerB.merfolkTrackScore = 8;
            playerB.trollTokens = [2];

            playerC.merfolkTrackScore = 3;
            playerD.merfolkTrackScore = 2;
            gameState.players = [playerA, playerB, playerC, playerD];
            gameState.age = 1;
            const trollTokenTotals = ScoringService.getTrollTokenTotals(gameState.players);
            const merfolkScore = ScoringService.scoreMerfolkTrack(gameState, trollTokenTotals);
            expect(merfolkScore).toEqual({ [playerA.id]: 1 });
        });

        it('should split the points if players are tied', () => {
            playerA.merfolkTrackScore = 6;
            playerB.merfolkTrackScore = 6;
            playerC.merfolkTrackScore = 6;
            playerD.merfolkTrackScore = 2;
            gameState.players = [playerA, playerB, playerC, playerD];
            gameState.age = 3;
            const trollTokenTotals = ScoringService.getTrollTokenTotals(gameState.players);
            const merfolkScore = ScoringService.scoreMerfolkTrack(gameState, trollTokenTotals);
            expect(merfolkScore).toEqual({ [playerA.id]: 1, [playerB.id]: 1, [playerC.id]: 1 });
        });

        it("should return 'null' if Merfolk are not in the game", () => {
            gameState.settings = {
                tribes: [
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.SKELETON,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.TROLL,
                ]
            }
            gameState.age = 3;
            const trollTokenTotals = ScoringService.getTrollTokenTotals(gameState.players);
            const merfolkScore = ScoringService.scoreMerfolkTrack(gameState, trollTokenTotals);
            expect(merfolkScore).toBe(null);
        });
    });
});
