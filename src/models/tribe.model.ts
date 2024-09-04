import {
    Column,
    Model,
    Table,
} from 'sequelize-typescript';
import { TribeName } from '../types/tribe.interface';

@Table({
    tableName: 'tribes',
    timestamps: false,
})
export class Tribe extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;

    @Column
    name: TribeName;

    @Column
    description: string;
}
