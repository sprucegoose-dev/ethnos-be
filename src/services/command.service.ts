import { Op } from 'sequelize';
import shuffle from 'lodash.shuffle';

import { Card } from '../models/card.model';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { ActionType, IActionPayload } from '../types/action.interface';
import { Color } from '../types/card_type.interface';
import { GamePhase, GameState, ICombatData, } from '../types/game.interface';
import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND,
} from '../helpers/exception_handler';
import GameService from './game.service';
import EventService from './event.service';
import { EVENT_GAME_UPDATE } from '../types/event.interface';

class CommandService {

    static async handleDeploy(game: Game, player: Player, payload: IActionPayload): Promise<void> {
        await Player.update({
            position: payload.targetIndex,
        }, {
            where: {
                id: player.id,
            }
        });

        const deployedPlayers = await Player.findAll({
            where: {
                gameId: player.gameId,
                position: {
                    [Op.not]: null,
                }
            }
        });

        if (deployedPlayers.length === 2) {
            game.state = GameState.STARTED;
            game.phase = GamePhase.MOVEMENT;
        }

        game.activePlayerId = game.players.find(p => p.id !== player.id).id;

        await game.save();
    }

    static async handleMove(game: Game, player: Player, payload: IActionPayload) {
        const continuumCard = game.cards.find(c => c.index === payload.targetIndex);
        const codexColor =  game.codexColor;
        const opponent =  game.players.find(p => p.id !== player.id);
        const playerCards = [...game.cards.filter(c =>
            c.playerId === player.id && c.id !== payload.sourceCardId
        ), continuumCard];
        const opponentCards = game.cards.filter(c =>
            c.playerId  && c.playerId !== player.id
        );

        // update player position
        player.position = payload.targetIndex;
        await player.save();

        // swap the card from the player's hand with the continuum card at the target index
        await this.swapCards(
            player.id,
            payload.sourceCardId,
            continuumCard.id,
            continuumCard.index,
        );

        // resolve combat if applicable
        if (payload.targetIndex === opponent.position) {
            await this.resolveCombat({
                game,
                player,
                opponent,
                playerCards,
                opponentCards,
            });
        }

        // check if the player has formed a set (i.e. 'paradox')
        if (this.hasSet(playerCards, codexColor)) {
            await this.resolveParadox(game, player);
            game.phase = GamePhase.REPLACEMENT;
        }

        if (game.phase === GamePhase.MOVEMENT) {
            // go to the next player
            game.activePlayerId = opponent.id;
        }

        await game.save();
    }

    static async handleReplace(game: Game, player: Player, payload: IActionPayload): Promise<void> {
        const cards = await Card.findAll({
            where: {
                gameId: player.gameId,
            },
            order: [['index', 'asc']],
        });

        const continuumCards = [];
        let playerCards = [];
        let playerPosition = player.position;
        let targetIndex = payload.targetIndex;

        for (const card of cards) {
            if (card.index !== null) {
                continuumCards.push(card.toJSON());
            }

            if (card.playerId === player.id) {
                playerCards.push(card.toJSON());
            }
        }

        const cardsToPickUp = playerPosition < targetIndex ?
            continuumCards.slice(targetIndex, targetIndex + 3) :
            continuumCards.slice(targetIndex - 2, targetIndex + 1);

        playerCards = shuffle(playerCards);

        for (let i = 0; i < cardsToPickUp.length; i++) {
            await this.swapCards(
                player.id,
                playerCards[i].id,
                cardsToPickUp[i].id,
                cardsToPickUp[i].index
            );
        }

        game.phase = GamePhase.MOVEMENT;
        game.activePlayerId = game.players.find(p => p.id !== player.id).id;

        await game.save();
    }

    static hasSet(cardsInHand: Card[], codexColor: Color): boolean {
        const matches: {[key: string]: number }= {};

        for (const card of cardsInHand) {
            if (card.type.color === codexColor) {
                continue;
            }

            if (matches[card.type.color]) {
                matches[card.type.color] += 1;
            } else {
                matches[card.type.color] = 1;
            }

            if (matches[card.type.suit]) {
                matches[card.type.suit] += 1;
            } else {
                matches[card.type.suit] = 1;
            }

            if (matches[`${card.type.value}`]) {
                matches[`${card.type.value}`] += 1;
            } else {
                matches[`${card.type.value}`] = 1;
            }
        }

        return Object.values(matches).includes(3);
    }

    static getNextCodeColor(currentColor: Color): Color {
        const colors = Object.values(Color);
        const currentIndex = colors.indexOf(currentColor);
        let nextIndex = currentIndex - 1;

        if (nextIndex === -1) {
            nextIndex = colors.length - 1;
        }

        return colors[nextIndex];
    }

    static async handleAction(userId: number, gameId: number, payload: IActionPayload): Promise<void> {
        // TODO: validate action
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

        switch (payload.type) {
            case ActionType.MOVE:
                await this.handleMove(game, activePlayer, payload);
                break;
            case ActionType.DEPLOY:
                await this.handleDeploy(game, activePlayer, payload);
                break;
            case ActionType.REPLACE:
                await this.handleReplace(game, activePlayer, payload);
                break;
        }

        const updatedGameState = await GameService.getState(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });
    }

    static async resolveCombat({
        game,
        player,
        opponent,
        playerCards,
        opponentCards,
    }: ICombatData) {
        let totalValue = 0;
        let opponentTotalValue = 0;
        let validPlayerCards = shuffle(playerCards.filter(c => c.type.color !== game.codexColor));
        let validOpponentCards = shuffle(opponentCards.filter(c => c.type.color !== game.codexColor));
        let winner;
        let loser;

        for (const card of validPlayerCards) {
            totalValue += card.type.value;
        }

        for (const card of validOpponentCards) {
            opponentTotalValue += card.type.value;
        }

        // The winner is the player with the higher total card value
        if (totalValue > opponentTotalValue) {
            winner = player;
            loser = opponent;
        } else if (opponentTotalValue > totalValue) {
            winner = opponent;
            loser = player;
        } else {
            // In case of a tie, compare the shuffled cards one at a time
            for (let i = 0; i < 3; i++) {
                const cardValue = validPlayerCards[i].type.value;
                const opponentCardValue = validOpponentCards[i].type.value;

                if (cardValue > opponentCardValue) {
                    winner = player;
                    loser = opponent;
                    break;
                } else if (opponentCardValue > cardValue) {
                    winner = opponent;
                    loser = player;
                    break;
                }
            }
        }

        if (loser?.points) {
            await this.resolveParadox(game, winner, loser);
        }
    }

    static async resolveParadox(game: Game, player: Player, opponent?: Player) {
        // award player a point
        const playerPoints = player.points + 1;

        await Player.update({
            points: playerPoints,
        }, {
            where: {
               id: player.id
            },
        });

        // deduct a point from opponent (only happens in combat)
        if (opponent) {
            await Player.update({
                points: opponent.points - 1,
            }, {
                    where: {
                    id: opponent.id
                },
            });
        }

        // advance the codex color clockwise
        game.codexColor = this.getNextCodeColor(game.codexColor);

        // check victory condition
        if (playerPoints === 5) {
            game.winnerId = player.userId;
            game.state = GameState.ENDED;
        }

        await game.save();
    }

    static async swapCards(playerId: number, sourceCardId: number, continuumCardId: number, targetIndex: number) {
        await Card.update({
            index: null,
            playerId,
        }, {
            where: {
                id: continuumCardId,
            }
        });

        await Card.update({
            index: targetIndex,
            playerId: null,
        }, {
            where: {
                id: sourceCardId,
            }
        });
    }
}

export default CommandService;
