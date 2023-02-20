import { Request, Response } from 'express';

import { exceptionHandler } from '../helpers/exception_handler.decorator';
import { ActionService } from '../services/action.service';
import CommandService from '../services/command.service';
import GameService from '../services/game.service';
import { IActionRequest } from '../types/action.interface';
import { AuthRequest } from '../types/index.interface';

@exceptionHandler()
class GamesController {

    async create(req: AuthRequest, res: Response): Promise<void> {
        const game = await GameService.create(req.userId, true);
        res.send(game);
    }

    async getActions(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const actions = await ActionService.getActions(userId, parseInt(gameId, 10));
        res.send(actions);
    }

    async getActiveGames(_req: Request, res: Response): Promise<void> {
        const activeGames = await GameService.getActiveGames();
        res.send(activeGames);
    }

    async getState(req: AuthRequest, res: Response): Promise<void> {
        const gameId = req.params.id;
        const gameState = await GameService.getState(parseInt(gameId, 10));
        res.send(gameState);
    }

    async join(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        await GameService.join(userId, parseInt(gameId, 10));
        res.send();
    }

    async leave(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        await GameService.leave(userId, parseInt(gameId, 10));
        res.send();
    }

    async handleAction(req: IActionRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const payload = req.body;
        await CommandService.handleAction(userId, parseInt(gameId, 10), payload);
        res.send();
    }

    async start(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        await GameService.start(userId, parseInt(gameId, 10));
        res.send();
    }
}

export default new GamesController;
