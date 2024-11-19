
import moment from 'moment';

import { CardState } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import {
    ActionType,
    IActionPayload,
    IPlayBandPayload
} from '@interfaces/action.interface';
import { GameState, IGameState } from '@interfaces/game.interface';

import Card from '@models/card.model';
import Player from '@models/player.model';
import Game from '@models/game.model';
import User from '@models/user.model';

import ActionService from '@services/action/action.service';
import GameService from '@services/game/game.service';

import BotTokenHandler from './bot-token.handler';
import BotPlayBandHandler from './bot-play-band.handler';
import BotPickUpCardHandler from './bot-pick-up-card.handler';
import BotKeepCardsHandler from './bot-keep-cards.handler';

export default class BotService {

    static getCardsInHand(player: Player): Card[] {
        return player.cards.filter(card => card.state === CardState.IN_HAND);
    }

    static getCardsInMarket(gameState: IGameState): Card[] {
        return gameState.cards.filter(card => card.state === CardState.IN_MARKET);
    }

    static getCardsInDeck(gameState: IGameState): Card[] {
        return gameState.cards.filter(card => card.state === CardState.IN_DECK);
    }

    static preSortBandActions(actions: IActionPayload[], cardsInHand: Card[]): IPlayBandPayload[] {
        const playBandActions = actions.filter(action => action.type === ActionType.PLAY_BAND);
        let centaurBandActions = [];
        let elfBandActions = [];
        let otherBandActions = [];

        for (const action of playBandActions) {
            const leader = cardsInHand.find(card => card.id === action.leaderId);
            if (leader.tribe.name === TribeName.CENTAURS) {
                centaurBandActions.push(action);
            } else if (leader.tribe.name === TribeName.ELVES) {
                elfBandActions.push(action);
            } else {
                otherBandActions.push(action);
            }
        }

        elfBandActions.sort((a, b) => b.cardIds.length - a.cardIds.length);
        centaurBandActions.sort((a, b) => b.cardIds.length - a.cardIds.length);
        otherBandActions.sort((a, b) => b.cardIds.length - a.cardIds.length);

        return [...centaurBandActions, ...elfBandActions, ...otherBandActions];
    }

    static async takeTurn(gameId: number, playerId: number) {
        try {
            const gameState = await GameService.getState(gameId);
            const player = gameState.players.find(player => player.id === playerId);

            if (player.id !== gameState.activePlayerId) {
                return;
            }

            const actions = await ActionService.getActions(gameId, player.userId, gameState);
            const regions = gameState.regions;
            const cardsInHand = this.getCardsInHand(player);
            const cardsInMarket = this.getCardsInMarket(gameState);
            const cardsInDeck = this.getCardsInDeck(gameState);
            const sortedPlayBandActions = this.preSortBandActions(actions, cardsInHand);

            if (await BotTokenHandler.handleFreeTokenAction(actions, regions, player)) return;

            if (await BotKeepCardsHandler.keepCards(actions, cardsInHand, player)) return;

            if (await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, player)) return;

            if (await BotPlayBandHandler.playSingleOrc(sortedPlayBandActions, cardsInHand, player)) return;

            if (await BotPlayBandHandler.playBestBandAction(sortedPlayBandActions, cardsInHand, regions, player, gameState.age)) return;

            if (await BotPlayBandHandler.playHighValueBandAction(sortedPlayBandActions, cardsInHand, cardsInDeck, player)) return;

            if (await BotPickUpCardHandler.pickUpOrDrawCard(actions, cardsInHand, cardsInMarket, player)) return;

            await BotPlayBandHandler.playBandFallbackAction(actions, cardsInHand, player);

        } catch (error) {
            console.log(error);
        }
    }

    static async activateStaleBots() {
        const activeGames = await Game.findAll({
            where: {
                state: GameState.STARTED,
            },
            include: [
                {
                    model: Player,
                    as: 'players',
                    include: [
                        {
                            model: User,
                        }
                    ]
                }
            ]
        });

        for (const game of activeGames) {
            const activePlayer = game.players.find(player => player.id === game.activePlayerId);

            if (activePlayer.user.isBot) {
                if (moment().diff(game.updatedAt, 'seconds') > 5) {
                    await BotService.takeTurn(game.id, activePlayer.id);
                }
            }
        }
    }
}
