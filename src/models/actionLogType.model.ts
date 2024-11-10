import {
    Column,
    Model,
    Table,
} from 'sequelize-typescript';
import { LogType } from '@services/actionLog/actionLog.types';

@Table({
    tableName: 'action_log_types',
    timestamps: false,
})
export default class ActionLogType extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id: number;

    type: LogType;
}
