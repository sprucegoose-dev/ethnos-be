import Card from '@models/card.model';

import {
    ActionType,
    IActionPayload,
    IPlayBandPayload
} from '@interfaces/action.interface';
import { CardState } from '@interfaces/card.interface';
import { GameState, IGameState } from '@interfaces/game.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { NextActionState } from '@interfaces/next-action.interface';

import GameService from '@services/game/game.service';

import NextAction from '@models/nextAction.model';

export default class ActionService {

    static arrayEquals = (arrayA: any[], arrayB: any[]) => {
        return arrayA.every((value, index) => value === arrayB[index])
    }

    static async getActions(gameId: number, userId: number, gameState?: IGameState): Promise<IActionPayload[]> {
        const game = gameState || await GameService.getState(gameId);

        let actions: IActionPayload[] = [];

        const activePlayer = game.players.find(p =>
            p.userId === userId
        );

        if (game.state === GameState.ENDED) {
            return actions;
        }

        const nextAction = await NextAction.findOne({
            where: {
                gameId: gameId,
                state: NextActionState.PENDING,
                playerId: activePlayer.id
            }
        });

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

        if (nextAction?.type === ActionType.PLAY_BAND) {
            actions = actions.filter(action =>
                action.type === ActionType.PLAY_BAND
            ).map(action => ({
                ...action,
                nextActionId: nextAction.id,
            }));
        }

        if (nextAction?.type === ActionType.ADD_FREE_TOKEN) {
            actions = [{
                type: ActionType.ADD_FREE_TOKEN,
                nextActionId: nextAction.id,
                regionColor: null,
            }];
        }

        return actions;
    }

    static getPlayBandActions(cardsInHand: Card[]): IPlayBandPayload[] {
        const playBandActions: IPlayBandPayload[] = [];

        for (const leader of cardsInHand) {
            if (leader.tribe.name === TribeName.SKELETONS) {
                continue;
            }

            const sameColorBand = cardsInHand.filter(card => !card.color || card.color === leader.color);
            const sameTribeBand = cardsInHand.filter(card => !card.color || card.tribe.name === leader.tribe.name);

            playBandActions.push({
                leaderId: leader.id,
                cardIds: sameColorBand.map(card => card.id),
                type: ActionType.PLAY_BAND
            });

            if (!this.arrayEquals(sameColorBand, sameTribeBand)) {
                playBandActions.push({
                    leaderId: leader.id,
                    cardIds: sameTribeBand.map(card => card.id),
                    type: ActionType.PLAY_BAND
                });
            }
        }

        return playBandActions.filter(action =>
            action.cardIds.includes(action.leaderId)
        );
    }
}
