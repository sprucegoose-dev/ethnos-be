import {
    CustomException,
    ERROR_BAD_REQUEST,
} from '@helpers/exception-handler';

import Game from '@models/game.model';
import Player from '@models/player.model';

import { CardState } from '@interfaces/card.interface';

export default class PickUpCardHandler {

    static async handlePickUpCard(game: Game, player: Player, cardId: number): Promise<void> {
        const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

        if (cardsInHand.length === 10) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Cannot exceed hand limit of 10 cards');
        }

        const card = game.cards.find(card => card.state === CardState.IN_MARKET && card.id === cardId);

        if (!card) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid card');
        }

        await card.update({
            state: CardState.IN_HAND,
            playerId: player.id,
            index: null,
        });
    }

}
