import { ActionType } from '@interfaces/action.interface';

import ActionLogType from '@models/actionLogType.model';
import ActionLog from '@models/actionLog.model';
import Player from '@models/player.model';
import User from '@models/user.model';
import Region from '@models/region.model';

import { CustomException, ERROR_SERVER } from '@helpers/exception-handler';

import { IActionLogParams, IActionLogPayload, LogType } from './actionLog.types';

export default class ActionLogService {

    static async log({
       payload,
       playerId,
       gameId,
       regionId
    }: IActionLogParams): Promise<void> {
        const actionType = await ActionLogType.findOne({
            where: {
                type: payload.type,
            }
        });

        await ActionLogType.create({
            actionTypeId: actionType.id,
            gameId,
            playerId,
            leaderId: payload.type === ActionType.PLAY_BAND ? payload.leaderId : null,
            regionId,
        });
    }

    static formatLog(actionLog: ActionLog): IActionLogPayload {
        const actionType = actionLog.actionLogType.type;
        let username = actionLog.player.user.username;
        let actionLabel = '';


        switch (actionType) {
            case LogType.ADD_FREE_TOKEN:
                actionLabel = `${username} adds a free token to the ${actionLog.region.color} region`;
                break;
            case LogType.REVEAL_DRAGON:
                actionLabel = `${username} reveals a dragon`;
                break;
            default:
                throw new CustomException(ERROR_SERVER, `Invalid action type: ${actionType}`);
        }

        return {
            id: actionLog.id,
            label: `${username}${actionLabel}`,
            playerColor: actionLog.player.color,
        };
    }

    static async getActionLogs(gameId: number): Promise<IActionLogPayload[]> {
        if (isNaN(gameId)) {
            return [];
        }

        const query: any = {
            where: {
                gameId,
            },
            include: [
                {
                    model: Player,
                    as: 'player',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: [
                                ['uuid', 'id'],
                                'username',
                                'deleted',
                            ],
                        }
                    ],
                    attributes: [
                        'id',
                        'gameId',
                        'userId',
                    ]
                },
                {
                    model: Region,
                    as: 'region',
                },
                {
                    model: ActionLogType,
                    as: 'actionLogType',
                },
            ],
            order: [['id', 'DESC']],
        };

        const actionLogs = await ActionLog.findAll(query);

        return actionLogs.map(this.formatLog);
    }
};
