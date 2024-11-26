import {
    BelongsTo,
    Column,
    CreatedAt,
    Model,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

import Game from './game.model';
import User from './user.model';

@Table({
    tableName: 'chat_messages',
    timestamps: true,
})
export default class ChatMessage extends Model {
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
        field: 'user_id',
        references: {
            model: User,
            key: 'id',
        }
    })
    userId: number;

    @Column
    message: string;

    @Column({ field: 'filtered_message' })
    filteredMessage: string;

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

    @BelongsTo(() => User, 'userId')
    user: User;
}

