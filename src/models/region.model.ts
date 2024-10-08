import {
    BelongsTo,
    Column,
    DataType,
    Model,
    Table,
} from 'sequelize-typescript';
import Game from './game.model';
import { Color } from '@interfaces/game.interface';

@Table({
    tableName: 'regions',
    timestamps: false,
})
export default class Region extends Model {
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
        defaultValue: null,
    })
    color: Color;

    @Column({ type: DataType.JSON })
    values: number[];

    @BelongsTo(() => Game, 'gameId')
    game: Game;
}
