import Player from '@models/player.model';
import PlayerRegion from '@models/player_region.model';
import Region from '@models/region.model';
import Game from '@models/game.model';

import {
    IGameState
} from '@interfaces/game.interface';

import {
    createGame,
} from '../test-helpers';
import BotPlayBandHandler from './bot-play-band.handler';


describe('BotPlayBandHandler', () => {

    describe('getPlayerTokensInRegion', () => {
        let playerA: Player;
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it('should return 0 if a player has no tokens in a region', () => {
            const result = BotPlayBandHandler.getPlayerTokensInRegion(gameState.regions[0], playerA)
            expect(result).toBe(0);
        });

        it("should return the count of a player's token in a region if a player has tokens in that region", async () => {
            await PlayerRegion.create({
                playerId: playerA.id,
                regionId: gameState.regions[0].id,
                tokens: 3
            });

            const region = await Region.findOne({
                where: {
                    id: gameState.regions[0].id,
                },
                include: {
                    model: PlayerRegion,
                    as: 'playerTokens'
                }
            })

            const result = BotPlayBandHandler.getPlayerTokensInRegion(region, playerA)
            expect(result).toBe(3);
        });
    });

    describe('getTotalRegionValue', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it('should return return the combined value of the points in a region', () => {
            const region = gameState.regions[0];
            region.values = [2, 4, 8];
            const totalRegionValue = BotPlayBandHandler.getTotalRegionValue(region)
            expect(totalRegionValue).toBe(14);
        });
    });
});
