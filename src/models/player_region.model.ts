import {
    Column,
    ForeignKey,
    Model,
    Table,
} from 'sequelize-typescript';
import {Region} from './region.model';
import {Player} from './player.model';

@Table({
    tableName: 'conversation_user',
    timestamps: false,
})
export default class PlayerRegion extends Model {
    @ForeignKey(() => Region)
    @Column({
        field: 'region_id',
        references: {
            model: Region,
            key: 'id',
        },
    })
    regionId: number;

    @ForeignKey(() => Player)
    @Column({
        field: 'player_id',
        references: {
            model: Player,
            key: 'id',
        },
    })
    playerId: number;

    tokens: number;
}
