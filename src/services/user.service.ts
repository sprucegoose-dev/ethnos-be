import bcrypt from 'bcrypt';
import moment from 'moment';
import { v4 as uuid } from 'uuid';

import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND,
    ERROR_UNAUTHORIZED,
} from '../helpers/exception_handler';
import { User } from '../models/user.model';
import {
    IUserRequest,
    IUserResponse,
    PASSWORD_MIN_CHARS,
    USERNAME_MAX_CHARS,
    USERNAME_MIN_CHARS,
} from '../types/user.interface';

class UserService {

    static async create(payload: IUserRequest): Promise<IUserResponse> {
        const {
            username,
            email,
            password,
        } = payload;

        this.validateUserRequest(payload);

        const sessionId = uuid();
        const sessionExp = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');

        const user = await User.create({
            username,
            email,
            password: await bcrypt.hash(password, 10),
            sessionId,
            sessionExp,
        });

        return {
            id: user.id,
            username,
            sessionId,
            sessionExp,
        };
    }

    static async login(email: string, password: string): Promise<IUserResponse> {
        const user = await User.unscoped().findOne({ where: { email }});

        if (!user) {
            throw new CustomException(ERROR_NOT_FOUND, 'The provided email does not exist');
        }

        if (await bcrypt.compare(password, user.toJSON().password)) {
            user.sessionId = uuid();
            user.sessionExp = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');
            await user.save();
        } else {
            throw new CustomException(ERROR_UNAUTHORIZED, 'Incorrect email and password combination');
        }

        return {
            id: user.id,
            sessionId: user.sessionId,
            sessionExp: user.sessionExp,
            username: user.username,
        };
    }

    static async update(userId: number, payload: IUserRequest): Promise<User> {
        const {
            username,
            email,
            password,
        } = payload;

        this.validateUserRequest(payload);

        await User.update({
            username,
            email,
            password: await bcrypt.hash(password, 10),
        }, {
            where: {
                id: userId,
            }
        });

        return await this.getOne(userId);
    }

    static async delete(userId: number): Promise<void> {
        await User.destroy({
            where: {
                id: userId,
            }
        });
    }

    static async getOne(userId: number): Promise<User> {
        const user = await User.findOne({
            where: {
                id: userId,
            }
        });

        if (!user) {
            throw new CustomException(ERROR_NOT_FOUND, 'User not found');
        }

        return user.toJSON();
    }

    static async getAll(): Promise<User[]> {
        const users = await User.findAll();

        return users.map(user => user.toJSON());
    }

    static async findBySessionId(sessionId: string, asJson: boolean = true): Promise<User> {
        const user = await User.findOne({ where: { sessionId }});

        if (!user) {
            throw new CustomException(ERROR_NOT_FOUND, 'User not found');
        }

        return asJson ? user.toJSON() : user;
    }

    static async extendSession(sessionId: string): Promise<void> {
        const user = await this.findBySessionId(sessionId, false);
        user.sessionExp = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');
        await user.save();
    }

    static validateUserRequest(payload: IUserRequest): void {
        if (!/[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,4}/i.test(payload.email)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid email');
        }

        if (payload.password.length < PASSWORD_MIN_CHARS) {
            throw new CustomException(ERROR_BAD_REQUEST, `Password must be at least ${PASSWORD_MIN_CHARS} characters`);
        }

        if (payload.username.length < USERNAME_MIN_CHARS) {
            throw new CustomException(ERROR_BAD_REQUEST, `Username must be at least ${USERNAME_MIN_CHARS} characters`);
        }

        if (payload.username.length > USERNAME_MAX_CHARS) {
            throw new CustomException(ERROR_BAD_REQUEST, `Username cannot be more than ${USERNAME_MAX_CHARS} characters`);
        }
    }

};

export default UserService;
