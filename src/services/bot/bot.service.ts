import shuffle from 'lodash.shuffle';

import { CardState } from '@interfaces/card.interface';
import { Color } from '@interfaces/game.interface';
import { TribeName } from '@interfaces/tribe.interface';
import {
    ActionType,
    IActionPayload,
    IAddFreeTokenPayload,
    IBandDetails,
    IPlayBandPayload
} from '@interfaces/action.interface';

import Card from '@models/card.model';
import Player from '@models/player.model';
import Region from '@models/region.model';

import ActionService from '@services/action/action.service';
import CommandService from '@services/command/command.service';
import PlayBandHandler from '@services/command/play-band.handler';
import GameService from '@services/game/game.service';
import Game from '../../models/game.model';
import BotTokenHandler from './bot.token.handler';

const tribePriority = {
    [TribeName.DRAGON]: -1,
    [TribeName.SKELETONS]: 0,
    [TribeName.HALFLINGS]: 1,
    [TribeName.WINGFOLK]: 2,
    [TribeName.CENTAURS]: 3,
    [TribeName.MINOTAURS]: 4,
    [TribeName.ORCS]: 5,
    [TribeName.GIANTS]: 6,
    [TribeName.TROLLS]: 7,
    [TribeName.ELVES]: 8,
    [TribeName.WIZARDS]: 9,
    [TribeName.DWARVES]: 10,
    [TribeName.MERFOLK]: 11,
};

export default class BotService {

    static canAddTokenToRegion(region: Region, bandDetails: IBandDetails, player: Player): boolean {
        return bandDetails.bandSize > this.getPlayerTokensInRegion(region, player);
    }

    static canAddTokenWithBand(action: IPlayBandPayload, cardsInHand: Card[], regions: Region[], player: Player): Region {
        const leader = cardsInHand.find(card => card.id === action.leaderId);
        const bandDetails = PlayBandHandler.getBandDetails(leader, action.cardIds);
        let region = regions.find(region => region.color === leader.color);
        let canAddToken = this.canAddTokenToRegion(region, bandDetails, player);

        if (leader.tribe.name === TribeName.WINGFOLK) {
            const upgradeableRegions: Region[] = [];

            for (const region of regions) {
                canAddToken = this.canAddTokenToRegion(region, bandDetails, player);

                if (canAddToken) {
                    upgradeableRegions.push(region);
                }
            }

            region = upgradeableRegions.sort((regionA, regionB) => this.getTotalRegionValue(regionB) - this.getTotalRegionValue(regionA))[0];
        }

        return region;
    }

    static async emptyHandPickUpOrDrawCard(actions: IActionPayload[], cardsInHand: Card[], cardsInMarket: Card[], player: Player): Promise<boolean> {
        if (!cardsInHand.length) {
            if (cardsInMarket.length && actions.find(action => action.type === ActionType.PICK_UP_CARD)) {
                await CommandService.handleAction(player.userId, player.gameId, {
                    type: ActionType.PICK_UP_CARD,
                    cardId: shuffle(cardsInMarket)[0].id
                });
                return true;
            }
            if (actions.find(action => action.type === ActionType.DRAW_CARD)) {
                await CommandService.handleAction(player.userId, player.gameId, { type: ActionType.DRAW_CARD });
                return true;
            }
        }
        return false;
    }

    static getCardsInHand(player: Player): Card[] {
        return player.cards.filter(card => card.state === CardState.IN_HAND);
    }

    static getCardsInMarket(gameState: Game): Card[] {
        return gameState.cards.filter(card => card.state === CardState.IN_MARKET);
    }

    static getHighValuePlayBandAction(actions: IPlayBandPayload[], cardsInHand: Card[]): IPlayBandPayload {
        let highValueAction;
        let highestPointValue = 0;

        for (const action of actions) {
            const leader = cardsInHand.find(card => card.id === action.leaderId);
            const bandDetails = PlayBandHandler.getBandDetails(leader, action.cardIds);

            if (bandDetails.points >= 10 && bandDetails.points > highestPointValue) {
                highValueAction = action;
                highestPointValue = bandDetails.points;
            }
        }

        return highValueAction;
    }

    static getMostFrequentColorInHand(cards: Card[]): { color: Color, maxCount: number } {
        const counts = cards.reduce<{[key: string]: number}>((acc, card) => {
            const key = card.color;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        let mostFrequent: Color = null;
        let maxCount = 0;

        for (const [value, count] of Object.entries(counts)) {
            if (count > maxCount) {
                mostFrequent = value as Color;
                maxCount = count;
            }
        }

        return {
            color: mostFrequent,
            maxCount,
        };
    }

    static getMostFrequentTribeInHand(cards: Card[]): { tribeName: TribeName, maxCount: number } {
        const counts = cards.reduce<{[key: string]: number}>((acc, card) => {
            const key = card.tribe.name;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        let mostFrequent: TribeName = null;
        let maxCount = 0;

        for (const [value, count] of Object.entries(counts)) {
            if (count > maxCount) {
                mostFrequent = value as TribeName;
                maxCount = count;
            }
        }

        return {
            tribeName: mostFrequent,
            maxCount,
        };
    }

    static getPlayerTokensInRegion(region: Region, player: Player): number {
        return region.playerTokens.find(tokenData => tokenData.playerId === player.id)?.tokens || 0;
    }

    static getTotalRegionValue(region: Region): number {
        return region.values.reduce((total, value) => total + value, 0);
    }

    static async handleFreeTokenAction(actions: IActionPayload[], regions: Region[], player: Player): Promise<boolean> {
        const freeTokenAction = actions.find(action => action.type === ActionType.ADD_FREE_TOKEN);
        if (freeTokenAction) {
            await BotTokenHandler.addFreeTokenToRegion(player, regions, freeTokenAction.nextActionId);
            return true;
        }
        return false;
    }

    static isSkeletonsOnlyHand(cardsInHand: Card[]): boolean {
        return cardsInHand.length > 0 && cardsInHand.every(card => card.tribe.name === TribeName.SKELETONS);
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

    static async pickUpOrDrawCard(cardsInHand: Card[], cardsInMarket: Card[], player: Player): Promise<boolean> {
        const cardToPickUpId = this.shouldPickUpMarketCard(cardsInHand, cardsInMarket);
        if (cardToPickUpId) {
            await CommandService.handleAction(player.userId, player.gameId, {
                type: ActionType.PICK_UP_CARD,
                cardId: cardToPickUpId
            });
            return true;
        }

        if (cardsInHand.length < 10) {
            await CommandService.handleAction(player.userId, player.gameId, { type: ActionType.DRAW_CARD });
            return true;
        }

        return false;
    }

    static async playBestBandAction(sortedPlayBandActions: IPlayBandPayload[], cardsInHand: Card[], regions: Region[], player: Player): Promise<boolean> {
        let targetRegion;
        let bestPlayBandAction;

        for (const action of sortedPlayBandActions) {
            targetRegion = this.canAddTokenWithBand(action, cardsInHand, regions, player);

            if (targetRegion) {
                bestPlayBandAction = action;
                break;
            }
        }

        if (bestPlayBandAction && targetRegion) {
            await CommandService.handleAction(player.userId, player.gameId, {
                ...bestPlayBandAction,
                regionColor: targetRegion.color
            });
            return true;
        }

        return false;
    }

    static async playFallbackAction(actions: IActionPayload[], cardsInHand: Card[], player: Player) {
        const fallbackPlayAction = actions
            .filter(action => action.type === ActionType.PLAY_BAND)
            .sort((actionA, actionB) => {
                const leaderA = cardsInHand.find(card => card.id === actionA.leaderId);
                const leaderB = cardsInHand.find(card => card.id === actionB.leaderId);

                return actionB.cardIds.length - actionA.cardIds.length ||
                    tribePriority[leaderB.tribe.name] - tribePriority[leaderA.tribe.name]
            })[0];

        await CommandService.handleAction(player.userId, player.gameId, fallbackPlayAction);
    }

    static shouldPickUpMarketCard(cardsInHand: Card[], cardsInMarket: Card[]): number {
        let cardToPickUpId: number;

        if (this.isSkeletonsOnlyHand(cardsInHand) && cardsInMarket.length) {
            cardToPickUpId = cardsInMarket
                .filter(card => card.tribe.name !== TribeName.SKELETONS)
                .sort((cardA, cardB) => tribePriority[cardB.tribe.name] - tribePriority[cardA.tribe.name])[0]?.id;

            if (cardToPickUpId){
                return cardToPickUpId;
            }
        }

        const mostFrequentColor = this.getMostFrequentColorInHand(cardsInHand);

        for (const card of cardsInMarket) {
            if (card.color === mostFrequentColor.color) {
                cardToPickUpId = card.id;
            }
        }

        const mostFrequentTribe = this.getMostFrequentTribeInHand(cardsInHand);

        if (!cardToPickUpId || mostFrequentTribe.maxCount > mostFrequentColor.maxCount) {
            for (const card of cardsInMarket) {
                if (card.tribe.name === mostFrequentTribe.tribeName) {
                    cardToPickUpId = card.id;
                }
            }
        }

        return cardToPickUpId;
    }

    static async takeTurn(gameId: number, playerId: number) {
        const gameState = await GameService.getState(gameId);
        const player = gameState.players.find(player => player.id === playerId);
        const actions = await ActionService.getActions(gameId, player.userId);
        const regions = gameState.regions;
        const cardsInHand = this.getCardsInHand(player);
        const cardsInMarket = this.getCardsInMarket(gameState);

        if (await this.handleFreeTokenAction(actions, regions, player)) return;

        if (await this.emptyHandPickUpOrDrawCard(actions, cardsInHand, cardsInMarket, player)) return;

        const sortedPlayBandActions = this.preSortBandActions(actions, cardsInHand);

        if (await this.playBestBandAction(sortedPlayBandActions, cardsInHand, regions, player)) return;

        if (await this.pickUpOrDrawCard(cardsInHand, cardsInMarket, player)) return;

        await this.playFallbackAction(actions, cardsInHand, player);
    }
}
