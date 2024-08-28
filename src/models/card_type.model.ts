import {
    Column,
    Model,
    Table,
} from 'sequelize-typescript';
import { Tribe } from '../types/card_type.interface';

@Table({
    tableName: 'card_types',
    timestamps: false,
})
export class CardType extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;

    @Column
    tribe: Tribe;

    @Column({ allowNull: true })
    color: string;

    @Column
    description: string;
}
