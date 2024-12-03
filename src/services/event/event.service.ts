import {
    EVENT_ACTIVE_GAMES_UPDATE,
    EVENT_CHAT_UPDATE,
    EVENT_GAME_UPDATE,
    EVENT_ACTIONS_LOG_UPDATE,
    EVENT_UNDO_REQUEST,
    IEventType,
} from '@interfaces/event.interface';

import { gameSocket } from '../..';
import PayloadCompressor from '@services/helpers/PayloadCompressor';

export default class EventService {

    static emitEvent(event: IEventType) {
        switch (event.type) {
            case EVENT_ACTIVE_GAMES_UPDATE:
                gameSocket.emit(EVENT_ACTIVE_GAMES_UPDATE, event.payload);
                break;
            case EVENT_CHAT_UPDATE:
                gameSocket.to(`game-${event.gameId}`).emit(EVENT_CHAT_UPDATE, event.payload);
                break;
            case EVENT_GAME_UPDATE:
                gameSocket.to(`game-${event.payload.id}`).emit(EVENT_GAME_UPDATE, PayloadCompressor.gzip(event.payload));
                break;
            case EVENT_ACTIONS_LOG_UPDATE:
                gameSocket.to(`game-${event.gameId}`).emit(EVENT_ACTIONS_LOG_UPDATE, event.payload);
                break;
            case EVENT_UNDO_REQUEST:
                gameSocket.to(`game-${event.gameId}`).emit(EVENT_UNDO_REQUEST);
                break;
        }
    }
}
