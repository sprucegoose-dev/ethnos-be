import {
    EVENT_ACTIVE_GAMES_UPDATE,
    EVENT_CHAT_UPDATE,
    EVENT_GAME_UPDATE,
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
                gameSocket.to(`game-${event.channelId}`).emit(EVENT_CHAT_UPDATE, event.payload);
                break;
            case EVENT_GAME_UPDATE:
                gameSocket.to(`game-${event.payload.id}`).emit(EVENT_GAME_UPDATE, PayloadCompressor.gzip(event.payload));
                break;
        }
    }
}
