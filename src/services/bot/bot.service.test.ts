import Game from '@models/game.model';
import Player from '@models/player.model';
import Region from '@models/region.model';

import {
    createGame,
} from '../test-helpers';

import BotService from './bot.service';
import PlayerRegion from '../../models/player_region.model';
import ScoringService from '../scoring/scoring.service';
import { TribeName } from '../../interfaces/tribe.interface';

describe('BotService', () => {

    describe('canAddTokenToRegion', () => {
        let playerA: Player;
        let regions: Region[];

        beforeEach(async () => {
            const result = await createGame();

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
