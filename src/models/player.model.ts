import {
    BelongsTo,
    Column,
    DataType,
    Model,
    Table,
} from 'sequelize-typescript';

import { Game } from './game.model';
import { User } from './user.model';
import { Color } from '../types/game.interface';

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

    @Column({ field: 'giant_token_value' })
    giantTokenValue: number;

    @Column({
        defaultValue: [],
        field: 'orc_board_tokens',
        type: DataType.ARRAY(DataType.ENUM(...Object.values(Color))),
      })
      orcBoardTokens: Color[];

    @Column({ field: 'merfolk_board_score' })
    merfolkBoardScore: number;

    @Column({ defaultValue: 0 })
    points: number;

    @BelongsTo(() => Game, 'gameId')
    game: Game;

    @BelongsTo(() => User, 'userId')
    user: User;
}
