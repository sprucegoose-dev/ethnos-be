import { Op } from 'sequelize';

import {
    ActionType,
    IBandDetails,
} from '@interfaces/action.interface';

import Game from '@models/game.model';
import Player from '@models/player.model';
import NextAction from '@models/nextAction.model';

import { CardState } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { Color } from '@interfaces/game.interface';
import { NextActionState } from '@interfaces/nextAction.interface';

import DrawCardHandler from './draw-card.handler';

const {
    GIANT,
    MERFOLK,
    ORC,
    TROLL,
    WIZARD,
} = TribeName;

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
            await player.update({
                giantTokenValue: bandSize,
                points: player.points + 2,
            });
        }
    }

    static async handleOrcTokens(player: Player, color: Color) {
        if (!player.orcTokens.includes(color)) {
            await player.update({ orcTokens: [...player.orcTokens, color] });
        }
    }

    static async handleMerfolkTrack(player: Player, bandSize: number): Promise<void> {
        const merfolkTrackCheckpoints = [3, 7, 12, 18];
        let freeTokens = 0;

        for (let i = 1; i <= bandSize; i++) {
            if (merfolkTrackCheckpoints.includes(player.merfolkTrackScore + i)) {
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

        await player.update({
            merfolkTrackScore: player.merfolkTrackScore + bandSize,
        });
    }

    static async handleTribeLogic(game: Game, player: Player, band: IBandDetails): Promise<void> {
        const {
            bandSize,
            color,
            tribe,
        } = band;

        switch (tribe) {
            case ORC:
                await this.handleOrcTokens(player, color);
                break;
            case GIANT:
                await this.handleGiantBand(player, bandSize);
                break;
            case MERFOLK:
                await this.handleMerfolkTrack(player, bandSize);
                break;
            case WIZARD:
                await this.handleWizardDraw(game, player, bandSize);
                break;
            case TROLL:
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
            await player.update({ trollTokens: [...player.trollTokens, bandSize] });
        } else {
            const smallerToken = trollTokens.find(token => token < bandSize);

            if (smallerToken) {
                await player.update({ trollTokens: [...player.trollTokens, smallerToken] });
            }
        }
    }

    static async handleWizardDraw(game: Game, player: Player, bandSize: number) {
        const cardsInDeck = game.cards.filter(card => card.state === CardState.IN_DECK)
            .sort((cardA, cardB) => cardA.index - cardB.index);
        const maxDrawSize = Math.min(bandSize, cardsInDeck.length);

        for (let i = 0; i < maxDrawSize; i++) {
            await DrawCardHandler.handleDrawCard(game, player);
        }
    }
}

