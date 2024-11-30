import Game from '@models/game.model';
import NextAction from '@models/next-action.model';
import Player from '@models/player.model';

import { NextActionState } from '@interfaces/next-action.interface';
import { ActionType } from '@interfaces/action.interface';

import {
    createGame,
} from '../test-helpers';


import NextActionHandler from './next-action.handler';

describe('NextActionHandler', () => {
    describe('resolvePendingNextAction', () => {
        let gameId: number;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            gameId = result.gameId;
            playerA = result.playerA;
        });

        afterEach(async () => await Game.truncate());

        it("should resolve a pending 'next action'", async () => {
            let nextAction = await NextAction.create({
                state: NextActionState.PENDING,
                gameId,
                playerId: playerA.id,
                type: ActionType.ADD_FREE_TOKEN
            });

           await NextActionHandler.resolvePendingNextAction(nextAction.id);

           nextAction = await NextAction.findOne({
                where: {
                    gameId,
                    playerId: playerA.id,
                    type: ActionType.ADD_FREE_TOKEN
                }
            });

            expect(nextAction.state).toBe(NextActionState.RESOLVED);
        });


        it("should do nothing if a nextActionId is not provided", async () => {
            let nextAction = await NextAction.create({
                state: NextActionState.PENDING,
                gameId,
                playerId: playerA.id,
                type: ActionType.ADD_FREE_TOKEN
            });

           await NextActionHandler.resolvePendingNextAction(null);

           nextAction = await NextAction.findOne({
                where: {
                    gameId,
                    playerId: playerA.id,
                    type: ActionType.ADD_FREE_TOKEN
                }
            });

            expect(nextAction.state).toBe(NextActionState.PENDING);
        });
    });

});
