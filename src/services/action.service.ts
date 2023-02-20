import { Card } from '../models/card.model';
import { Player } from '../models/player.model';
import { ActionType, IActionPayload } from '../types/action.interface';
import { Color } from '../types/card_type.interface';
import { GamePhase, GameState } from '../types/game.interface';
import { PlayerOrientation } from '../types/player.interface';
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

        const continiuumCards = game.cards.filter(c => c.index !== null).sort((a, b) => a.index - b.index);

        const playerCards = game.cards.filter(c => c.playerId === activePlayer.id);

        switch (game.phase) {
            case GamePhase.DEPLOYMENT:
                actions = ActionService.getDeployActions(game.codexColor, continiuumCards);
                break;
            case GamePhase.REPLACEMENT:
                actions = ActionService.getReplaceActions(activePlayer, continiuumCards);
                break;
            case GamePhase.MOVEMENT:
                actions = ActionService.getMoveActions(activePlayer, playerCards, continiuumCards);
                break;
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

    static getMoveActions(player: Player, cardsInHand: Card[], continuumCards: Card[]): IActionPayload[] {
        let actions: IActionPayload[] = [];
        const {
            cardsInPast,
            cardsInFuture,
        } = this.getPastAndFutureCards(player, continuumCards);

        for (const card of cardsInHand) {
            actions = actions.concat(this.getValidMoveTargets(card, cardsInPast, cardsInFuture));
        }

        return actions;
    }

    static getPastAndFutureCards(player: Player, cards: Card[]): { cardsInPast: Card[], cardsInFuture: Card[] } {
        const {
            orientation,
        } = player;
        let playerPosition = player.position;

        let continuumCards = [...cards];

        if (orientation === PlayerOrientation.INVERSE) {
            continuumCards.reverse();
            playerPosition = continuumCards.length - 1 - playerPosition;
        }

        return {
            cardsInPast: continuumCards.slice(0, playerPosition),
            cardsInFuture: continuumCards.slice(playerPosition + 1),
        };
    }

    static getReplaceActions(player: Player, continuumCards: Card[]): IActionPayload[] {
        let actions: IActionPayload[] = [];
        const {
            cardsInPast,
            cardsInFuture,
        } = this.getPastAndFutureCards(player, continuumCards);

        if (cardsInPast.length >= 3) {
            actions.push({
                targetIndex: cardsInPast[cardsInPast.length - 1].index,
                type: ActionType.REPLACE,
            });
        }

        if (cardsInFuture.length >= 3) {
            actions.push({
                targetIndex: cardsInFuture[0].index,
                type: ActionType.REPLACE,
            });
        }

        return actions;
    }

    static getValidMoveTargets(cardInHand: Card, cardsInPast: Card[], cardsInFuture: Card[]): IActionPayload[] {
        const actions = [];

        for (const card of cardsInPast) {
            if (cardInHand.type.suit === card.type.suit || cardInHand.type.color === card.type.color) {
                actions.push({
                    sourceCardId: cardInHand.id,
                    targetIndex: card.index,
                    type: ActionType.MOVE,
                });
            }
        }

        const cardInFuture = cardsInFuture[cardInHand.type.value - 1];

        if (cardInFuture) {
            actions.push({
                sourceCardId: cardInHand.id,
                targetIndex: cardInFuture.index,
                type: ActionType.MOVE,
            });
        }

        return actions;
    }

}
