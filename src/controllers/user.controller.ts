import { Request, Response } from 'express';

import { exceptionHandler } from '../helpers/exception_handler.decorator';
import { AuthRequest } from '../types/index.interface';
import UserService from '../services/user.service';

@exceptionHandler()
class UsersController {

    async create(req: Request, res: Response): Promise<void> {
        const response = await UserService.create(req.body);
        res.send(response);
    }

    async login(req: Request, res: Response): Promise<void> {
        const response = await UserService.login(req.body.email, req.body.password);
        res.send(response);
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        const response = await UserService.update(req.userId, req.body);
        res.send(response);
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        const response = await UserService.delete(req.userId);
        res.send(response);
    }

    async getDetails(req: AuthRequest, res: Response): Promise<void> {
        const response = await UserService.getOne(req.userId);
        res.send(response);
    }
}

export default new UsersController;
