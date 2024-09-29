import {
    CustomException,
    ERROR_BAD_REQUEST,
} from '@helpers/exception-handler';

import Game from '@models/game.model';
import Player from '@models/player.model';

import { CardState } from '@interfaces/card.interface';
import { GameState } from '@interfaces/game.interface';
import { TribeName } from '@interfaces/tribe.interface';
import GameService from '../game/game.service';

const {
    DRAGON,
} = TribeName;

export default class DrawCardHandler {

    static async handleDrawCard(game: Game, player: Player): Promise<void> {
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

        do {
            if (nextCard.tribe.name === DRAGON) {
                await nextCard.update({
                    state: CardState.REVEALED,
                    index: null,
                });
                dragonsRemaining--;
                nextCardIndex++;
                nextCard = cardsInDeck[nextCardIndex];
            }
        } while (nextCard.tribe.name === DRAGON && dragonsRemaining > 1)

        if (!dragonsRemaining) {
            const finalAge = game.players.length >= 4 ? 3 : 2;

            if (game.age === finalAge) {
                await game.update({
                    state: GameState.ENDED
                });
            } else {
                await GameService.startNewAge(game);
            }
        } else {
            await nextCard.update({
                state: CardState.IN_HAND,
                playerId: player.id,
                index: null,
            });
        }
    }

}
