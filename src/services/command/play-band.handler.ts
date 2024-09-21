import {
    ActionType,
    IBandDetails,
    INextActionPayload,
    IPlayBandPayload
} from '../../types/action.interface';
import {
    CustomException,
    ERROR_BAD_REQUEST,
} from '../../helpers/exception_handler';
import { Game } from '../../models/game.model';
import { Player } from '../../models/player.model';
import { CardState } from '../../types/card.interface';
import { TribeName } from '../../types/tribe.interface';
import { Card } from '../../models/card.model';
import { Op } from 'sequelize';
import { Region } from '../../models/region.model';
import PlayerRegion from '../../models/player_region.model';
import {
    Color,
} from '../../types/game.interface';
import { IRemainingCardsOptions } from '../../types/command.interface';
import { ActionService } from '../action/action.service';
import { NextAction } from '../../models/nextAction.model';
import { NextActionState } from '../../types/nextAction.interface';
import TribeService from './tribe.handler';

const {
    CENTAUR,
    ELF,
    HALFLING,
    MINOTAUR,
    SKELETON,
    WINGFOLK,
} = TribeName;

export default class PlayBandHandler {

    static async addTokenToRegion(game: Game, player: Player, band: IBandDetails, remainingCards: Card[] = []): Promise<void> {
        const {
            bandSize,
            color,
            tribe,
        } = band;

        const region = await this.getRegion(game, color);
        let playerRegion = await this.getPlayerRegion(region, player);

        if (!playerRegion) {
            playerRegion = await PlayerRegion.create({
                playerId: player.id,
                regionId: region.id,
            });
        }

        if (tribe !== HALFLING && bandSize > playerRegion.tokens) {
            await playerRegion.update({ tokens: playerRegion.tokens + 1 });

            if (tribe === CENTAUR && remainingCards.length) {
                await NextAction.create({
                    gameId: game.id,
                    playerId: player.id,
                    type: ActionType.PLAY_BAND,
                    state: NextActionState.PENDING
                });
            }
        }
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
        nextActions,
        player,
        cardIdsToKeep,
        band,
    }: IRemainingCardsOptions) {
        if (band.tribe === ELF) {
            remainingCards = this.filterOutCardsToKeep(remainingCards, cardIdsToKeep, band.bandSize);
        }

        if (band.tribe === CENTAUR && nextActions.find(action => action.type === ActionType.PLAY_BAND)) {
            return;
        }

        if (remainingCards.length) {
            await Card.update({
                state: CardState.IN_MARKET,
                playerId: player.id,
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

    static getRemainingCards(player: Player, cardIds: number[]): Card[] {
        return player.cards.filter(card => !cardIds.includes(card.id));
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

    static async handlePlayBand(game: Game, player: Player, payload: IPlayBandPayload): Promise<INextActionPayload[]> {
        const leader = player.cards.find(card => card.id === payload.leaderId);
        const band = this.getBandDetails(leader, payload.cardIds, payload.regionColor);
        const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);
        let remainingCards = this.getRemainingCards(player, payload.cardIds);

        this.validateBand(cardsInHand, payload.cardIds, leader);

        await this.assignCardsToBand(player, payload.cardIds, leader.id);

        await this.addTokenToRegion(game, player, band, remainingCards);

        await TribeService.handleTribeLogic(game,player, band);

        const nextActions = await NextAction.findAll({
            where: {
                gameId: game.id,
                state: NextActionState.PENDING,
            }
        });

        await this.discardRemainingCards({
            remainingCards,
            nextActions,
            player,
            cardIdsToKeep: payload.cardIdsToKeep,
            band,
        });

        return nextActions;
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
