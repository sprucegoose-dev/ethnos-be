import moment from 'moment';

import AuthMiddleware from './auth.middleware';

import { ERROR_UNAUTHORIZED } from '@helpers/exception-handler';

import User from '@models/user.model';

import UserService from '@services/user/user.service';

import { UNEXPECTED_ERROR_MSG } from '@jest.setup';

jest.mock('@helpers/exception-handler.decorator', () => ({
  exceptionHandler: jest.fn(() => (target: any) => target),
}));

describe('AuthMiddleware - isAuthenticated', () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        req = {
            path: '',
            headers: {
                authorization: ''
            }
        };
        res = {};
        next = jest.fn();
    });

    afterEach(async () => await User.truncate());

    it('should call next() for public routes', async () => {
        req.path = '/user/create';

        await AuthMiddleware.isAuthenticated(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('should throw unauthorized error if no token is provided', async () => {
        req.path = '/private/route';
        req.headers.authorization = '';

        try {
            await AuthMiddleware.isAuthenticated(req, res, next);
            throw new Error(UNEXPECTED_ERROR_MSG);
        } catch (error: any) {
            expect(next).not.toHaveBeenCalled();
            expect(error.type).toBe(ERROR_UNAUTHORIZED);
            expect(error.message).toBe('Unauthorized request');
        }
    });

    it('should throw unauthorized error for an invalid token format', async () => {
        req.path = '/private/route';
        req.headers.authorization = 'InvalidToken';

        try {
            await AuthMiddleware.isAuthenticated(req, res, next);
            throw new Error(UNEXPECTED_ERROR_MSG);
        } catch (error: any) {
            expect(next).not.toHaveBeenCalled();
            expect(error.type).toBe(ERROR_UNAUTHORIZED);
            expect(error.message).toBe('Invalid auth token');
        }
    });

    it('should throw unauthorized error if sessionId is not found', async () => {
        req.path = '/private/route';
        req.headers.authorization = 'Bearer sessionId';

        try {
            await AuthMiddleware.isAuthenticated(req, res, next);
            throw new Error(UNEXPECTED_ERROR_MSG);
        } catch (error: any) {
            expect(next).not.toHaveBeenCalled();
            expect(error.type).toBe(ERROR_UNAUTHORIZED);
            expect(error.message).toBe('Unauthorized request');
        }
    });

    it('should throw unauthorized error if session is expired', async () => {
        const user = await UserService.create({
            username: 'test-user',
            email: 'test-user-email@gmail.com',
            password: 'some-password-1!'
        });

        await User.update({
            sessionExp: moment().subtract(1, 'hour').format(),
        }, {
            where: {
                id: user.id
            }
        });

        req.path = '/private/route';
        req.headers.authorization = `Bearer ${user.sessionId}`;

        try {
            await AuthMiddleware.isAuthenticated(req, res, next);
            throw new Error(UNEXPECTED_ERROR_MSG);
        } catch (error: any) {
            expect(next).not.toHaveBeenCalled();
            expect(error.type).toBe(ERROR_UNAUTHORIZED);
            expect(error.message).toBe('Unauthorized request');
        }
    });

    it("should extend the user's session if less than 1 hour remains", async () => {
        const user = await UserService.create({
            username: 'test-user',
            email: 'test-user-email@gmail.com',
            password: 'some-password-1!'
        });

        const sessionExp = moment().add(30, 'minutes').format();

        await User.update({
            sessionExp,
        }, {
            where: {
                id: user.id
            }
        });

        req.path = '/private/route';
        req.headers.authorization = `Bearer ${user.sessionId}`;

        await AuthMiddleware.isAuthenticated(req, res, next);

        const updatedUser =  await User.findOne({
            where: {
                id: user.id
            }
        });

        expect(moment(updatedUser.sessionExp).isAfter(sessionExp)).toBe(true);
    });

    it('should proceed without extending session if more than 1 hour remains', async () => {
        const user = await UserService.create({
            username: 'test-user',
            email: 'test-user-email@gmail.com',
            password: 'some-password-1!'
        });

        const sessionExp = moment().add(2, 'hours').format();

        await User.update({
            sessionExp,
        }, {
            where: {
                id: user.id
            }
        });

        req.path = '/private/route';
        req.headers.authorization = `Bearer ${user.sessionId}`;

        await AuthMiddleware.isAuthenticated(req, res, next);

        const updatedUser =  await User.findOne({
            where: {
                id: user.id
            }
        });

        expect(updatedUser.sessionExp).toBe(sessionExp);
    });
});
