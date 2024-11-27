import User from '@models/user.model';

import UsersController from './user.controller';
import UserService from '../services/user/user.service';

describe('UsersController', () => {

    describe('create', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await User.truncate());

        it("should create a new user", async () => {
            const request: any = {
                body: {
                    username: 'test-user-name',
                    email: 'test-user-email@gmail.com',
                    password: 'some-password-1!'
                }
            };

            await UsersController.create(request, response);

            const user = await User.findOne({
                where: {
                    username: 'test-user-name'
                }
            });

            expect(user).not.toBeNull();
        });

        it("should return the new user", async () => {
            const request: any = {
                body: {
                    username: 'test-user-name',
                    email: 'test-user-email@gmail.com',
                    password: 'some-password-1!'
                }
            };

            await UsersController.create(request, response);

            const user = await User.findOne({
                where: {
                    username: 'test-user-name'
                }
            });

            expect(response.send).toHaveBeenCalledWith({
                id: user.id,
                username: user.username,
                sessionId: user.sessionId,
                sessionExp: user.sessionExp,
            });
        });
    });

    describe('login', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await User.truncate());

        it("should login in the user and return the user data", async () => {
            const newUser = await UserService.create({
                username: 'test-user-name',
                email: 'test-user-email@gmail.com',
                password: 'some-password-1!'
            });

            const request: any = {
                body: {
                    email: 'test-user-email@gmail.com',
                    password: 'some-password-1!'
                }
            };

            await UsersController.login(request, response);

            expect(response.send).toHaveBeenCalledWith({
                id: newUser.id,
                username: newUser.username,
                sessionId: expect.any(String),
                sessionExp: expect.any(String),
            });
        });
    });

    describe('update', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await User.truncate());

        it("should update the user's details and return the updated user data", async () => {
            const newUser = await UserService.create({
                username: 'test-user-name',
                email: 'test-user-email@gmail.com',
                password: 'some-password-1!'
            });

            const request: any = {
                userId: newUser.id,
                body: {
                    username: 'new-username',
                    email: 'new-user-email@gmail.com',
                    password: 'new-user-password-1!'
                }
            };

            const originalUser = await User.findOne({
                where: {
                    id: newUser.id
                },
                attributes: {
                    include: ['password']
                }
            });

            await UsersController.update(request, response);

            const updatedUser = await User.findOne({
                where: {
                    id: newUser.id
                },
                attributes: {
                    include: ['password']
                }
            });

            expect(updatedUser.username).toBe('new-username');
            expect(updatedUser.email).toBe('new-user-email@gmail.com');
            expect(originalUser.password).not.toEqual(updatedUser.password);
        });

        it('should return the updated user data', async () => {
            const newUser = await UserService.create({
                username: 'test-user-name',
                email: 'test-user-email@gmail.com',
                password: 'some-password-1!'
            });

            const request: any = {
                userId: newUser.id,
                body: {
                    username: 'new-username',
                    email: 'new-user-email@gmail.com',
                    password: 'new-user-password-1!'
                }
            };

            await UsersController.update(request, response);

            expect(response.send).toHaveBeenCalledWith(expect.objectContaining({
                id: newUser.id,
                username: 'new-username',
                email: 'new-user-email@gmail.com',
            }));
        });
    });

    describe('delete', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await User.truncate());

        it('should delete a user', async () => {
            const newUser = await UserService.create({
                username: 'test-user-name',
                email: 'test-user-email@gmail.com',
                password: 'some-password-1!'
            });

            const request: any = {
                userId: newUser.id,
            };

            await UsersController.delete(request, response);

            const deletedUser = await User.findOne({
                where: {
                    id: newUser.id
                }
            });

            expect(deletedUser.deleted).toBe(true);
        });
    });

    describe('getDetails', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        afterEach(async () => await User.truncate());

        it("should return the user's details", async () => {
            const newUser = await UserService.create({
                username: 'test-user-name',
                email: 'test-user-email@gmail.com',
                password: 'some-password-1!'
            });

            const request: any = {
                userId: newUser.id,
            };

            await UsersController.getDetails(request, response);

            expect(response.send).toHaveBeenCalledWith(expect.objectContaining({
                id: newUser.id,
                email: 'test-user-email@gmail.com',
                username: newUser.username,
            }));
        });
    });
});
