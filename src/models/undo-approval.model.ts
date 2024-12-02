import {
    BelongsTo,
    Column,
    CreatedAt,
    Model,
    Table,
    UpdatedAt,
 } from 'sequelize-typescript';

import Game from '@models/game.model';
import Player from '@models/player.model';

import { UndoRequestState } from '../interfaces/undo-approval.interface';
import UndoRequest from './undo-request.model';

@Table({
    tableName: 'undo_approvals',
    timestamps: true,
})
export default class UndoApproval extends Model {
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
        field: 'undo_request_id',
        references: {
            model: UndoRequest,
            key: 'id',
        }
    })
    undoRequestId: number;

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
}
