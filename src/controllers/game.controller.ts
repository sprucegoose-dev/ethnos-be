import { Request, Response } from 'express';

import { exceptionHandler } from '@helpers/exception-handler.decorator';

import { ActionService } from '@services/action/action.service';
import CommandService from '@services/command/command.service';
import GameService from '@services/game/game.service';

import { IActionRequest } from '@interfaces/action.interface';
import { AuthRequest } from '@interfaces/index.interface';
import { ICreateGamePayload, IGameSettings } from '@interfaces/game.interface';

@exceptionHandler()
class GamesController {

    async create(req: AuthRequest, res: Response): Promise<void> {
        const payload = req.body as ICreateGamePayload;
        const game = await GameService.create(req.userId, true, payload?.password);
        res.send(game);
    }

    async handleAction(req: IActionRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const payload = req.body;
        await CommandService.handleAction(userId, parseInt(gameId, 10), payload);
        res.send();
    }

    async getActions(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const actions = await ActionService.getActions(parseInt(gameId, 10), userId);
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

    async start(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const settings = req.body as IGameSettings;
        await GameService.start(userId, parseInt(gameId, 10), settings);
        res.send();
    }

    async updateSettings(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const settings = req.body as IGameSettings;
        await GameService.updateSettings(userId, parseInt(gameId, 10), settings);
        res.send();
    }
}

export default new GamesController;
