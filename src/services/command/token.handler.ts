import Game from '@models/game.model';
import Player from '@models/player.model';
import Region from '@models/region.model';
import PlayerRegion from '@models/player_region.model';

import { IAddFreeTokenPayload } from '@interfaces/action.interface';

import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND
} from '@helpers/exception_handler';
import NextAction from '../../models/nextAction.model';
import { NextActionState } from '../../interfaces/nextAction.interface';


export default class TokenHandler {

    static async addFreeTokenToRegion(game: Game, player: Player, payload: IAddFreeTokenPayload): Promise<void> {
        const nextAction = await NextAction.findOne({
            where: {
                id: payload.nextActionId,
                state: NextActionState.PENDING
            }
        });

        if (!nextAction) {
            throw new CustomException(ERROR_BAD_REQUEST, "A free token can be added only as an additional action");
        }

        const region = await Region.findOne({ where: { gameId: game.id, color: payload.regionColor } });

        if (!region) {
            throw new CustomException(ERROR_NOT_FOUND, 'Region not found');
        }

        let playerRegion = await PlayerRegion.findOne({
            where: {
                regionId: region.id,
                playerId: player.id
            }
        });

        if (!playerRegion) {
            playerRegion = await PlayerRegion.create({
                playerId: player.id,
                regionId: region.id,
            });
        }

        await playerRegion.update({ tokens: playerRegion.tokens + 1 });

        await nextAction.update({
            state: NextActionState.RESOLVED
        });
    }
}
