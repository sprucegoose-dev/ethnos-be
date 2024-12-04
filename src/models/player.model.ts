import {
    BelongsTo,
    Column,
    DataType,
    HasMany,
    Model,
    Table,
} from 'sequelize-typescript';

import { Color } from '@interfaces/game.interface';
import { IPointsBreakdown, PlayerColor } from '@interfaces/player.interface';
import { IActionPayload } from '@interfaces/action.interface';

import Game from './game.model';
import User from './user.model';
import PlayerRegion from './player-region.model';
import Card from './card.model';


@Table({
    tableName: 'players',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'game_id'],
        },
    ],
    defaultScope: {
        attributes: {
            exclude: ['validActions'],
        },
    },
})
export default class Player extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;

    @Column({
        field: 'user_id',
        references: {
            model: User,
            key: 'id',
        }
    })
    userId: number;

    @Column({
        field: 'game_id',
        references: {
            model: Game,
            key: 'id',
        }
    })
    gameId: number;

    @Column({
        defaultValue: null
    })
    color: PlayerColor;

    @Column({ field: 'giant_token_value' })
    giantTokenValue: number;

    @Column({
        defaultValue: [],
        field: 'orc_tokens',
        type: DataType.JSON,
    })
    orcTokens: Color[];

    @Column({
        defaultValue: false,
        field: 'can_remove_orc_tokens',
    })
    canRemoveOrcTokens: boolean;

    @Column({
        defaultValue: [],
        field: 'troll_tokens',
        type: DataType.JSON,
    })
    trollTokens: number[];

    @Column({
        field: 'merfolk_track_score',
        defaultValue: 0,
    })
    merfolkTrackScore: number;

    @Column({ defaultValue: 0 })
    points: number;

    @Column({
        field: 'points_breakdown',
        type: DataType.JSON,
        defaultValue: {}
    })
    pointsBreakdown: IPointsBreakdown;

    @Column({
        field: 'valid_actions',
        type: DataType.JSON,
        defaultValue: [],
    })
    validActions: IActionPayload[];

    @BelongsTo(() => Game, 'gameId')
    game: Game;

    @BelongsTo(() => User, 'userId')
    user: User;

    @HasMany(() => Card, 'playerId')
    cards: Card[];

    @HasMany(() => PlayerRegion, 'regionId')
    playerTokens: PlayerRegion[];
}
