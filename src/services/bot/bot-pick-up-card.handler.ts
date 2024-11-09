import shuffle from 'lodash.shuffle';

import { TribeName } from '@interfaces/tribe.interface';
import { Color } from '@interfaces/game.interface';
import { ActionType, IActionPayload } from '@interfaces/action.interface';

import Card from '@models/card.model';
import Player from '@models/player.model';

import CommandService from '../command/command.service';
import { TRIBE_PRIORITY } from './constants';

export default class BotPickUpCardHandler {

    static async emptyHandPickUpOrDrawCard(actions: IActionPayload[], cardsInHand: Card[], cardsInMarket: Card[], player: Player): Promise<boolean> {
        if (!cardsInHand.length) {
            if (cardsInMarket.length && actions.find(action => action.type === ActionType.PICK_UP_CARD)) {

                const unclaimedOrcCard = cardsInMarket.find(card => card.tribe.name === TribeName.ORCS &&
                    !player.orcTokens.includes(card.color)
                );

                if (unclaimedOrcCard) {
                    await CommandService.handleAction(player.userId, player.gameId, {
                        type: ActionType.PICK_UP_CARD,
                        cardId: unclaimedOrcCard.id
                    });
                    return true;
                }

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

    static getMostFrequentColorInHand(cards: Card[]): { color: Color, total: number } {
        const counts = cards.reduce<{[key: string]: number}>((acc, card) => {
            const key = card.color;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        let mostFrequent: Color = null;
        let highestCount = 0;

        for (const [value, count] of Object.entries(counts)) {
            if (count > highestCount) {
                mostFrequent = value as Color;
                highestCount = count;
            }
        }

        return {
            color: mostFrequent,
            total: highestCount,
        };
    }

    static getMostFrequentTribeInHand(cards: Card[]): { tribeName: TribeName, total: number } {
        const counts = cards.reduce<{[key: string]: number}>((acc, card) => {
            const key = card.tribe.name;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        let mostFrequent: TribeName = null;
        let highestCount = 0;

        for (const [value, count] of Object.entries(counts)) {
            if (count > highestCount) {
                mostFrequent = value as TribeName;
                highestCount = count;
            }
        }

        return {
            tribeName: mostFrequent,
            total: highestCount,
        };
    }

    static isSkeletonsOnlyHand(cardsInHand: Card[]): boolean {
        return cardsInHand.length > 0 && cardsInHand.every(card => card.tribe.name === TribeName.SKELETONS);
    }

    static async pickUpOrDrawCard(cardsInHand: Card[], cardsInMarket: Card[], player: Player): Promise<boolean> {
        if (cardsInHand.length >= 10) {
            return false;
        }

        const cardToPickUpId = this.shouldPickUpMarketCard(cardsInHand, cardsInMarket);

        if (cardToPickUpId) {
            await CommandService.handleAction(player.userId, player.gameId, {
                type: ActionType.PICK_UP_CARD,
                cardId: cardToPickUpId
            });
            return true;
        }

        await CommandService.handleAction(player.userId, player.gameId, { type: ActionType.DRAW_CARD });
        return true;
    }

    static shouldPickUpMarketCard(cardsInHand: Card[], cardsInMarket: Card[]): number {
        let cardToPickUpId: number;

        if (this.isSkeletonsOnlyHand(cardsInHand) && cardsInMarket.length) {
            cardToPickUpId = cardsInMarket
                .filter(card => card.tribe.name !== TribeName.SKELETONS)
                .sort((cardA, cardB) => TRIBE_PRIORITY[cardB.tribe.name] - TRIBE_PRIORITY[cardA.tribe.name])[0]?.id;

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

        if (!cardToPickUpId || mostFrequentTribe.total > mostFrequentColor.total) {
            for (const card of cardsInMarket) {
                if (card.tribe.name === mostFrequentTribe.tribeName) {
                    cardToPickUpId = card.id;
                }
            }
        }

        return cardToPickUpId;
    }
}
