import {
    BelongsTo,
    Column,
    Model,
    Table,
} from 'sequelize-typescript';
import { PlayerOrientation } from '../types/player.interface';
import { Game } from './game.model';
import { User } from './user.model';

@Table({
    tableName: 'players',
    timestamps: false,
})
export class Player extends Model {
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

    @Column({ defaultValue: null })
    orientation: PlayerOrientation;

    @Column({ defaultValue: null })
    position: number;

    @Column({ defaultValue: 0 })
    points: number;

    @BelongsTo(() => Game, 'gameId')
    game: Game;

    @BelongsTo(() => User, 'userId')
    user: User;
}
