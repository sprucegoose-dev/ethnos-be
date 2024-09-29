import { Op } from 'sequelize';

import {
    ActionType,
    IBandDetails,
    IPlayBandPayload
} from '@interfaces/action.interface';
import { CardState } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { Color } from '@interfaces/game.interface';
import { IRemainingCardsOptions } from '@interfaces/command.interface';
import { NextActionState } from '@interfaces/nextAction.interface';

import {
    CustomException,
    ERROR_BAD_REQUEST,
} from '@helpers/exception_handler';

import Game from '@models/game.model';
import Player from '@models/player.model';
import Card from '@models/card.model';
import Region from '@models/region.model';
import PlayerRegion from '@models/player_region.model';
import NextAction from '@models/nextAction.model';

import { ActionService } from '@services/action/action.service';

import TribeService from './tribe.handler';
import NextActionHandler from './next-action.handler';

const {
    CENTAUR,
    ELF,
    HALFLING,
    MINOTAUR,
    SKELETON,
    WINGFOLK,
} = TribeName;

export default class PlayBandHandler {

    static async addTokenToRegion(game: Game, player: Player, band: IBandDetails, remainingCards: Card[]): Promise<boolean> {
        const {
            bandSize,
            color,
            tribe,
        } = band;

        const region = await this.getRegion(game, color);
        let playerRegion = await this.getPlayerRegion(region, player);
        let tokenAdded = false;

        if (!playerRegion) {
            playerRegion = await PlayerRegion.create({
                playerId: player.id,
                regionId: region.id,
            });
        }

        if (tribe !== HALFLING && bandSize > playerRegion.tokens) {
            await playerRegion.update({ tokens: playerRegion.tokens + 1 });

            tokenAdded = true;

            if (tribe === CENTAUR && remainingCards.length) {
                await NextAction.create({
                    gameId: game.id,
                    playerId: player.id,
                    state: NextActionState.PENDING,
                    type: ActionType.PLAY_BAND
                });
            }
        }

        return tokenAdded;
    }

    static async assignCardsToBand(player: Player, bandCardIds: number[], leaderId: number) {
        await Card.update({
            state: CardState.IN_BAND,
            playerId: player.id,
            leaderId,
            index: null,
        }, {
            where: {
                id: {
                    [Op.in]: bandCardIds
                }
            }
        });
    }

    static async discardRemainingCards({
        remainingCards,
        tokenAdded,
        player,
        cardIdsToKeep,
        band,
    }: IRemainingCardsOptions) {
        if (band.tribe === ELF) {
            remainingCards = this.filterOutCardsToKeep(remainingCards, cardIdsToKeep, band.bandSize);
        }

        if (band.tribe === CENTAUR && tokenAdded) {
            return;
        }

        if (remainingCards.length) {
            await Card.update({
                state: CardState.IN_MARKET,
                playerId: null,
                leaderId: null,
                index: null,
            }, {
                where: {
                    playerId: player.id,
                    id: { [Op.in]: remainingCards.map(card => card.id) }
                }
            });
        }
    }

    static filterOutCardsToKeep = (remainingCards: Card[], cardIdsToKeep: number[], bandSize: number) => {
        if (!Array.isArray(cardIdsToKeep)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'cardIdsToKeep must be an array');
        }

        const remainingCardIds = remainingCards.map(card => card.id);

        if (!cardIdsToKeep.every(cardId => remainingCardIds.includes(cardId))) {
            throw new CustomException(ERROR_BAD_REQUEST, "cardIdsToKeep must only include IDs of cards in a player's hand");
        }

        if (cardIdsToKeep.length > bandSize) {
            throw new CustomException(ERROR_BAD_REQUEST, "cardIdsToKeep must not exceed the size of the band");
        }

        return remainingCards.filter(card => !cardIdsToKeep.includes(card.id));
    }

    static getBandDetails(leader: Card, bandCardIds: number[], regionColor?: Color): IBandDetails {
        let tribe = leader.tribe.name;
        let color = leader.color;
        let bandSize = bandCardIds.length;

        if (tribe === MINOTAUR) {
            bandSize++;
        }

        if (tribe === WINGFOLK && regionColor) {
            color = regionColor;
        }

        return { tribe, color, bandSize };
    }

    static getRemainingCards(cardsInHand: Card[], bandCardIds: number[]): Card[] {
        return cardsInHand.filter(card => !bandCardIds.includes(card.id));
    }

    static async getPlayerRegion(region: Region, player: Player): Promise<PlayerRegion> {
        return PlayerRegion.findOne({
            where: {
                regionId: region.id,
                playerId: player.id
            }
        });
    }

    static async getRegion(game: Game, color: Color): Promise<Region> {
        return Region.findOne({ where: { gameId: game.id, color } });
    }

    static async handlePlayBand(game: Game, player: Player, payload: IPlayBandPayload): Promise<void> {
        const leader = player.cards.find(card => card.id === payload.leaderId);
        const band = this.getBandDetails(leader, payload.cardIds, payload.regionColor);
        const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);
        let remainingCards = this.getRemainingCards(cardsInHand, payload.cardIds);

        this.validateBand(cardsInHand, payload.cardIds, leader);

        await NextActionHandler.resolvePendingNextAction(payload.nextActionId);

        await this.assignCardsToBand(player, payload.cardIds, leader.id);

        const tokenAdded = await this.addTokenToRegion(game, player, band, remainingCards);

        await TribeService.handleTribeLogic(game,player, band);

        await this.discardRemainingCards({
            remainingCards,
            tokenAdded,
            player,
            cardIdsToKeep: payload.cardIdsToKeep,
            band,
        });

        // TODO: test
        if (payload.nextActionId) {
            await NextAction.update({
                state: NextActionState.RESOLVED,
            }, {
                where: {
                    id: payload.nextActionId
                }
            });
        }
    }

    static validateBand(cardsInHand: Card[], bandCardIds: number[], leader: Card): boolean {
        if (leader.tribe.name === SKELETON) {
            throw new CustomException(ERROR_BAD_REQUEST, 'A Skeleton cannot be the leader of a band');
        }

        const validActions = ActionService.getPlayBandActions(cardsInHand);

        let isValid = false;

        for (const action of validActions) {
            const validCardIds = action.cardIds;

            if (bandCardIds.every(cardId => validCardIds.includes(cardId))) {
                isValid = true;
                break;
            }
        }

        if (!isValid) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid band');
        }

        return isValid;
    }
}
