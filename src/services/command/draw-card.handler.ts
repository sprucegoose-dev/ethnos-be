import {
    CustomException,
    ERROR_BAD_REQUEST,
} from '@helpers/exception-handler';

import Game from '@models/game.model';
import Player from '@models/player.model';

import { CardState } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import GameService from '../game/game.service';
import Card from '../../models/card.model';
import ActionLogService from '../actionLog/actionLog';
import { ActionType } from '../../interfaces/action.interface';
import { Op } from 'sequelize';

const {
    DRAGON,
} = TribeName;

export default class DrawCardHandler {

    static async logRevealedDragon(gameId: number, playerId: number) {
        await ActionLogService.log({
            payload: { type: ActionType.DRAW_CARD },
            gameId,
            playerId,
        });
    }

    static async handleDrawCard(game: Game, player: Player, quantity: number = 1): Promise<void> {
        const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

        if (cardsInHand.length === 10) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Cannot exceed hand limit of 10 cards');
        }

        const cardsInDeck = game.cards
            .filter(card => card.state === CardState.IN_DECK)
            .sort((cardA, cardB) => cardA.index - cardB.index);

        let dragonsRemaining = cardsInDeck.filter(card => card.tribe.name === DRAGON).length;

        let nextCardIndex = 0;

        let nextCard = cardsInDeck[nextCardIndex];

        const revealedDragons: Card[] = [];
        const cardsToDraw: Card[] = [];
        let drawnCards = 0;

        do {
            if (nextCard.tribe.name === DRAGON) {
                revealedDragons.push(nextCard);
                dragonsRemaining--;
            } else {
                cardsToDraw.push(nextCard);
                drawnCards++;
            }

            nextCardIndex++;
            nextCard = cardsInDeck[nextCardIndex];
        } while (nextCard && dragonsRemaining > 1 && (nextCard.tribe.name === DRAGON || drawnCards < quantity))

        if (revealedDragons.length) {
            await Card.update({
                state: CardState.REVEALED,
                index: null,
            }, {
                where: {
                    id: {
                        [Op.in]: revealedDragons.map(card => card.id)
                    }
                }
            });

            for (const _dragon of revealedDragons) {
                await this.logRevealedDragon(game.id, player.id);
            }
        }

        if (!dragonsRemaining) {
            const finalAge = game.players.length >= 4 ? 3 : 2;

            if (game.age === finalAge) {
                await GameService.endFinalAge(game);
            } else {
                await GameService.startNewAge(game);
            }
        } else {
            await Card.update({
                state: CardState.IN_HAND,
                playerId: player.id,
                index: cardsInHand.length,
            }, {
                where: {
                    id: {
                        [Op.in]: cardsToDraw.map(card => card.id)
                    }
                }
            });
        }
    }
}
