import {
    ActionType,
    IActionPayload,
} from '../../types/action.interface';
import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND,
} from '../../helpers/exception_handler';
import GameService from '../game/game.service';
import { EVENT_GAME_UPDATE } from '../../types/event.interface';
import PlayBandHandler from './play-band.handler';
import DrawCardHandler from './draw-card.handler';
import PickUpCardHandler from './pick-up-card.handler';
import EventService from '../event/event.service';

export default class CommandService {

    static async handleAction(userId: number, gameId: number, payload: IActionPayload): Promise<void> {
        const game = await GameService.getState(gameId);

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        const activePlayer = game.players.find(p =>
            p.id === game.activePlayerId && p.userId === userId
        );

        if (!activePlayer) {
            throw new CustomException(ERROR_BAD_REQUEST, 'You are not the active player');
        }

        let nextActions = [];

        switch (payload.type) {
            case ActionType.DRAW_CARD:
                await DrawCardHandler.handleDrawCard(game, activePlayer);
                break;
            case ActionType.PLAY_BAND:
                nextActions = await PlayBandHandler.handlePlayBand(game, activePlayer, payload);
                break;
            case ActionType.PICK_UP_CARD:
                await PickUpCardHandler.handlePickUpCard(game, activePlayer, payload.cardId);
                break;
        }

        // TODO: update actions log

        if (!nextActions.length) {
            // end turn;
            // set next player to be the active player
        }

        const updatedGameState = await GameService.getState(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });
    }
}
