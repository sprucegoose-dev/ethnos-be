import Player from '@models/player.model';
import PlayerRegion from '@models/player_region.model';
import Region from '@models/region.model';
import Game from '@models/game.model';

import {
    IGameState
} from '@interfaces/game.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { CardState } from '@interfaces/card.interface';
import { ActionType, IPlayBandPayload } from '@interfaces/action.interface';

import ScoringService from '@services/scoring/scoring.service';

import {
    // assignCardsToPlayer,
    createGame,
    // returnPlayerCardsToDeck,
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

            const canAddToken = BotPlayBandHandler.canAddTokenToRegion(updatedRegion, bandDetails, playerA);

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

            const canAddToken = BotPlayBandHandler.canAddTokenToRegion(updatedRegion, bandDetails, playerA);

            expect(canAddToken).toBe(false);
        });
    });

    describe('getRegionIfUpgradeable', () => {
        let playerA: Player;
        let gameState: IGameState;
        let regions: Region[];

        beforeEach(async () => {
            const result = await createGame();

            playerA = result.playerA;
            gameState = result.gameState;
            regions = result.gameState.regions;
        });

        afterEach(async () => await Game.truncate());

        it('should return the region if a token can be added to it', async () => {
            const cardsInHand = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.color === regions[0].color
            ).slice(0, 3);

            const playBandAction: IPlayBandPayload = {
                type: ActionType.PLAY_BAND,
                cardIds: cardsInHand.map(card => card.id),
                leaderId: cardsInHand[0].id,
            };


            await PlayerRegion.create({
                playerId: playerA.id,
                regionId: regions[0].id,
                tokens: 2
            });

            const region = await Region.findOne({
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

            const result = BotPlayBandHandler.getRegionIfUpgradeable(playBandAction, cardsInHand, [region], playerA);

            expect(result.id).toBe(regions[0].id);
        });
    });
});
