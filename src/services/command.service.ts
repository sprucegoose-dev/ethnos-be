import { ActionType, IActionPayload } from '../types/action.interface';
import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND,
} from '../helpers/exception_handler';
import GameService from './game.service';
import EventService from './event.service';
import { EVENT_GAME_UPDATE } from '../types/event.interface';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { CardState } from '../types/card.interface';
import { TribeName } from '../types/tribe.interface';

class CommandService {

    static async handleAction(userId: number, gameId: number, payload: IActionPayload): Promise<void> {
        const game = await GameService.getState(gameId);

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        const activePlayer = game.players.find(p =>
            p.id === game.activePlayerId && p.userId === userId
        );

        if (!activePlayer) {
            throw new CustomException(ERROR_BAD_REQUEST, 'You are not the active player');
        }

        let nextAction = false;

        switch (payload.type) {
            case ActionType.DRAW_CARD:
                await CommandService.handleDrawCard(game, activePlayer);
                break;
            case ActionType.PLAY_BAND:
                nextAction = await CommandService.handlePlayBand(game, activePlayer, payload);
                // await this.handleDeploy(game, activePlayer, payload);
                break;
            case ActionType.PICK_UP_CARD:
                // await this.handleReplace(game, activePlayer, payload);
                break;
        }

        if (!nextAction) {
            // end turn;
        } else {
            // set next player to be the active player
        }

        const updatedGameState = await GameService.getState(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });
    }

    static async handlePlayBand(_game: Game, _activePlayer: Player, _payload: IActionPayload): Promise<boolean> {
        return;
    }

    static async handleDrawCard(game: Game, activePlayer: Player): Promise<void> {
        const cardsInHand = activePlayer.cards.filter(card => card.state === CardState.IN_HAND);

        if (cardsInHand.length === 10) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Cannot exceed hand limit of 10 cards');
        }

        const cardsInDeck = game.cards
            .filter(card => card.state === CardState.IN_DECK)
            .sort((cardA, cardB) => cardA.index - cardB.index);

        let dragonsRemaining = cardsInDeck.filter(card => card.tribe.name === TribeName.DRAGON).length;

        let nextCardIndex = 0;

        let nextCard = cardsInDeck[nextCardIndex];

        while (nextCard.tribe.name === TribeName.DRAGON && dragonsRemaining > 1) {
            await nextCard.update({
                state: CardState.REVEALED,
            });
            dragonsRemaining--;
            nextCardIndex++;
            nextCard = cardsInDeck[nextCardIndex];
        }

        if (!dragonsRemaining) {
            // trigger game end
        } else {
            await nextCard.update({
                state: CardState.IN_HAND,
                playerId: activePlayer.id,
                index: 0,
            });
        }
    }
}

export default CommandService;
