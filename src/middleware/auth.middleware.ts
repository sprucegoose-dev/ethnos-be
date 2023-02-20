const moment = require('moment');

import { Response, Request, NextFunction } from 'express';

import { exceptionHandler } from '../helpers/exception_handler.decorator';
import { CustomException, ERROR_UNAUTHORIZED } from '../helpers/exception_handler';
import UserService from '../services/user.service';

@exceptionHandler()
class AuthMiddleware {

    async isAuthenticated(req: Request, _: Response, next: NextFunction) {
        const publicRoutes = [
            '/',
            '/user/signUp',
            '/user/login',
            '/game/all',
            '/socket.io/',
        ];
        const { path, headers: { authorization } } = req;

        if (publicRoutes.includes(path)) {
            return next();
        } else {
            if (authorization) {
                const token = authorization.match(/(Bearer )(.*)/);

                if (!token) {
                    throw new CustomException(ERROR_UNAUTHORIZED, 'Invalid auth token');
                }

                const sessionId = token[2];

                if (sessionId) {
                    try {
                        const user = await UserService.findBySessionId(sessionId);
                        const { sessionExp } = user;
                        const expireTime = moment(sessionExp);
                        const now = moment();

                        if (now.isBefore(expireTime)) {
                            const duration = moment.duration(expireTime.diff(now));
                            const hours = duration.asHours();

                            if (hours <= 1) {
                                await UserService.extendSession(sessionId);
                            }

                            // @ts-ignore
                            req.userId = user.id;

                            return next();
                        }
                    } catch (error) {
                        throw new CustomException(ERROR_UNAUTHORIZED, 'Unauthorized request');
                    }
                }
            }
        }

        throw new CustomException(ERROR_UNAUTHORIZED, 'Unauthorized request');
    }
}

export default new AuthMiddleware;
