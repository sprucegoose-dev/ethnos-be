import { Player } from '../models/player.model';
import { ActionType, IActionPayload } from '../types/action.interface';
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

            if (cardsInMarket.length) {
                actions.push({
                    cardIds: cardsInMarket.map(card => card.id),
                    type: ActionType.PICK_UP_CARD
                });
            }
        }

        const playBandActions = ActionService.getPlayBandActions(activePlayer);

        if (playBandActions.length) {
            actions = [...actions, ...playBandActions];
        }

        return actions;
    }

    static getPlayBandActions(player: Player): IActionPayload[] {
        const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

        const leaders = cardsInHand.filter(card => card.tribe.name !== TribeName.SKELETON);

        const playBandActions = [];

        for (const leader of leaders) {
            const sameColorBand = cardsInHand.filter(card => !card.color || card.color === leader.color);
            const sameTribeBand = cardsInHand.filter(card => !card.color || card.tribe.name === leader.tribe.name);
            playBandActions.push({
                cardIds: sameColorBand.map(card => card.id),
                type: ActionType.PLAY_BAND
            });
            playBandActions.push({
                cardIds: sameTribeBand.map(card => card.id),
                type: ActionType.PLAY_BAND
            });
        }

        return playBandActions;
    }
}
