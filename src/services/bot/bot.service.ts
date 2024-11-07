
import { CardState } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import {
    ActionType,
    IActionPayload,
    IPlayBandPayload
} from '@interfaces/action.interface';

import Card from '@models/card.model';
import Player from '@models/player.model';
import Region from '@models/region.model';
import Game from '@models/game.model';

import ActionService from '@services/action/action.service';
import GameService from '@services/game/game.service';

import BotTokenHandler from './bot-token.handler';
import BotPlayBandHandler from './bot-play-band.handler';
import BotPickUpCardHandler from './bot-pick-up-card.handler';

export default class BotService {

    static getCardsInHand(player: Player): Card[] {
        return player.cards.filter(card => card.state === CardState.IN_HAND);
    }

    static getCardsInMarket(gameState: Game): Card[] {
        return gameState.cards.filter(card => card.state === CardState.IN_MARKET);
    }

    static getTotalRegionValue(region: Region): number {
        return region.values.reduce((total, value) => total + value, 0);
    }

    static preSortBandActions(actions: IActionPayload[], cardsInHand: Card[]): IPlayBandPayload[] {
        const playBandActions = actions.filter(action => action.type === ActionType.PLAY_BAND);
        let centaurBandActions = [];
        let otherBandActions = [];

        for (const action of playBandActions) {
            const leader = cardsInHand.find(card => card.id === action.leaderId);
            if (leader.tribe.name === TribeName.CENTAURS) {
                centaurBandActions.push(action);
            } else {
                otherBandActions.push(action);
            }
        }

        centaurBandActions.sort((a, b) => b.cardIds.length - a.cardIds.length);
        otherBandActions.sort((a, b) => b.cardIds.length - a.cardIds.length);

        return [...centaurBandActions, ...otherBandActions];
    }

    static async takeTurn(gameId: number, playerId: number) {
        const gameState = await GameService.getState(gameId);
        const player = gameState.players.find(player => player.id === playerId);
        const actions = await ActionService.getActions(gameId, player.userId);
        const regions = gameState.regions;
        const cardsInHand = this.getCardsInHand(player);
        const cardsInMarket = this.getCardsInMarket(gameState);
        const sortedPlayBandActions = this.preSortBandActions(actions, cardsInHand);

        if (await BotTokenHandler.handleFreeTokenAction(actions, regions, player)) return;

        if (await BotPickUpCardHandler.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, player)) return;

        if (await BotPlayBandHandler.playBestBandAction(sortedPlayBandActions, cardsInHand, regions, player)) return;

        if (await BotPlayBandHandler.playHighValueBandAction(sortedPlayBandActions, cardsInHand, player)) return;

        if (await BotPickUpCardHandler.pickUpOrDrawCard(cardsInHand, cardsInMarket, player)) return;

        await BotPlayBandHandler.playBandFallbackAction(actions, cardsInHand, player);
    }
}
