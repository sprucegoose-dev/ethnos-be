import {
    BelongsTo,
    Column,
    Model,
    Table,
    DataType,
    CreatedAt,
    UpdatedAt,
} from 'sequelize-typescript';

import Game from './game.model';
import Player from './player.model';

@Table({
    tableName: 'snapshots',
    timestamps: true,
})
export default class Snapshot extends Model {
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

    @Column({ type: DataType.JSON})
    snapshot: any;

    @Column
    age: number;

    @Column({ field: 'reset_point' })
    resetPoint: boolean;

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;

    @BelongsTo(() => Game, 'gameId')
    game: Game;

    @BelongsTo(() => Player, 'playerId')
    player: Player;
}

