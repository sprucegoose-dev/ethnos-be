import {
    BelongsTo,
    Column,
    DataType,
    HasMany,
    Model,
    Table,
} from 'sequelize-typescript';

import Game from './game.model';
import User from './user.model';
import { Color } from '@interfaces/game.interface';
import Card from './card.model';
import { PlayerColor } from '../interfaces/player.interface';
import PlayerRegion from './player_region.model';

@Table({
    tableName: 'players',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'game_id'],
        },
    ],
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

    @BelongsTo(() => Game, 'gameId')
    game: Game;

    @BelongsTo(() => User, 'userId')
    user: User;

    @HasMany(() => Card, 'playerId')
    cards: Card[];

    @HasMany(() => PlayerRegion, 'regionId')
    playerTokens: PlayerRegion[];
}
