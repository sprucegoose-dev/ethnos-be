import {
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND
} from '@helpers/exception-handler';

import Game from '@models/game.model';
import Player from '@models/player.model';
import PlayerService from '../player/player.service';
import PlayerRegion from '@models/player_region.model';
import Region from '@models/region.model';
import NextAction from '@models/nextAction.model';

import GameService from '@services/game/game.service';

import { CardState } from '@interfaces/card.interface';
import { Color, IGameState } from '@interfaces/game.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { NextActionState } from '@interfaces/next-action.interface';
import { ActionType, IActionPayload, IPlayBandPayload } from '@interfaces/action.interface';

import CommandService from './command.service';
import { assignCardsToPlayer, createGame, returnPlayerCardsToDeck } from '../test-helpers';
import {
    UNEXPECTED_ERROR_MSG,
    userA,
} from '@jest.setup';
import BotService from '../bot/bot.service';


describe('CommandService', () => {

    describe('handleAction', () => {
        let gameId: number;
        let playerA: Player;
        let playerB: Player;
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameId = result.gameId;
            playerA = result.playerA;
            playerB = result.playerB;
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it('should throw an error if the game was not found', async () => {
            const payload: IActionPayload = {
                type: ActionType.DRAW_CARD
            };

            try {
                await CommandService.handleAction(userA.id, 2, payload);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it('should throw an error if the player sending the action is not the active player', async () => {
            const payload: IActionPayload = {
                type: ActionType.DRAW_CARD
            };

            await Game.update({
                activePlayerId: playerA.id
            }, {
                where: {
                    id: gameId,
                }
            });

            try {
                await CommandService.handleAction(playerB.userId, gameId, payload);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('You are not the active player');
            }
        });

        it("should perform the 'handleDrawCard' action when the aciton is 'draw_card'", async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            const payload: IActionPayload = {
                type: ActionType.DRAW_CARD
            };

            await Game.update({
                activePlayerId: playerA.id
            }, {
                where: {
                    id: gameId,
                }
            });

            expect(player.cards.length).toBe(1);

            await CommandService.handleAction(playerA.userId, gameId, payload);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);
        });

        it("should perform the 'handlePlayBand' action when the aciton is 'play_band'", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardToAssign = gameState.cards.find(card =>
                card.tribe.name === TribeName.DWARVES &&
                !card.playerId
            );

            await assignCardsToPlayer(playerA.id, [cardToAssign.id]);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            const payload: IPlayBandPayload = {
                cardIds: player.cards.map(card => card.id),
                leaderId: player.cards[0].id,
                type: ActionType.PLAY_BAND
            };

            await Game.update({
                activePlayerId: playerA.id
            }, {
                where: {
                    id: gameId,
                }
            });

            expect(player.cards.length).toBe(1);

            await CommandService.handleAction(playerA.userId, gameId, payload);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(0);

            expect(player.cards[0].state).toBe(CardState.IN_BAND);

            const region = await Region.findOne({
                where: {
                    color: player.cards[0].color,
                }
            });

            const playerRegion = await PlayerRegion.findOne({
                where: {
                    playerId: player.id,
                    regionId: region.id,
                }
            });

            expect(playerRegion.tokens).toBe(1);
        });

        it("should perform the 'handlePickUpCard' action when the aciton is 'pick_up_card'", async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInMarket =  gameState.cards.filter(card => card.state === CardState.IN_MARKET);

            const payload: IActionPayload = {
                cardId: cardsInMarket[0].id,
                type: ActionType.PICK_UP_CARD
            };

            await Game.update({
                activePlayerId: playerA.id
            }, {
                where: {
                    id: gameId,
                }
            });

            expect(player.cards.length).toBe(1);

            await CommandService.handleAction(playerA.userId, gameId, payload);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);
            expect(player.cards.find(card => card.id === cardsInMarket[0].id)).not.toBeNull();
        });

        it("should perform the 'addFreeTokenToRegion' action when the aciton is 'add_free_token'", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            const nextAction = await NextAction.create({
                state: NextActionState.PENDING,
                gameId,
                playerId: playerA.id,
                type: ActionType.ADD_FREE_TOKEN
            });

            const payload: IActionPayload = {
                nextActionId: nextAction.id,
                regionColor: Color.RED,
                type: ActionType.ADD_FREE_TOKEN
            };

            await Game.update({
                activePlayerId: playerA.id
            }, {
                where: {
                    id: gameId,
                }
            });

            await CommandService.handleAction(playerA.userId, gameId, payload);

            const region = await Region.findOne({
                where: {
                    color: Color.RED
                }
            });

            const playerRegion = await PlayerRegion.findOne({
                where: {
                    playerId: playerA.id,
                    regionId: region.id,
                }
            });

            expect(playerRegion.tokens).toBe(1);
        });

        it("should assign the next player as the 'active player' if there are no pending actions", async () => {
            const payload: IActionPayload = {
                type: ActionType.DRAW_CARD
            };

            const nextPlayerId = GameService.getNextPlayerId(playerA.id, gameState.turnOrder);

            await Game.update({
                activePlayerId: playerA.id
            }, {
                where: {
                    id: gameId,
                }
            });

            await CommandService.handleAction(playerA.userId, gameId, payload);

            gameState = await GameService.getState(gameId);

            expect(gameState.activePlayerId).toBe(nextPlayerId);
        });

        it("should keep the same 'active player' if there is a pending 'next action'", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.CENTAURS &&
                !card.playerId
            ).slice(0, 5);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);
            const bandCards = cardsInHand.slice(0, 3);
            const bandCardIds = bandCards.map(card => card.id);

            const payload: IPlayBandPayload = {
                cardIds: bandCardIds,
                leaderId: bandCardIds[0],
                type: ActionType.PLAY_BAND
            };

            await Game.update({
                activePlayerId: playerA.id
            }, {
                where: {
                    id: gameId,
                }
            });

            await CommandService.handleAction(playerA.userId, gameId, payload);

            gameState = await GameService.getState(gameId);

            expect(gameState.activePlayerId).toBe(player.id);
        });

        it("should automatically take a bot's turn if the next player is a bot", async () => {
            jest.useFakeTimers();

            gameState.activePlayerId = playerA.id;

            gameState.players = gameState.players.map(player => {
                if (player.id === playerB.id) {
                    player.user.isBot = true;
                }

                return player;
            });

            jest.spyOn(BotService, 'takeTurn').mockResolvedValueOnce();
            jest.spyOn(GameService, 'getState').mockResolvedValue(gameState);
            jest.spyOn(GameService, 'getNextPlayerId').mockReturnValueOnce(playerB.id);

            const action: IActionPayload = {
                type: ActionType.DRAW_CARD
            };

            await CommandService.handleAction(playerA.userId, gameState.id, action);

            jest.runAllTimers();

            expect(BotService.takeTurn).toHaveBeenCalledWith(gameState.id, playerB.id);
        });
    });
});
