import { ActionType } from '@interfaces/action.interface';
import { IActionLogParams, IActionLogPayload, LogType } from '@interfaces/action-log.interface';

import ActionLogType from '@models/action-log-type.model';
import ActionLog from '@models/action-log.model';
import Player from '@models/player.model';
import User from '@models/user.model';
import Region from '@models/region.model';
import Card from '@models/card.model';
import Tribe from '@models/tribe.model';

import { CustomException, ERROR_SERVER } from '@helpers/exception-handler';

export default class ActionLogService {

    static async log({
       payload,
       type,
       playerId,
       gameId,
       regionId,
       snapshotId,
       value,
    }: IActionLogParams): Promise<ActionLog> {
        const actionLogType = await ActionLogType.findOne({
            where: {
                type: type || payload?.type
            }
        });

        const actionLog = await ActionLog.create({
            actionLogTypeId: actionLogType.id,
            gameId,
            playerId,
            leaderId: payload?.type === ActionType.PLAY_BAND ? payload.leaderId : null,
            regionId,
            cardId: payload?.type === ActionType.PICK_UP_CARD ? payload.cardId : null,
            cardIds: payload?.type === ActionType.PLAY_BAND ? payload.cardIds : null,
            snapshotId,
            value: value || (payload?.type === ActionType.REMOVE_ORC_TOKENS ? payload.tokens?.length : 0),
        });

        return actionLog;
    }

    static formatLog(actionLog: ActionLog): IActionLogPayload {
        const actionType = actionLog.actionLogType.type;
        let username = actionLog.player.user.username;
        let actionLabel = `${username} `;

        switch (actionType) {
            case LogType.ADD_TOKEN:
                actionLabel += `adds a token to the ${actionLog.region.color} region`;
                break;
            case LogType.ADD_ORC_TOKEN:
                actionLabel += `adds a token to their Orc Board`;
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
            case LogType.GAIN_GIANT_TOKEN:
                actionLabel += `gains the Giant Token`;
                break;
            case LogType.GAIN_TROLL_TOKEN:
                actionLabel += `gains a Troll Token (${actionLog.value})`;
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
            case LogType.REMOVE_ORC_TOKENS:
                actionLabel += actionLog.value === 0 ?
                `keeps all tokens on the Orc Board` :
                `removes ${actionLog.value} tokens from the Orc Board`
                break;
            default:
                throw new CustomException(ERROR_SERVER, `Invalid action type: ${actionType}`);
        }

        return {
            id: actionLog.id,
            label: actionLabel,
            card: actionLog.card?.toJSON(),
            cardIds: actionLog.cardIds || [],
            leaderId: actionLog.leaderId,
            playerColor: actionLog.player.color,
            value: actionLog.value,
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
