import {
    BelongsTo,
    Column,
    CreatedAt,
    HasMany,
    Model,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';
import { Color } from '../types/card_type.interface';
import { GamePhase, GameState } from '../types/game.interface';
import { Card } from './card.model';
import { Player } from './player.model';
import { User } from './user.model';


@Table({
    tableName: 'games',
    timestamps: true,
})
export class Game extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;

    @Column({
        field: 'creator_id',
        references: {
            model: User,
            key: 'id',
        }
    })
    creatorId: number;

    @Column({
        field: 'active_player_id',
        references: {
            model: Player,
            key: 'id',
        },
        allowNull: true,
    })
    activePlayerId: number;

    @Column({
        field: 'winner_id',
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true,
    })
    winnerId: number;

    @Column
    state: GameState;

    @Column
    phase: GamePhase;

    @Column
    codexColor: Color;

    @CreatedAt
    @Column({ field: 'created_at' })
    // @ts-ignore
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    // @ts-ignore
    updatedAt: Date;

    @BelongsTo(() => User, 'creatorId')
    creator: User

    @BelongsTo(() => Player, 'activePlayerId')
    activePlayer: Player

    @BelongsTo(() => User, 'winnerId')
    winner: User

    @HasMany(() => Card, 'gameId')
    cards: Card[]

    @HasMany(() => Player, 'gameId')
    players: Player[]
}
