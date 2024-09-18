import {
    Column,
    ForeignKey,
    Model,
    Table,
} from 'sequelize-typescript';
import {Region} from './region.model';
import {Player} from './player.model';

@Table({
    tableName: 'player_region',
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
        primaryKey: true,
    })
    regionId: number;

    @ForeignKey(() => Player)
    @Column({
        field: 'player_id',
        references: {
            model: Player,
            key: 'id',
        },
        primaryKey: true,
    })
    playerId: number;

    @Column({
        defaultValue: 0,
    })
    tokens: number;
}
