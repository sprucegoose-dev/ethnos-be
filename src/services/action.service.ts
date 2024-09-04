import { IActionPayload } from '../types/action.interface';
import { GameState } from '../types/game.interface';
import GameService from './game.service';

export class ActionService {

    static async getActions(userId: number, gameId: number): Promise<IActionPayload[]> {
        const game = await GameService.getState(gameId);
        let actions: IActionPayload[] = [];

        const activePlayer = game.players.find(p =>
            p.id === game.activePlayerId && p.userId === userId
        );

        if (!activePlayer || game.state === GameState.ENDED) {
            return actions;
        }

        return actions;
    }
}
