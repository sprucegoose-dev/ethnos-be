import { Op } from 'sequelize';

import {
    ActionType,
    IBandDetails,
    IKeepCardsPayload,
} from '@interfaces/action.interface';

import Game from '@models/game.model';
import Player from '@models/player.model';
import NextAction from '@models/next-action.model';

import { CardState } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { Color } from '@interfaces/game.interface';
import { NextActionState } from '@interfaces/next-action.interface';

import DrawCardHandler from './draw-card.handler';
import { CustomException, ERROR_BAD_REQUEST } from '../../helpers/exception-handler';
import Card from '../../models/card.model';

const {
    GIANTS,
    MERFOLK,
    ORCS,
    TROLLS,
    WIZARDS,
} = TribeName;

export const MERFOLK_TRACK_CHECKPOINTS = [3, 7, 12, 18];

export default class TribeHandler {

    static async handleGiantBand(player: Player, bandSize: number) {
        const largestGiantBand = await Player.findOne({
            where: {
                gameId: player.gameId,
                giantTokenValue: {
                    [Op.gte]: bandSize
                }
            }
        });

        if (!largestGiantBand) {
            await Player.update({
                giantTokenValue: bandSize,
                points: player.points + 2,
            }, {
                where: {
                    id: player.id,
                }
            });
        }
    }

    static async handleOrcTokens(player: Player, color: Color) {
        if (!player.orcTokens.includes(color)) {
            await Player.update(
                { orcTokens: [...player.orcTokens, color] },
                {
                    where: {
                        id: player.id,
                    }
                }
            );
        }
    }

    static async handleMerfolkTrack(player: Player, bandSize: number): Promise<void> {
        let freeTokens = 0;

        for (let i = 1; i <= bandSize; i++) {
            if (MERFOLK_TRACK_CHECKPOINTS.includes(player.merfolkTrackScore + i)) {
                freeTokens++;
            }
        }

        for (let i = 0; i < freeTokens; i++) {
            await NextAction.create({
                gameId: player.gameId,
                playerId: player.id,
                type: ActionType.ADD_FREE_TOKEN,
                state: NextActionState.PENDING
            });
        }

        await Player.update({
            merfolkTrackScore: player.merfolkTrackScore + bandSize,
        },
        {
            where: {
                id: player.id,
            }
        });
    }

    static async handleTribeLogic(game: Game, player: Player, band: IBandDetails): Promise<void> {
        const {
            bandSize,
            color,
            tribe,
        } = band;

        switch (tribe) {
            case ORCS:
                await this.handleOrcTokens(player, color);
                break;
            case GIANTS:
                await this.handleGiantBand(player, bandSize);
                break;
            case MERFOLK:
                await this.handleMerfolkTrack(player, bandSize);
                break;
            case WIZARDS:
                await this.handleWizardDraw(game, player, bandSize);
                break;
            case TROLLS:
                await this.handleTrollTokens(game, player, bandSize);
                break;
        }
    }

    static async handleTrollTokens(game: Game, player: Player, bandSize: number) {
        let claimedTokens: number[] = [];

        game.players.map(player => {
            claimedTokens = [...claimedTokens, ...player.trollTokens]
        });

        const trollTokens = [6, 5, 4, 3, 2, 1].filter(token => !claimedTokens.includes(token));

        if (trollTokens.includes(bandSize)) {
            await Player.update(
                { trollTokens: [...player.trollTokens, bandSize] },
                {
                    where: {
                        id: player.id,
                    }
                }
            )
        } else {
            const smallerToken = trollTokens.find(token => token < bandSize);

            if (smallerToken) {
                await Player.update(
                    { trollTokens: [...player.trollTokens, smallerToken] },
                    {
                        where: {
                            id: player.id,
                        }
                    }
                );
            }
        }
    }

    static async handleWizardDraw(game: Game, player: Player, bandSize: number) {
        const cardsInDeck = game.cards.filter(card => card.state === CardState.IN_DECK)
            .sort((cardA, cardB) => cardA.index - cardB.index);
        const maxDrawSize = Math.min(bandSize, cardsInDeck.length);
        await DrawCardHandler.handleDrawCard(game, player, maxDrawSize, false);
    }

    static async handleElfKeepCards(player: Player, action: IKeepCardsPayload, nextAction: NextAction) {
        if (!Array.isArray(action.cardIds)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'cardIds must be an array');
        }

        if (action.cardIds.length !== nextAction.value) {
            throw new CustomException(ERROR_BAD_REQUEST, `You must choose exactly ${nextAction.value} cards to keep`);
        }

        const cardInHandIds = player.cards.filter(card =>
            card.state === CardState.IN_HAND
        ).map(card => card.id);

        if (!action.cardIds.every(cardId => cardInHandIds.includes(cardId))) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid card IDs supplied');
        }

        const cardIdsToDiscard = cardInHandIds.filter(cardId => !action.cardIds.includes(cardId));

        await Card.update({
            state: CardState.IN_MARKET
        }, {
            where: {
                id: {
                    [Op.in]: cardIdsToDiscard
                }
            }
        });

        await NextAction.update({
            state: NextActionState.RESOLVED
        }, {
            where: {
                id: nextAction.id
            }
        });
    }
}

