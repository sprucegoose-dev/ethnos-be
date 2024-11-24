import { NextActionState } from '@interfaces/next-action.interface';

import NextAction from '@models/next-aciton.model';

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
