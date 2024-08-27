import {
    BelongsTo,
    Column,
    Model,
    Table,
} from 'sequelize-typescript';

import { Game } from './game.model';
import { User } from './user.model';
import { Color } from '../types/card_type.interface';

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

    @Column({ field: 'orc_board_tokens' })
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
