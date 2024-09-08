import {
    BelongsTo,
    Column,
    Model,
    Table,
} from 'sequelize-typescript';
import { Band } from './band.model';
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
        field: 'band_id',
        references: {
            model: Band,
            key: 'id',
        }
    })
    bandId: number;

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

    @Column({
        field: 'is_leader',
        defaultValue: null,
        allowNull: true
    })
    isLeader: number;

    @BelongsTo(() => Band, 'bandId')
    band: Band;

    @BelongsTo(() => Tribe, 'tribeId')
    tribe: Tribe;

    @BelongsTo(() => Player, 'playerId')
    player: Player;

    @BelongsTo(() => Game, 'gameId')
    game: Game;
}
