import {
    Column,
    Model,
    Table,
} from 'sequelize-typescript';

import { Game } from './game.model';
import { Player } from './player.model';
import { NextActionState } from '../types/nextAction.interface';
import { ActionType } from '../types/action.interface';

@Table({
    tableName: 'next_actions',
    timestamps: false,
})
export class NextAction extends Model {
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

    @Column
    type: ActionType;

    @Column({
        defaultValue: NextActionState.PENDING
    })
    state: NextActionState;

}