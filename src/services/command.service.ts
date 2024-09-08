// import { Op } from 'sequelize';

// import { Game } from '../models/game.model';
// import { Player } from '../models/player.model';
import { IActionPayload } from '../types/action.interface';
// import { GameState, } from '../types/game.interface';
import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND,
} from '../helpers/exception_handler';
import GameService from './game.service';
import EventService from './event.service';
import { EVENT_GAME_UPDATE } from '../types/event.interface';

class CommandService {

    static async handleAction(userId: number, gameId: number, _payload: IActionPayload): Promise<void> {
        // TODO: validate action
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

        // switch (payload.type) {
        //     case ActionType.MOVE:
        //         // await this.handleMove(game, activePlayer, payload);
        //         break;
        //     case ActionType.DEPLOY:
        //         // await this.handleDeploy(game, activePlayer, payload);
        //         break;
        //     case ActionType.REPLACE:
        //         // await this.handleReplace(game, activePlayer, payload);
        //         break;
        // }

        const updatedGameState = await GameService.getState(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });
    }
}

export default CommandService;
