import {
    ActionType,
    IActionPayload,
    IPlayBandPayload
} from '../types/action.interface';
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
import { Card } from '../models/card.model';
import { Op } from 'sequelize';
import { Region } from '../models/region.model';
import PlayerRegion from '../models/player_region.model';

const {
    CENTAUR,
    DRAGON,
    DWARF,
    ELF,
    GIANT,
    HALFING,
    MERFOLK,
    MINOTAUR,
    ORC,
    SKELETON,
    TROLL,
    WINGFOLK,
    WIZARD,
} = TribeName;

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
                nextAction = await CommandService.handlePickUpCard(game, activePlayer, payload);
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

    static async handlePlayBand(game: Game, player: Player, payload: IPlayBandPayload): Promise<boolean> {
        let nextAction;

        const bandCards = player.cards.filter(card => payload.cardIds.includes(card.id));

        let remainingCards = player.cards.filter(card => !payload.cardIds.includes(card.id));

        const leader = bandCards.find(card => card.id === payload.leaderId);
        const tribe = leader.tribe.name;
        let color = leader.color;

        let bandSize = bandCards.length;

        if (tribe === MINOTAUR) {
            bandSize++;
        }

        if (tribe === SKELETON) {
            throw new CustomException(ERROR_BAD_REQUEST, 'A Skeleton cannot be the leader of a band');
        }

        if (tribe === WINGFOLK) {
            color = payload.regionColor;
        }

        await Card.update({
            state: CardState.IN_BAND,
            playerId: player.id,
            leaderId: payload.leaderId,
            index: null,
        }, {
            where: {
                id: {
                    [Op.in]: payload.cardIds,
                }
            }
        });

        const region = await Region.findOne({
            where: {
                gameId: game.id,
                color,
            }
        });

        const playerRegion = await PlayerRegion.findOne({
            where: {
                regionId: region.id,
                playerId: player.id
            }
        });

        if (bandSize > playerRegion.tokens) {
            await playerRegion.update({
                tokens: playerRegion.tokens + 1,
            });

            if (tribe  === CENTAUR && remainingCards.length) {
                nextAction = {
                    type: ActionType.PLAY_BAND
                };
            }
        }

        if (tribe === ORC && !player.orcTokens.includes(color)) {
            await player.update({
                orcTokens: [...player.orcTokens, color]
            });
        }

        if (tribe === GIANT) {
            const largestGiantBand = await Player.findOne({
                where: {
                    gameId: game.id,
                    giantTokenValue: {
                        [Op.gte]: bandSize,
                    }
                }
            });

            if (!largestGiantBand) {
                await player.update({
                    giantTokenValue: bandSize,
                    points: player.points + 2,
                });
            }
        }

        if (tribe === MERFOLK) {
            // Advance on Merfolk board
            // If checkpoint crossed, give an ADD_TOKEN action
        }

        if (tribe === WIZARD) {
            // Draw cards equal to band size
        }

        if (tribe === TROLL) {
            // gain troll token if available
        }

        if (tribe === ELF) {
            remainingCards = remainingCards.filter(card => !payload.cardIdsToKeep.includes(card.id));
        }

        if (remainingCards.length && !nextAction) {
            await Card.update({
                state: CardState.IN_MARKET,
                playerId: player.id,
                leaderId: payload.leaderId,
                index: null,
            }, {
                where: {
                    playerId: player.id,
                    id: {
                        [Op.in]: remainingCards.map(card => card.id)
                    }
                }
            });
        }


        return;
    }

    static async handlePickUpCard(game: Game, activePlayer: Player, payload: IActionPayload): Promise<void> {
        const cardsInHand = activePlayer.cards.filter(card => card.state === CardState.IN_HAND);

        if (cardsInHand.length === 10) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Cannot exceed hand limit of 10 cards');
        }

        if (payload.cardIds.length !== 1) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Must pick up exactly one card');
        }

        const cardId = payload.cardIds[0];

        const card = game.cards.find(card => card.state === CardState.IN_MARKET && card.id === cardId);

        if (!card) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid card');
        }

        await card.update({
            state: CardState.IN_HAND,
            playerId: activePlayer.id,
            index: null,
        });
    }

    static async handleDrawCard(game: Game, activePlayer: Player): Promise<void> {
        const cardsInHand = activePlayer.cards.filter(card => card.state === CardState.IN_HAND);

        if (cardsInHand.length === 10) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Cannot exceed hand limit of 10 cards');
        }

        const cardsInDeck = game.cards
            .filter(card => card.state === CardState.IN_DECK)
            .sort((cardA, cardB) => cardA.index - cardB.index);

        let dragonsRemaining = cardsInDeck.filter(card => card.tribe.name === DRAGON).length;

        let nextCardIndex = 0;

        let nextCard = cardsInDeck[nextCardIndex];

        while (nextCard.tribe.name === DRAGON && dragonsRemaining > 1) {
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
                index: null,
            });
        }
    }
}

export default CommandService;
