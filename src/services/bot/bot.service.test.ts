import Game from '@models/game.model';
import Player from '@models/player.model';
import Region from '@models/region.model';

import {
    createGame,
} from '../test-helpers';

import BotService from './bot.service';
import NextAction from '../../models/nextAction.model';
import { ActionType } from '../../interfaces/action.interface';
import PlayerRegion from '../../models/player_region.model';
import { Op } from 'sequelize';
import ScoringService from '../scoring/scoring.service';
import { TribeName } from '../../interfaces/tribe.interface';

describe('BotService', () => {
    describe('addTokenToRegion', () => {
        let gameId: number;
        let playerA: Player;
        let regions: Region[];

        beforeEach(async () => {
            const result = await createGame();

            gameId = result.gameId;
            playerA = result.playerA;
            regions = result.gameState.regions;
        });

        afterEach(async () => await Game.truncate());

        it("should add a free token to the region a player has the most tokens in if multiple regions have an equal high value", async () => {
            const freeAddTokenAction = await NextAction.create({
                gameId,
                playerId: playerA.id,
                type: ActionType.ADD_FREE_TOKEN,
            });

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameId,
                }
            });

            await Region.update({
                values: [8, 10, 10]
            }, {
                where: {
                    id: {
                        [Op.in]: [
                            regions[0].id,
                            regions[1].id
                        ]
                    }
                }
            });

            const updatedRegions = await Region.findAll({
                where: {
                    gameId,
                },
                include: [
                    {
                        model: PlayerRegion,
                        as: 'playerTokens'
                    }
                ]
            });

            await PlayerRegion.create({
                playerId: playerA.id,
                regionId: regions[0].id,
                tokens: 1
            });

            await BotService.addFreeTokenToRegion(playerA, updatedRegions, freeAddTokenAction.id);

            const updatedRegion = await PlayerRegion.findOne({
                where: {
                    playerId: playerA.id,
                    regionId: regions[0].id,
                }
            });

            expect(updatedRegion.tokens).toBe(2);
        });

        it("should add a free token to the region with the highest combined point value", async () => {
            const freeAddTokenAction = await NextAction.create({
                gameId,
                playerId: playerA.id,
                type: ActionType.ADD_FREE_TOKEN,
            });

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameId,
                }
            });

            await Region.update({
                values: [8, 10, 10]
            }, {
                where: {
                    id: regions[0].id
                }
            });

            const updatedRegions = await Region.findAll({
                where: {
                    gameId,
                },
                include: [
                    {
                        model: PlayerRegion,
                        as: 'playerTokens'
                    }
                ]
            });

            const playerRegion = await PlayerRegion.findOne({
                where: {
                    playerId: playerA.id,
                    regionId: regions[0].id,
                }
            });

            expect(playerRegion).toBe(null);

            await BotService.addFreeTokenToRegion(playerA, updatedRegions, freeAddTokenAction.id);

            const updatedPlayerRegion = await PlayerRegion.findOne({
                where: {
                    playerId: playerA.id,
                    regionId: regions[0].id,
                }
            });

            expect(updatedPlayerRegion.tokens).toBe(1);
        });
    });

    describe('canAddTokenToRegion', () => {
        // let gameId: number;
        let playerA: Player;
        let regions: Region[];

        beforeEach(async () => {
            const result = await createGame();

            // gameId = result.gameId;
            playerA = result.playerA;
            regions = result.gameState.regions;
        });

        afterEach(async () => await Game.truncate());

        it("should return true if a player's band is large enough to add a token to a region", async () => {
            await PlayerRegion.create({
                playerId: playerA.id,
                regionId: regions[0].id,
                tokens: 2
            });

            const updatedRegion = await Region.findOne({
                where: {
                    id: regions[0].id
                },
                include: [
                    {
                        model: PlayerRegion,
                        as: 'playerTokens'
                    }
                ]
            });

            const bandDetails = {
                color: regions[0].color,
                bandSize: 3,
                tribe: TribeName.TROLLS,
                points: ScoringService.getBandPoints(3),
            }

            const canAddToken = BotService.canAddTokenToRegion(updatedRegion, bandDetails, playerA);

            expect(canAddToken).toBe(true);
        });

        it("should return false if a player's band is NOT large enough to add a token to a region", async () => {
            await PlayerRegion.create({
                playerId: playerA.id,
                regionId: regions[0].id,
                tokens: 2
            });

            const updatedRegion = await Region.findOne({
                where: {
                    id: regions[0].id
                },
                include: [
                    {
                        model: PlayerRegion,
                        as: 'playerTokens'
                    }
                ]
            });

            const bandDetails = {
                color: regions[0].color,
                bandSize: 2,
                tribe: TribeName.TROLLS,
                points: ScoringService.getBandPoints(3),
            }

            const canAddToken = BotService.canAddTokenToRegion(updatedRegion, bandDetails, playerA);

            expect(canAddToken).toBe(false);
        });
    });
});
