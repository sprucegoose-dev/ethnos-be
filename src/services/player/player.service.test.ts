

import Game from '@models/game.model';
import Player from '@models/player.model';

import GameService from '@services/game/game.service';

import {
    userA,
} from '@jest.setup';
import PlayerService from './player.service';

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
