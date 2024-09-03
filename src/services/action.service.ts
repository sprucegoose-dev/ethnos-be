import { Card } from '../models/card.model';
import { ActionType, IActionPayload } from '../types/action.interface';
import { Color } from '../types/card_type.interface';
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

    static getDeployActions(codexColor: Color, continuumCards: Card[]): IActionPayload[] {
        let actions: IActionPayload[] = [];

        for (const card of continuumCards) {
            if (card.type.color === codexColor) {
                actions.push({
                    targetIndex: card.index,
                    type: ActionType.DEPLOY,
                });
            }
        }

        return actions;
    }
}
