import { ActionType } from '@interfaces/action.interface';

import ActionLogType from '@models/actionLogType.model';
import ActionLog from '@models/actionLog.model';
import Player from '@models/player.model';
import User from '@models/user.model';
import Region from '@models/region.model';

import { CustomException, ERROR_SERVER } from '@helpers/exception-handler';

import { IActionLogParams, IActionLogPayload, LogType } from '../../interfaces/action-log.interface';
import Card from '../../models/card.model';
import Tribe from '../../models/tribe.model';

export default class ActionLogService {

    static async log({
       payload,
       type,
       playerId,
       gameId,
       regionId
    }: IActionLogParams): Promise<void> {
        const actionLogType = await ActionLogType.findOne({
            where: {
                type: type || payload?.type
            }
        });

        await ActionLog.create({
            actionLogTypeId: actionLogType.id,
            gameId,
            playerId,
            leaderId: payload?.type === ActionType.PLAY_BAND ? payload.leaderId : null,
            regionId,
            cardId: payload?.type === ActionType.PICK_UP_CARD ? payload.cardId : null,
        });
    }

    static formatLog(actionLog: ActionLog): IActionLogPayload {
        const actionType = actionLog.actionLogType.type;
        let username = actionLog.player.user.username;
        let actionLabel = `${username} `;

        switch (actionType) {
            case LogType.ADD_TOKEN:
                actionLabel += `adds a token to the ${actionLog.region.color} region`;
                break;
            case LogType.ADD_FREE_TOKEN:
                actionLabel += `adds a free token to the ${actionLog.region.color} region`;
                break;
            case LogType.REVEAL_DRAGON:
                actionLabel += `reveals a dragon`;
                break;
            case LogType.DRAW_CARD:
                actionLabel += `draws a card`;
                break;
            case LogType.KEEP_CARDS:
                actionLabel += `keeps cards in their hand`;
                break;
            case LogType.PICK_UP_CARD:
                actionLabel += `picks up a card`;
                break;
            case LogType.PLAY_BAND:
                actionLabel += `plays a band`;
                break;
            default:
                throw new CustomException(ERROR_SERVER, `Invalid action type: ${actionType}`);
        }

        return {
            id: actionLog.id,
            label: actionLabel,
            card: actionLog.card,
            leaderId: actionLog.leaderId,
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
                                'username',
                            ],
                        }
                    ],
                    attributes: [
                        'id',
                        'color',
                        'gameId',
                        'userId',
                    ]
                },
                {
                    model: Region,
                    as: 'region',
                },
                {
                    model: Card,
                    include: [
                        {
                            model: Tribe
                        }
                    ],
                    attributes: ['color']
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