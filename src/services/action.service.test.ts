// import { Op } from 'sequelize';
// import { ERROR_BAD_REQUEST } from '../helpers/exception_handler';
// import { Card } from '../models/card.model';
import { Game } from '../models/game.model';
// import { Player } from '../models/player.model';
// import { EVENT_ACTIVE_GAMES_UPDATE } from '../types/event.interface';
// import { IUserResponse } from '../types/user.interface';
// import EventService from './event.service';
import GameService from './game.service';
// import PlayerService from './player.service';
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
});
