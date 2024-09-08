import { Game } from '../models/game.model';
import GameService from './game.service';
import {
    userA,
    userB,
    userC,
    userD,
} from '../../jest.setup';
import PlayerService from './player.service';
import { TribeName } from '../types/tribe.interface';
import { ActionService } from './action.service';
import { ActionType } from '../types/action.interface';
import { CardState } from '../types/card.interface';
import { Color } from '../types/game.interface';
import { Card } from '../models/card.model';

const arrayEquals = (arrayA: any[], arrayB: any[]) => {
    return arrayA.every((value, index) => value === arrayB[index])
}

describe('ActionService', () => {

    describe('getActions', () => {
        let game: Game;

        beforeEach(async () => {
            game = await GameService.create(userA.id);
            await PlayerService.create(userA.id, game.id);
            await PlayerService.create(userB.id, game.id);
            await PlayerService.create(userC.id, game.id);
            await PlayerService.create(userD.id, game.id);

            const settings = {
                tribes: [
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.WIZARD,
                ]
            };

            await GameService.start(userA.id, game.id, settings);
        });

        afterEach(async () => {
            await Game.truncate();
        });

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
    });

    describe('getPlayBandActions', () => {

        it("should return all the valid 'play band' actions", () => {
            const cardsInHand = [
                {
                    id: 1,
                    tribe: {
                        name: TribeName.CENTAUR,
                    },
                    color: Color.BLUE,
                },
                {
                    id: 2,
                    tribe: {
                        name: TribeName.CENTAUR,
                    },
                    color: Color.GRAY,
                },
                {
                    id: 3,
                    tribe: {
                        name: TribeName.ELF,
                    },
                    color: Color.ORANGE,
                },
                {
                    id: 4,
                    tribe: {
                        name: TribeName.TROLL,
                    },
                    color: Color.BLUE,
                },
                {
                    id: 5,
                    tribe: {
                        name: TribeName.TROLL,
                    },
                    color: Color.GREEN,
                },
                {
                    id: 6,
                    tribe: {
                        name: TribeName.TROLL,
                    },
                    color: Color.ORANGE,
                },
                {
                    id: 7,
                    tribe: {
                        name: TribeName.SKELETON,
                    },
                    color: null,
                }
            ] as unknown as Card[];

            const actions = ActionService.getPlayBandActions(cardsInHand);

            // Centaur (Blue) + Troll (Blue) + Skeleton
            expect(actions.find(action => arrayEquals(action.cardIds, [1, 4, 7]))).toBeDefined();

            // Centaur (Blue) + Centaur (Gray) + Skeleton
            expect(actions.find(action => arrayEquals(action.cardIds, [1, 2, 7]))).toBeDefined();

            // Elf (Orange) + Troll (Orange) + Skeleton
            expect(actions.find(action => arrayEquals(action.cardIds, [3, 6, 7]))).toBeDefined();

            // Troll (Blue) + Troll (Green) + Troll (Orange) + Skeleton
            expect(actions.find(action => arrayEquals(action.cardIds, [4, 5, 6, 7]))).toBeDefined();

            // (INVALID) Elf (Orange) + Troll (Blue)
            expect(actions.find(action => arrayEquals(action.cardIds, [3, 4]))).not.toBeDefined();
        });
    });
});
