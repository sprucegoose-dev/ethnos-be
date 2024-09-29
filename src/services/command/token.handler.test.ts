import Game from '@models/game.model';

import GameService from '@services/game/game.service';

import { Color, IGameState } from '@interfaces/game.interface';

import { ERROR_BAD_REQUEST, ERROR_NOT_FOUND } from '@helpers/exception_handler';

import {
    createGame,
} from '../test-helpers';

import TokenHandler from './token.handler';
import { ActionType, IAddFreeTokenPayload } from '../../interfaces/action.interface';
import NextAction from '../../models/nextAction.model';
import { NextActionState } from '../../interfaces/nextAction.interface';
import PlayerRegion from '../../models/player_region.model';
import Region from '../../models/region.model';

describe('TokenHandler', () => {
    describe('addFreeTokenToRegion', () => {
        let gameId: number;
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameId = result.gameId;
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it("should throw an error if there is no pending 'add_free_token' action", async () => {
            const updatedGame = await GameService.getState(gameId);

            const player = updatedGame.players.find(player => player.id === gameState.activePlayerId);

            const payload: IAddFreeTokenPayload = {
                nextActionId: 1,
                regionColor: Color.BLUE,
                type: ActionType.ADD_FREE_TOKEN,
            };

            try {
                await TokenHandler.addFreeTokenToRegion(gameState, player, payload);
                throw new Error('Expected error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('A free token can be added only as an additional action');
            }
        });

        it("should throw an error if the region is not found", async () => {
            const updatedGame = await GameService.getState(gameId);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            const nextAction = await NextAction.create({
                state: NextActionState.PENDING,
                gameId,
                playerId: activePlayer.id,
                type: ActionType.ADD_FREE_TOKEN
            });

            const payload: IAddFreeTokenPayload = {
                nextActionId: nextAction.id,
                regionColor: 'Invalid color' as Color,
                type: ActionType.ADD_FREE_TOKEN,
            };

            try {
                await TokenHandler.addFreeTokenToRegion(gameState, activePlayer, payload);
                throw new Error('Expected error not to be thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Region not found');
            }
        });

        it("adds a first token to a region if a player does not already have tokens in that region", async () => {
            const updatedGame = await GameService.getState(gameId);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            const nextAction = await NextAction.create({
                state: NextActionState.PENDING,
                gameId,
                playerId: activePlayer.id,
                type: ActionType.ADD_FREE_TOKEN
            });

            const payload: IAddFreeTokenPayload = {
                nextActionId: nextAction.id,
                regionColor: Color.GRAY,
                type: ActionType.ADD_FREE_TOKEN,
            };

            await TokenHandler.addFreeTokenToRegion(gameState, activePlayer, payload);

            const region = await Region.findOne({
                where: {
                    color: Color.GRAY,
                    gameId,
                }
            });

            const playerRegion = await PlayerRegion.findOne({
                where: {
                    playerId: activePlayer.id,
                    regionId: region.id,
                }
            });

            expect(playerRegion.tokens).toBe(1);
        });

        it("adds am additional token to a region if a player already has tokens in that region", async () => {
            const updatedGame = await GameService.getState(gameId);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            const nextAction = await NextAction.create({
                state: NextActionState.PENDING,
                gameId,
                playerId: activePlayer.id,
                type: ActionType.ADD_FREE_TOKEN
            });

            const payload: IAddFreeTokenPayload = {
                nextActionId: nextAction.id,
                regionColor: Color.GRAY,
                type: ActionType.ADD_FREE_TOKEN,
            };

            const region = await Region.findOne({
                where: {
                    color: Color.GRAY,
                    gameId,
                }
            });

            await PlayerRegion.create({
                playerId: activePlayer.id,
                regionId: region.id,
                tokens: 2
            });


            await TokenHandler.addFreeTokenToRegion(gameState, activePlayer, payload);

            const playerRegion = await PlayerRegion.findOne({
                where: {
                    playerId: activePlayer.id,
                    regionId: region.id,
                }
            });

            expect(playerRegion.tokens).toBe(3);
        });
    });

});
