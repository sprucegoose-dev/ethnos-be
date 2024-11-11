import {
    EVENT_ACTIVE_GAMES_UPDATE,
    EVENT_GAME_UPDATE,
    EVENT_GAME_UPDATE_PRIVATE,
    IEventType,
} from '@interfaces/event.interface';

import { gameSocket } from '../..';
import PayloadCompressor from '@services/helpers/PayloadCompressor';

export default class EventService {

    static emitEvent(event: IEventType) {
        switch (event.type) {
            case EVENT_GAME_UPDATE:
                gameSocket.to(`game-${event.payload.id}`).emit(EVENT_GAME_UPDATE, PayloadCompressor.gzip(event.payload));
                break;
            case EVENT_GAME_UPDATE_PRIVATE:
                gameSocket.to(`game-${event.payload.id}-${event.payload.userId}`).emit(EVENT_GAME_UPDATE, event.payload.cardsInHand);
                break;
            case EVENT_ACTIVE_GAMES_UPDATE:
                gameSocket.emit(EVENT_ACTIVE_GAMES_UPDATE, event.payload);
                break;
        }
    }
}
