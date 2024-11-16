import {
    ActionType,
    IActionPayload,
    IKeepCardsPayload
} from '@interfaces/action.interface';

import Card from '@models/card.model';

import CommandService from '@services/command/command.service';
import NextAction from '../../models/nextAction.model';
import Player from '../../models/player.model';

export default class BotKeepCardsHandler {

    static async keepCards(actions: IActionPayload[], cardsInHand: Card[], player: Player) {
        const keepCardsAction = actions.find(action => action.type === ActionType.KEEP_CARDS);

        if (keepCardsAction) {
            const nextAction = await NextAction.findOne({
                where: {
                    id: keepCardsAction.nextActionId
                }
            });

            const action: IKeepCardsPayload = {
                type: ActionType.KEEP_CARDS,
                cardIds: cardsInHand.slice(0, nextAction.value).map(card => card.id),
                nextActionId: nextAction.id
            };
            await CommandService.handleAction(player.userId, player.gameId, action);
            return true;
        }

        return false;
    }
}
