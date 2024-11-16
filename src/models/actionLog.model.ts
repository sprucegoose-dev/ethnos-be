import {
    BelongsTo,
    Column,
    Model,
    Table,
} from 'sequelize-typescript';


import Game from './game.model';
import Card from './card.model';
import Region from './region.model';
import ActionLogType from './actionLogType.model';
import Player from './player.model';

@Table({
    tableName: 'action_logs',
    timestamps: false,
})
export default class ActionLog extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;

    @Column({
        field: 'game_id',
        references: {
            model: Game,
            key: 'id',
        }
    })
    gameId: number;

    @Column({
        field: 'player_id',
        references: {
            model: Player,
            key: 'id',
        }
    })
    playerId: number;


    @Column({
        field: 'action_log_type_id',
        references: {
            model: ActionLogType,
            key: 'id',
        }
    })
    actionLogTypeId: number;


    @Column({
        field: 'region_id',
        references: {
            model: Region,
            key: 'id',
        }
    })
    regionId: number;

    @Column({
        field: 'card_id',
        references: {
            model: Card,
            key: 'id',
        }
    })
    cardId: number;

    @Column({
        field: 'leader_id',
        references: {
            model: Card,
            key: 'id',
        }
    })
    leaderId: number;

    @BelongsTo(() => Card, 'cardId')
    card: Card;

    @BelongsTo(() => Region, 'regionId')
    region: Region;

    @BelongsTo(() => Player, 'playerId')
    player: Player;

    @BelongsTo(() => ActionLogType, 'actionLogTypeId')
    actionLogType: ActionLogType;
}
