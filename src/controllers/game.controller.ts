import { Request, Response } from 'express';

import { exceptionHandler } from '@helpers/exception-handler.decorator';

import ActionService from '@services/action/action.service';
import CommandService from '@services/command/command.service';
import GameService from '@services/game/game.service';

import { IActionRequest } from '@interfaces/action.interface';
import { AuthRequest } from '@interfaces/index.interface';
import { ICreateGamePayload, IGameSettings } from '@interfaces/game.interface';

@exceptionHandler()
class GamesController {

    async addBotPlayer(req: AuthRequest, res: Response): Promise<void> {
        const gameId = req.params.id;
        await GameService.addBotPlayer(req.userId, parseInt(gameId, 10));
        res.send();
    }

    async assignPlayerColor(req: AuthRequest, res: Response): Promise<void> {
        const payload = req.body;
        const gameId = req.params.id;
        await GameService.assignPlayerColor(req.userId, parseInt(gameId, 10), payload.color);
        res.send();
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        const payload = req.body as ICreateGamePayload;
        const game = await GameService.create(req.userId, true, payload?.password);
        res.send(game);
    }

    async getActionsLog(req: AuthRequest, res: Response): Promise<void> {
        const gameId = req.params.id;
        const actionsLog = await GameService.getActionsLog(parseInt(gameId, 10));
        res.send(actionsLog);
    }

    async getAgeResults(req: AuthRequest, res: Response): Promise<void> {
        const gameId = req.params.id;
        const age = req.params.age;
        const ageState = await GameService.getAgeResults(parseInt(gameId, 10), parseInt(age, 10));
        res.send(ageState);
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

    async getCardsInHand(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const cardsInHand = await GameService.getCardsInHand(userId, parseInt(gameId, 10));
        res.send(cardsInHand);
    }

    async getGameCards(req: AuthRequest, res: Response): Promise<void> {
        const gameId = req.params.id;
        const cards = await GameService.getGameCards(parseInt(gameId, 10));
        res.send(cards);
    }

    async getRecentMatches(req: AuthRequest, res: Response): Promise<void> {
        const { page } = req.query as any;
        const games = await GameService.getMatches(parseInt(page, 10));
        res.send(games);
    }

    async getPlayerHands(req: AuthRequest, res: Response): Promise<void> {
        const gameId = req.params.id;
        const playerHands = await GameService.getPlayerHands(parseInt(gameId, 10));
        res.send(playerHands);
    }

    async getState(req: AuthRequest, res: Response): Promise<void> {
        const gameId = req.params.id;
        const gameState = await GameService.getStateResponse(parseInt(gameId, 10));
        res.send(gameState);
    }

    async handleAction(req: IActionRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const payload = req.body;
        await CommandService.handleAction(userId, parseInt(gameId, 10), payload);
        res.send();
    }

    async join(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const password = req.body.password;
        await GameService.join(userId, parseInt(gameId, 10), password);
        res.send();
    }

    async leave(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        await GameService.leave(userId, parseInt(gameId, 10));
        res.send();
    }

    async orderCards(req: AuthRequest, res: Response): Promise<void> {
        const userId = req.userId;
        const gameId = req.params.id;
        const cardIds = req.body.cardIds;
        await GameService.orderCards(userId, parseInt(gameId, 10), cardIds);
        res.send();
    }

    async removeBotPlayer(req: AuthRequest, res: Response): Promise<void> {
        const gameId = req.params.id;
        const botPlayerId = req.params.botPlayerId;
        await GameService.removeBotPlayer(req.userId, parseInt(gameId, 10), parseInt(botPlayerId, 10));
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
