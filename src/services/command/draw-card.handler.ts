import { Op } from 'sequelize';

import {
    CustomException,
    ERROR_BAD_REQUEST,
} from '@helpers/exception-handler';

import { CardState } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { LogType } from '@interfaces/action-log.interface';

import Game from '@models/game.model';
import Player from '@models/player.model';
import Card from '@models/card.model';

import GameService from '@services/game/game.service';
import ActionLogService from '@services/actionLog/action-log.service';
import TribeHandler from './tribe.handler';

const {
    DRAGON,
} = TribeName;

export default class DrawCardHandler {

    static async logRevealedDragon(gameId: number, playerId: number) {
        await ActionLogService.log({
            type: LogType.REVEAL_DRAGON,
            gameId,
            playerId,
        });
    }

    static async handleDrawCard(game: Game, player: Player, quantity: number = 1, validateHandSize = true): Promise<void> {
        const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

        if (validateHandSize && cardsInHand.length === 10) {
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
        } while (nextCard && drawnCards < quantity)

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
            } else if (TribeHandler.shouldScoreOrcBoards(game)) {
                await TribeHandler.createRemoveOrcTokenActions(game.players);
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
