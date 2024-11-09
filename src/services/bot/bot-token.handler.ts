import { ActionType, IActionPayload, IAddFreeTokenPayload } from '@interfaces/action.interface';
import { Color } from '@interfaces/game.interface';
import Player from '@models/player.model';
import Region from '@models/region.model';
import CommandService from '@services/command/command.service';

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
        for (const region of sortedRegions) {
            const regionTotalValue = region.values.reduce((acc, num) => acc + num, 0);

            if (regionTotalValue > highestValue) {
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

    static async handleFreeTokenAction(actions: IActionPayload[], regions: Region[], player: Player): Promise<boolean> {
        const freeTokenAction = actions.find(action => action.type === ActionType.ADD_FREE_TOKEN);

        if (freeTokenAction) {
            await BotTokenHandler.addFreeTokenToRegion(player, regions, freeTokenAction.nextActionId);
            return true;
        }

        return false;
    }
}
