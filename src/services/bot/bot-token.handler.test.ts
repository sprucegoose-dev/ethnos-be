import { Op } from 'sequelize';

import Game from '@models/game.model';
import Player from '@models/player.model';
import Region from '@models/region.model';
import NextAction from '@models/nextAction.model';
import PlayerRegion from '@models/player_region.model';

import { ActionType } from '@interfaces/action.interface';

import {
    createGame,
} from '../test-helpers';

import BotTokenHandler from './bot-token.handler';

describe('BotTokenHandler', () => {

    describe('addFreeTokenToRegion', () => {
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

            await BotTokenHandler.addFreeTokenToRegion(playerA, updatedRegions, freeAddTokenAction.id);

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

            await BotTokenHandler.addFreeTokenToRegion(playerA, updatedRegions, freeAddTokenAction.id);

            const updatedPlayerRegion = await PlayerRegion.findOne({
                where: {
                    playerId: playerA.id,
                    regionId: regions[0].id,
                }
            });

            expect(updatedPlayerRegion.tokens).toBe(1);
        });
    });
});