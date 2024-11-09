import Player from '@models/player.model';
import PlayerRegion from '@models/player_region.model';
import Region from '@models/region.model';
import Game from '@models/game.model';

import {
    Color,
    IGameState
} from '@interfaces/game.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { CardState } from '@interfaces/card.interface';
import { ActionType, IPlayBandPayload } from '@interfaces/action.interface';

import ScoringService from '@services/scoring/scoring.service';

import {
    assignCardsToPlayer,
    // assignCardsToPlayer,
    createGame,
    returnPlayerCardsToDeck,
    // returnPlayerCardsToDeck,
} from '../test-helpers';
import BotPlayBandHandler from './bot-play-band.handler';
import GameService from '../game/game.service';
import ActionService from '../action/action.service';
import BotService from './bot.service';

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

        it("should return a region matching the action leader's color if a token can be added to it", async () => {
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

            const updatedRegions = await Region.findAll({
                where: {
                    gameId: gameState.id,
                },
                include: [
                    {
                        model: PlayerRegion,
                        as: 'playerTokens'
                    }
                ]
            });

            const region = BotPlayBandHandler.getRegionIfUpgradeable(playBandAction, cardsInHand, updatedRegions, playerA);

            expect(region.id).toBe(regions[0].id);
        });

        it("should return 'null' if a token cannot be added to the region matching the action leader's color", async () => {
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
                tokens: 4
            });

            const updatedRegions = await Region.findAll({
                where: {
                    gameId: gameState.id,
                },
                include: [
                    {
                        model: PlayerRegion,
                        as: 'playerTokens'
                    }
                ]
            });

            const region = BotPlayBandHandler.getRegionIfUpgradeable(playBandAction, cardsInHand, updatedRegions, playerA);

            expect(region).toBe(null);
        });

        it("should return 'true' if the leader is a Wingfolk a token can be added to a region not matching the leader's color", async () => {
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
                tokens: 4
            });

            const updatedRegions = await Region.findAll({
                where: {
                    gameId: gameState.id,
                },
                include: [
                    {
                        model: PlayerRegion,
                        as: 'playerTokens'
                    }
                ]
            });

            cardsInHand[0].tribe.name = TribeName.WINGFOLK;

            const region = BotPlayBandHandler.getRegionIfUpgradeable(playBandAction, cardsInHand, updatedRegions, playerA);

            expect(region.id).not.toBe(regions[0].id);
        });
    });

    describe('playHighValueBandAction', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();

            gameState = result.gameState;
            playerA = result.playerA;

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameState.id,
                }
            });
        });

        afterEach(async () => await Game.truncate());

        it('should play a band if its value is 10 points or more', async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const bandCards = gameState.cards.filter(card => card.color === Color.ORANGE).slice(0, 5);
            const otherCards = gameState.cards.filter(card => card.color !== Color.ORANGE &&
                card.tribe.name !== TribeName.DRAGON
            ).slice(0, 3);

            const cardsInHand = [...bandCards, ...otherCards];

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const actions = (await ActionService.getActions(gameState.id, playerA.userId))
                .filter(action => action.type === ActionType.PLAY_BAND);

            const result = await BotPlayBandHandler.playHighValueBandAction(actions, cardsInHand, playerA);

            const updatedGame = await GameService.getState(gameState.id);

            const updatedRegion = updatedGame.regions.find(region => region.color === Color.ORANGE);

            const playerTokensInRegion = updatedRegion.playerTokens.find(tokenData => tokenData.playerId === playerA.id);

            expect(result).toBe(true);
            expect(playerTokensInRegion.tokens).toBe(1);
        });

        it("should return 'false' if the player does not have a band worth 10 or more points in their hand", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const bandCards = gameState.cards.filter(card => card.color === Color.ORANGE).slice(0, 2);
            const otherCard = gameState.cards.find(card => card.color !== Color.ORANGE && card.tribe.name !== TribeName.DRAGON);

            const cardsInHand = [...bandCards, otherCard];

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const actions = (await ActionService.getActions(gameState.id, playerA.userId))
                .filter(action => action.type === ActionType.PLAY_BAND);

            const result = await BotPlayBandHandler.playHighValueBandAction(actions, cardsInHand, playerA);

            expect(result).toBe(false);
        });
    });

    describe('playBestBandAction', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();

            gameState = result.gameState;
            playerA = result.playerA;

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameState.id,
                }
            });
        });

        afterEach(async () => await Game.truncate());

        it('should play a band if it can add a token to a region', async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const bandCards = gameState.cards.filter(card => card.color === Color.ORANGE).slice(0, 5);
            const otherCards = gameState.cards.filter(card => card.color !== Color.ORANGE  && card.tribe.name !== TribeName.DRAGON).slice(0, 2);

            const cardsInHand = [...bandCards, ...otherCards];

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const actions = (await ActionService.getActions(gameState.id, playerA.userId))
                .filter(action => action.type === ActionType.PLAY_BAND);

            const sortedPlayBandActions = BotService.preSortBandActions(actions, cardsInHand);

            const result = await BotPlayBandHandler.playBestBandAction(sortedPlayBandActions, cardsInHand, gameState.regions, playerA);

            const updatedGame = await GameService.getState(gameState.id);

            const updatedRegion = updatedGame.regions.find(region => region.color === Color.ORANGE);

            const playerTokensInRegion = updatedRegion.playerTokens.find(tokenData => tokenData.playerId === playerA.id);

            expect(result).toBe(true);
            expect(playerTokensInRegion.tokens).toBe(1);
        });

        it("should return 'false' if the player does not have a band large enough in their hand to add a token to a region", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const cardsInHand = gameState.cards.filter(card =>
                card.state === CardState.IN_DECK &&
                card.tribe.name !== TribeName.DRAGON
            ).slice(0, 2);

            const cardIdsToAssign = cardsInHand.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            for (const region of gameState.regions) {
                await PlayerRegion.create({
                    playerId: playerA.id,
                    regionId: region.id,
                    tokens: 3
                });
            }

            const updatedGame = await GameService.getState(gameState.id);

            const actions = (await ActionService.getActions(gameState.id, playerA.userId))
                .filter(action => action.type === ActionType.PLAY_BAND);

            const sortedPlayBandActions = BotService.preSortBandActions(actions, cardsInHand);

            const result = await BotPlayBandHandler.playBestBandAction(sortedPlayBandActions, cardsInHand, updatedGame.regions, playerA);

            expect(result).toBe(false);
        });
    });

    describe('playSingleOrc', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.ORCS,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.GIANTS,
                ]
            });

            gameState = result.gameState;
            playerA = result.playerA;

            await Game.update({
                activePlayerId: playerA.id,
            }, {
                where: {
                    id: gameState.id,
                }
            });
        });

        afterEach(async () => await Game.truncate());

        it('should play a band with a single Orc if the player only has one card in their hand and have not claimed that Orc color yet', async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const orcCard = gameState.cards.find(card => card.color === Color.ORANGE && card.tribe.name === TribeName.ORCS);

            await assignCardsToPlayer(playerA.id, [orcCard.id]);

            const actions = (await ActionService.getActions(gameState.id, playerA.userId))
                .filter(action => action.type === ActionType.PLAY_BAND);

            const result = await BotPlayBandHandler.playSingleOrc(actions, [orcCard], playerA);

            const updatedGame = await GameService.getState(gameState.id);

            const updatedPlayer = updatedGame.players.find(player => player.id === playerA.id);

            expect(result).toBe(true);
            expect(updatedPlayer.orcTokens).toEqual([Color.ORANGE]);
        });

        it('should NOT play a band with a single Orc if the player only has one card in their hand and has already claimed that Orc color', async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const orcCard = gameState.cards.find(card => card.color === Color.ORANGE && card.tribe.name === TribeName.ORCS);

            await assignCardsToPlayer(playerA.id, [orcCard.id]);

            const actions = (await ActionService.getActions(gameState.id, playerA.userId))
                .filter(action => action.type === ActionType.PLAY_BAND);

            playerA.orcTokens = [Color.ORANGE];

            const result = await BotPlayBandHandler.playSingleOrc(actions, [orcCard], playerA);

            const updatedGame = await GameService.getState(gameState.id);

            const updatedPlayer = updatedGame.players.find(player => player.id === playerA.id);

            expect(result).toBe(false);
            expect(updatedPlayer.orcTokens).toEqual([]);
        });
    });
});
