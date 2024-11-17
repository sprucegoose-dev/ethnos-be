import {
    Column,
    Model,
    Table,
} from 'sequelize-typescript';
import { LogType } from '@interfaces/action-log.interface';

@Table({
    tableName: 'action_log_types',
    timestamps: false,
})
export default class ActionLogType extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;

    @Column({ field: 'type' })
    type: LogType;
}
