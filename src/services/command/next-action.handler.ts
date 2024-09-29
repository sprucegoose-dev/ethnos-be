import { NextActionState } from '@interfaces/nextAction.interface';

import NextAction from '@models/nextAction.model';

export default class NextActionHandler {

    static async resolvePendingNextAction(nextActionId: number): Promise<void> {
        if (!nextActionId) {
            return;
        }

        await NextAction.update({
            state: NextActionState.RESOLVED,
        }, {
            where: {
                id: nextActionId
            }
        });
    }
}
