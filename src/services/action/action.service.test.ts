import ActionService from './action.service';

import Game from '@models/game.model';
import Card from '@models/card.model';
import Player from '@models/player.model';
import NextAction from '@models/next-aciton.model';

import PlayerService from '@services/player/player.service';
import GameService from '@services/game/game.service';
import {
    userA,
    userB,
    userC,
    userD,
} from '@jest.setup';

import { TribeName } from '@interfaces/tribe.interface';
import { ActionType } from '@interfaces/action.interface';
import { CardState } from '@interfaces/card.interface';
import { NextActionState } from '@interfaces/next-action.interface';
import { Color, GameState } from '@interfaces/game.interface';

describe('ActionService', () => {

    describe('getActions', () => {
        let game: Game;

        beforeEach(async () => {
            game = await GameService.create(userA.id);
            await PlayerService.create(userB.id, game.id);
            await PlayerService.create(userC.id, game.id);
            await PlayerService.create(userD.id, game.id);

            const settings = {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                ]
            };

            await GameService.start(userA.id, game.id, settings);
        });

        afterEach(async () => await Game.truncate());

        it("should return a 'play band' action if a player has at least one card in their hand", async () => {
            const updatedGame = await GameService.getState(game.id);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            const actions = await ActionService.getActions(
                game.id,
                activePlayer.user.id,
            );

            expect(activePlayer.cards.length).toBe(1);
            expect(actions.find(action => action.type === ActionType.PLAY_BAND)).toBeDefined();
        });

        it("should return a 'draw card' action if a player has fewer than 10 cards in their hand", async () => {
            const updatedGame = await GameService.getState(game.id);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            const actions = await ActionService.getActions(
                game.id,
                activePlayer.user.id,
            );

            expect(activePlayer.cards.length).toBe(1);
            expect(actions.find(action => action.type === ActionType.DRAW_CARD)).toBeDefined();
        });

        it("should return a 'pick up card' action if a player has fewer than 10 cards in their hand and there are cards in the market", async () => {
            const updatedGame = await GameService.getState(game.id);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            const actions = await ActionService.getActions(
                game.id,
                activePlayer.user.id,
            );

            expect(activePlayer.cards.length).toBe(1);
            expect(updatedGame.cards.filter(card => card.state === CardState.IN_MARKET).length).toBe(8);
            expect(actions.find(action => action.type === ActionType.PICK_UP_CARD)).toBeDefined();
        });

        it("should only return a 'play band' action if a player already has 10 cards in their hand", async () => {
            const updatedGame = await GameService.getState(game.id);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            const cardsInDeck = updatedGame.cards.filter(card => card.state === CardState.IN_DECK);

            for (let i = 0; i < 9; i++) {
                await Card.update(
                    {
                        playerId: activePlayer.id,
                        state: CardState.IN_HAND,
                    },
                    {
                        where: {
                            id: cardsInDeck[i].id
                        }
                    }
                );
            }

            const updatedActivePlayer = await Player.findOne({
                where: {
                    id: activePlayer.id
                },
                include: {
                    model: Card,
                    where: {
                        state: CardState.IN_HAND
                    }
                }
            });

            const actions = await ActionService.getActions(
                game.id,
                activePlayer.user.id,
            );

            expect(updatedActivePlayer.cards.length).toBe(10);
            expect(actions.find(action => action.type === ActionType.DRAW_CARD)).toBeUndefined();
            expect(actions.find(action => action.type === ActionType.PICK_UP_CARD)).toBeUndefined();
            expect(actions.filter(action => action.type === ActionType.PLAY_BAND).length).toBeGreaterThan(1);
        });

        it('should return an empty array if the game has already ended', async () => {
            await Game.update({
                state: GameState.ENDED,
            }, {
                where: {
                    id: game.id
                }
            });

            const updatedGame = await GameService.getState(game.id);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            const actions = await ActionService.getActions(
                game.id,
                activePlayer.user.id,
            );

            expect(actions).toEqual([]);
        });

        it("should filter the actions if there is a pending 'next action' of 'play band'", async () => {
            const updatedGame = await GameService.getState(game.id);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            await NextAction.create({
                state: NextActionState.PENDING,
                gameId: game.id,
                playerId: activePlayer.id,
                type: ActionType.PLAY_BAND
            });

            const cardsInDeck = updatedGame.cards.filter(card => card.state === CardState.IN_DECK);

            for (let i = 0; i < 5; i++) {
                await Card.update(
                    {
                        playerId: activePlayer.id,
                        state: CardState.IN_HAND,
                    },
                    {
                        where: {
                            id: cardsInDeck[i].id
                        }
                    }
                );
            }

            const actions = await ActionService.getActions(
                game.id,
                activePlayer.user.id,
            );

            expect(actions.find(action => action.type === ActionType.DRAW_CARD)).toBeUndefined();
            expect(actions.find(action => action.type === ActionType.PICK_UP_CARD)).toBeUndefined();
            expect(actions.filter(action => action.type === ActionType.PLAY_BAND).length).toBeGreaterThan(1);
        });

        it("should filter the actions if there is a pending 'next action' of 'add free token'", async () => {
            const updatedGame = await GameService.getState(game.id);

            const activePlayer = updatedGame.players.find(player => player.id === updatedGame.activePlayerId);

            await NextAction.create({
                state: NextActionState.PENDING,
                gameId: game.id,
                playerId: activePlayer.id,
                type: ActionType.ADD_FREE_TOKEN
            });

            const actions = await ActionService.getActions(
                game.id,
                activePlayer.user.id,
            );

            expect(actions.find(action => action.type === ActionType.PLAY_BAND)).toBeUndefined();
            expect(actions.find(action => action.type === ActionType.DRAW_CARD)).toBeUndefined();
            expect(actions.find(action => action.type === ActionType.PICK_UP_CARD)).toBeUndefined();
            expect(actions.filter(action => action.type === ActionType.ADD_FREE_TOKEN).length).toBe(1);
        });
    });

    describe('getPlayBandActions', () => {

        it("should return all the valid 'play band' actions", () => {
            const cardsInHand = [
                {
                    id: 1,
                    tribe: {
                        name: TribeName.CENTAURS,
                    },
                    color: Color.BLUE,
                },
                {
                    id: 2,
                    tribe: {
                        name: TribeName.CENTAURS,
                    },
                    color: Color.GRAY,
                },
                {
                    id: 3,
                    tribe: {
                        name: TribeName.ELVES,
                    },
                    color: Color.ORANGE,
                },
                {
                    id: 4,
                    tribe: {
                        name: TribeName.TROLLS,
                    },
                    color: Color.BLUE,
                },
                {
                    id: 5,
                    tribe: {
                        name: TribeName.TROLLS,
                    },
                    color: Color.GREEN,
                },
                {
                    id: 6,
                    tribe: {
                        name: TribeName.TROLLS,
                    },
                    color: Color.ORANGE,
                },
                {
                    id: 7,
                    tribe: {
                        name: TribeName.SKELETONS,
                    },
                    color: null,
                }
            ] as unknown as Card[];

            const actions = ActionService.getPlayBandActions(cardsInHand);

            // Centaur (Blue) + Troll (Blue) + Skeleton
            expect(actions.find(action => ActionService.arrayEquals(action.cardIds, [1, 4, 7]))).toBeDefined();

            // Centaur (Blue) + Centaur (Gray) + Skeleton
            expect(actions.find(action => ActionService.arrayEquals(action.cardIds, [1, 2, 7]))).toBeDefined();

            // Elf (Orange) + Troll (Orange) + Skeleton
            expect(actions.find(action => ActionService.arrayEquals(action.cardIds, [3, 6, 7]))).toBeDefined();

            // Troll (Blue) + Troll (Green) + Troll (Orange) + Skeleton
            expect(actions.find(action => ActionService.arrayEquals(action.cardIds, [4, 5, 6, 7]))).toBeDefined();

            // (INVALID) Elf (Orange) + Troll (Blue)
            expect(actions.find(action => ActionService.arrayEquals(action.cardIds, [3, 4]))).not.toBeDefined();
        });
    });
});
