import {
    Column,
    Model,
    Table,
} from 'sequelize-typescript';
import { Color, Suit } from '../types/card_type.interface';

@Table({
    tableName: 'card_types',
    timestamps: false,
})
export class CardType extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;

    @Column
    value: number;

    @Column
    suit: Suit;

    @Column
    color: Color;
}
