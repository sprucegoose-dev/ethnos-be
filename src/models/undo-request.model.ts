import {
    BelongsTo,
    Column,
    CreatedAt,
    HasMany,
    Model,
    Table,
    UpdatedAt,
 } from 'sequelize-typescript';

import Game from '@models/game.model';
import Player from '@models/player.model';
import Snapshot from '@models/snapshot.model';

import { UndoRequestState } from '@interfaces/undo-request.interface';

import UndoApproval from './undo-approval.model';

@Table({
    tableName: 'undo_requests',
    timestamps: true,
})
export default class UndoRequest extends Model {
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
        field: 'snapshot_id',
        references: {
            model: Snapshot,
            key: 'id',
        }
    })
    snapshotId: number;

    @Column
    state: UndoRequestState;

    @CreatedAt
    @Column({ field: 'created_at' })
    // @ts-ignore
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    // @ts-ignore
    updatedAt: Date;

    @BelongsTo(() => Game, 'gameId')
    game: Game;

    @BelongsTo(() => Player, 'playerId')
    player: Player;

    @BelongsTo(() => Snapshot, 'snapshotId')
    snapshot: Snapshot;

    @HasMany(() => UndoApproval, 'undoRequestId')
    undoApprovals: UndoApproval[];
}
