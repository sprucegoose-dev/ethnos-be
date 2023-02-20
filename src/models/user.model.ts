import {
    Column,
    CreatedAt,
    Model,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

@Table({
    tableName: 'users',
    timestamps: true,
    defaultScope: {
        attributes: {
            exclude: ['password'],
        },
    },
})
export class User extends Model {

    @Column
    username: string;

    @Column
    email: string;

    @Column
    password: string;

    @Column({ field: 'session_id' })
    sessionId: string;

    @Column({ field: 'session_exp' })
    sessionExp: string;

    @CreatedAt
    @Column({ field: 'created_at' })
    // @ts-ignore
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    // @ts-ignore
    updatedAt: Date;
}
