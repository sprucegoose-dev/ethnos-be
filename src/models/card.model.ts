import {
    BelongsTo,
    Column,
    HasMany,
    Model,
    Table,
} from 'sequelize-typescript';
import { Tribe } from './tribe.model';
import { Game } from './game.model';
import { Player } from './player.model';
import { CardState } from '../types/card.interface';
import { Color } from '../types/game.interface';

@Table({
    tableName: 'cards',
    timestamps: false,
})
export class Card extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;


    @Column
    state: CardState;

    @Column({
        defaultValue: null,
    })
    color: Color;

    @Column({
        field: 'tribe_id',
        references: {
            model: Tribe,
            key: 'id',
        }
    })
    tribeId: number;

    @Column({
        field: 'leader_id',
        references: {
            model: Card,
            key: 'id',
        },
        defaultValue: null,
        allowNull: true,
    })
    leaderId: number;

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

    @Column({
        defaultValue: null,
    })
    index: number;

    @BelongsTo(() => Tribe, 'tribeId')
    tribe: Tribe;

    @BelongsTo(() => Player, 'playerId')
    player: Player;

    @BelongsTo(() => Game, 'gameId')
    game: Game;

    @HasMany(() => Card, 'leaderId')
    bandUnits: Card[];
}
