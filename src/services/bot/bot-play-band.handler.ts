import Card from '@models/card.model';
import Player from '@models/player.model';
import Region from '@models/region.model';

import {
    ActionType,
    IActionPayload,
    IBandDetails,
    IPlayBandPayload,
} from '@interfaces/action.interface';
import { TribeName } from '@interfaces/tribe.interface';

import CommandService from '@services/command/command.service';
import PlayBandHandler from '@services/command/play-band.handler';
import { TRIBE_PRIORITY } from './constants';

export default class BotPlayBandHandler {

    static getPlayerTokensInRegion(region: Region, player: Player): number {
        return region.playerTokens.find(tokenData => tokenData.playerId === player.id)?.tokens || 0;
    }

    static getTotalRegionValue(region: Region): number {
        return region.values.reduce((total, value) => total + value, 0);
    }

    static canAddTokenToRegion(region: Region, bandDetails: IBandDetails, player: Player): boolean {
        return bandDetails.bandSize > this.getPlayerTokensInRegion(region, player);
    }

    static getRegionIfUpgradeable(action: IPlayBandPayload, cardsInHand: Card[], regions: Region[], player: Player): Region {
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

        return canAddToken ? region : null;
    }

    static async playHighValueBandAction(actions: IPlayBandPayload[], cardsInHand: Card[], player: Player): Promise<boolean> {
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

        if (highValueAction) {
            await CommandService.handleAction(
                player.userId,
                player.gameId,
                highValueAction
            );
            return true;
        }

        return false;
    }

    static async playBestBandAction(
        sortedPlayBandActions: IPlayBandPayload[],
        cardsInHand: Card[],
        regions: Region[],
        player: Player
    ): Promise<boolean> {
        let targetRegion;

        for (const action of sortedPlayBandActions) {
            targetRegion = this.getRegionIfUpgradeable(action, cardsInHand, regions, player);

            if (targetRegion) {
                await CommandService.handleAction(player.userId, player.gameId, {
                    ...action,
                    regionColor: targetRegion.color
                });
                return true;
            }
        }

        return false;
    }

    static async playBandFallbackAction(actions: IActionPayload[], cardsInHand: Card[], player: Player) {
        const fallbackPlayAction = actions
            .filter(action => action.type === ActionType.PLAY_BAND)
            .sort((actionA, actionB) => {
                const leaderA = cardsInHand.find(card => card.id === actionA.leaderId);
                const leaderB = cardsInHand.find(card => card.id === actionB.leaderId);

                return actionB.cardIds.length - actionA.cardIds.length ||
                    TRIBE_PRIORITY[leaderB.tribe.name] - TRIBE_PRIORITY[leaderA.tribe.name]
            })[0];

        await CommandService.handleAction(player.userId, player.gameId, fallbackPlayAction);
    }
}
