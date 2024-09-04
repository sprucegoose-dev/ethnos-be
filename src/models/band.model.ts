import {
    BelongsTo,
    Column,
    Model,
    Table,
} from 'sequelize-typescript';
import { Player } from './player.model';

@Table({
    tableName: 'bands',
    timestamps: false,
})
export class Band extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;

    @Column({
        field: 'player_id',
        references: {
            model: Player,
            key: 'id',
        }
    })
    playerId: number;

    @BelongsTo(() => Player, 'playerId')
    player: Player
}
