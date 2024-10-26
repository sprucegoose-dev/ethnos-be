

import Game from '@models/game.model';
import Player from '@models/player.model';

import GameService from '@services/game/game.service';

import {
    UNEXPECTED_ERROR_MSG,
    userA,
    userB,
} from '@jest.setup';
import PlayerService from './player.service';
import { createGame } from '../test-helpers';
import { GameState, IGameState } from '../../interfaces/game.interface';
import { PlayerColor } from '../../interfaces/player.interface';
import { ERROR_BAD_REQUEST } from '../../helpers/exception-handler';

describe('create', () => {
    let game: Game;

    beforeEach(async () => {
        game = await GameService.create(userA.id);
        await Player.truncate();
    });

    afterEach(async () => await Game.truncate());

    it('should add a new player to a game', async () => {
        const player = await PlayerService.create(userA.id, game.id);

        const gameState = await GameService.getState(game.id);

        expect(gameState.players.length).toBe(1);
        expect(gameState.players[0].id).toBe(player.id);
    });
});

describe('assignColor', () => {
    let gameState: IGameState;

    beforeEach(async () => {
        const result = await createGame();
        gameState = result.gameState;

        await Game.update({
            state: GameState.CREATED,
        }, {
            where: {
                id: gameState.id
            }
        });

        await Player.update({
            color: null,
        }, {
            where: {
                gameId: gameState.id
            }
        });
    });

    afterEach(async () => await Game.truncate());

    it('should assign a color to a player', async () => {
        await PlayerService.assignColor(userA.id, gameState.id, PlayerColor.BLUE);

        const updatedPlayer = await Player.findOne({
            where: {
                gameId: gameState.id,
                userId: userA.id,
            }
        });
        expect(updatedPlayer.color).toBe(PlayerColor.BLUE);
    });

    it('should allow resetting the color by providing a null value', async () => {
        await PlayerService.assignColor(userA.id, gameState.id, PlayerColor.BLUE);

        let updatedPlayer = await Player.findOne({
            where: {
                gameId: gameState.id,
                userId: userA.id,
            }
        });

        expect(updatedPlayer.color).toBe(PlayerColor.BLUE);

        await PlayerService.assignColor(userA.id, gameState.id, null);

        updatedPlayer = await Player.findOne({
            where: {
                gameId: gameState.id,
                userId: userA.id,
            }
        });

        expect(updatedPlayer.color).toBe(null);
    });

    it("should throw an error when trying to assign a color that's already taken", async () => {
        await PlayerService.assignColor(userA.id, gameState.id, PlayerColor.BLUE);

        try {
            await PlayerService.assignColor(userB.id, gameState.id, PlayerColor.BLUE);
            throw new Error(UNEXPECTED_ERROR_MSG);
        } catch (error: any) {
            expect(error.type).toBe(ERROR_BAD_REQUEST);
            expect(error.message).toBe('This color is already assigned to another player');
        }
    });

    it('should throw an error if the color is invalid', async () => {
        try {
            await PlayerService.assignColor(userB.id, gameState.id, 'invalid-color' as PlayerColor);
            throw new Error(UNEXPECTED_ERROR_MSG);
        } catch (error: any) {
            expect(error.type).toBe(ERROR_BAD_REQUEST);
            expect(error.message).toBe('Invalid color');
        }
    });

    it('should throw an error if the game had already started', async () => {
        await Game.update({
            state: GameState.STARTED,
        }, {
            where: {
                id: gameState.id
            }
        });

        try {
            await PlayerService.assignColor(userB.id, gameState.id, PlayerColor.BLUE);
            throw new Error(UNEXPECTED_ERROR_MSG);
        } catch (error: any) {
            expect(error.type).toBe(ERROR_BAD_REQUEST);
            expect(error.message).toBe("You can't change a player's color after the game had started");
        }
    });
});
