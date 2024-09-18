import { Card } from '../models/card.model';
import { ActionType, IActionPayload, IPlayBandPayload } from '../types/action.interface';
import { CardState } from '../types/card.interface';
import { GameState } from '../types/game.interface';
import { TribeName } from '../types/tribe.interface';
import GameService from './game.service';

export class ActionService {

    static async getActions(gameId: number, userId: number): Promise<IActionPayload[]> {
        const game = await GameService.getState(gameId);
        let actions: IActionPayload[] = [];

        const activePlayer = game.players.find(p =>
            p.id === game.activePlayerId && p.userId === userId
        );

        if (!activePlayer || game.state === GameState.ENDED) {
            return actions;
        }

        const cardsInHand = activePlayer.cards.filter(card => card.state === CardState.IN_HAND);

        const cardsInMarket = game.cards.filter(card => card.state === CardState.IN_MARKET);

        if (cardsInHand.length < 10) {
            actions.push({
                type: ActionType.DRAW_CARD
            });

            for (const card of cardsInMarket) {
                actions.push({
                    cardId: card.id,
                    type: ActionType.PICK_UP_CARD
                });
            }
        }

        const playBandActions = ActionService.getPlayBandActions(cardsInHand);

        if (playBandActions.length) {
            actions = [...actions, ...playBandActions];
        }

        return actions;
    }

    static getPlayBandActions(cardsInHand: Card[]): IPlayBandPayload[] {
        const playBandActions = [];

        for (const card of cardsInHand) {
            if (card.tribe.name === TribeName.SKELETON) {
                continue;
            }

            const sameColorBand = cardsInHand.filter(card => !card.color || card.color === leader.color);
            const sameTribeBand = cardsInHand.filter(card => !card.color || card.tribe.name === leader.tribe.name);
            playBandActions.push({
                leaderId: card.id,
                cardIds: sameColorBand.map(card => card.id),
                type: ActionType.PLAY_BAND
            });
            playBandActions.push({
                leaderId: card.id,
                cardIds: sameTribeBand.map(card => card.id),
                type: ActionType.PLAY_BAND
            });
        }

        // @ts-ignore
        return playBandActions;
    }
}
