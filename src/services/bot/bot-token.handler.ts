import {
    ActionType,
    IActionPayload,
    IAddFreeTokenPayload,
    IRemoveOrcTokensPayload
} from '@interfaces/action.interface';
import { Color } from '@interfaces/game.interface';
import Player from '@models/player.model';
import Region from '@models/region.model';
import CommandService from '@services/command/command.service';
import PlayerRegion from '../../models/player-region.model';

export default class BotTokenHandler {

    static async addFreeTokenToRegion(player: Player, regions: Region[], nextActionId: number) {
        // sort regions by the regions player has the most tokens in
        const sortedRegions = regions.sort((regionA, regionB) => {
            // istanbul ignore next
            const ownPlayerATokens = regionA.playerTokens.find(tokenData => tokenData.playerId === player.id)?.tokens || 0;
            // istanbul ignore next
            const ownPlayerBTokens = regionB.playerTokens.find(tokenData => tokenData.playerId === player.id)?.tokens || 0;
            return ownPlayerBTokens - ownPlayerATokens;
        });

        let highestValue = 0;
        let regionColor: Color;
        let fallbackHighestValue =  0;
        let fallbackRegionColor: Color;

        // out of those regions, find the most valuable one
        // exclude regions where the player already has a token advantage of 2 tokens or more
        for (const region of sortedRegions) {
            const regionTotalValue = region.values.reduce((acc, num) => acc + num, 0);

            if (regionTotalValue > highestValue && !BotTokenHandler.playerHasTokenAdvantage(player.id, region.playerTokens)) {
                highestValue = regionTotalValue;
                regionColor = region.color;
            }

            if (regionTotalValue > fallbackHighestValue) {
                fallbackHighestValue = regionTotalValue;
                fallbackRegionColor = region.color;
            }
        }

        regionColor = regionColor || fallbackRegionColor;

        const action: IAddFreeTokenPayload = {
            type: ActionType.ADD_FREE_TOKEN,
            nextActionId,
            regionColor
        };

        await CommandService.handleAction(player.userId, player.gameId, action);
    }

    static playerHasTokenAdvantage(playerId: number, playerRegion: PlayerRegion[], tokenAdvantage: number = 2): boolean {
        const playerTokens = playerRegion.find(tokenData => tokenData.playerId === playerId)?.tokens || 0;

        const maxOtherTokens = playerRegion
            .filter(tokenData => tokenData.playerId !== playerId)
            .reduce((max, tokenData) => Math.max(max, tokenData.tokens), 0);

        return playerTokens >= maxOtherTokens + tokenAdvantage;
    }

    static async handleFreeTokenAction(actions: IActionPayload[], regions: Region[], player: Player): Promise<boolean> {
        const freeTokenAction = actions.find(action => action.type === ActionType.ADD_FREE_TOKEN);

        if (freeTokenAction) {
            await BotTokenHandler.addFreeTokenToRegion(player, regions, freeTokenAction.nextActionId);
            return true;
        }

        return false;
    }

    static async removeOrcTokens(player: Player, actions: IActionPayload[]): Promise<boolean> {
        const removeOrcTokensAction = actions.find(action => action.type === ActionType.REMOVE_ORC_TOKENS);

        if (removeOrcTokensAction) {
            const action: IRemoveOrcTokensPayload = {
                type: ActionType.REMOVE_ORC_TOKENS,
                nextActionId: removeOrcTokensAction.nextActionId,
                tokens: []
            };

            if (player.orcTokens.length >= 4) {
                action.tokens = player.orcTokens;
            }

            await CommandService.handleAction(player.userId, player.gameId, action);

            return true;
        }

        return false;
    }
}
