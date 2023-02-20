import { gameSocket } from '..';
import {
    EVENT_ACTIVE_GAMES_UPDATE,
    EVENT_GAME_UPDATE,
    IEventType,
} from '../types/event.interface';

class EventService {

    static emitEvent(event: IEventType) {
        switch (event.type) {
            case EVENT_GAME_UPDATE:
                gameSocket.to(`game-${event.payload.id}`).emit(EVENT_GAME_UPDATE, event.payload);
                break;
            case EVENT_ACTIVE_GAMES_UPDATE:
                gameSocket.emit(EVENT_ACTIVE_GAMES_UPDATE, event.payload);
                break;
        }
    }
}

export default EventService;
