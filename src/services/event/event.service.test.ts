import Game from '@models/game.model';

import {
    EVENT_ACTIVE_GAMES_UPDATE,
    EVENT_GAME_UPDATE,
    IEventType
} from '@interfaces/event.interface';
import { IGameState } from '@interfaces/game.interface';

import { gameSocket } from '../..';

import EventService from './event.service';
import { createGame } from '../test-helpers';
import PayloadCompressor from '../helpers/PayloadCompressor';

jest.mock('../..', () => ({
    gameSocket: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
    },
}));

jest.unmock('./event.service.ts');

describe('EventService.emitEvent', () => {
    let gameState: IGameState;

    beforeEach(async () => {
        const result = await createGame();
        gameState = result.gameState;
    });

    beforeEach(async () => {
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await Game.truncate();
        jest.clearAllMocks();
    });

    it('should emit a game update event to the correct game room', () => {
        const mockEvent: IEventType = {
            type: EVENT_GAME_UPDATE,
            payload: gameState,
        };

        EventService.emitEvent(mockEvent);

        expect(gameSocket.to).toHaveBeenCalledWith('game-' + mockEvent.payload.id);
        expect(gameSocket.emit).toHaveBeenCalledWith(EVENT_GAME_UPDATE, PayloadCompressor.gzip(mockEvent.payload));
    });

    it('should emit an active games update event globally', () => {
        const mockEvent: IEventType = {
            type: EVENT_ACTIVE_GAMES_UPDATE,
            payload: [gameState],
        };

        EventService.emitEvent(mockEvent);

        expect(gameSocket.emit).toHaveBeenCalledWith(EVENT_ACTIVE_GAMES_UPDATE, mockEvent.payload);
    });

    it('should not emit any event for an unknown event type', () => {
        const mockEvent: IEventType = {
            type: 'UNKNOWN_EVENT_TYPE' as any,
            payload: {} as any,
        };

        EventService.emitEvent(mockEvent);

        expect(gameSocket.to).not.toHaveBeenCalled();
        expect(gameSocket.emit).not.toHaveBeenCalled();
    });
});
