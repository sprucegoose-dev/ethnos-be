import { ActionType, IActionPayload, IAddFreeTokenPayload } from '@interfaces/action.interface';
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

        // out of those regions, find the most valuable one
        // exclude regions where the player already has a token advantage of 2 tokens or more
        for (const region of sortedRegions) {
            const regionTotalValue = region.values.reduce((acc, num) => acc + num, 0);

            if (regionTotalValue > highestValue && !BotTokenHandler.playerHasTokenAdvantage(player.id, region.playerTokens)) {
                highestValue = regionTotalValue;
                regionColor = region.color;
            }
        }

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
}
