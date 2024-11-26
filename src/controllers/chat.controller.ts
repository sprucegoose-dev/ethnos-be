import { Response } from 'express';

import { exceptionHandler } from '@helpers/exception-handler.decorator';
import { AuthRequest } from '@interfaces/index.interface';
import ChatService from '@services/chat/chat.service';

@exceptionHandler()
class ChatsController {

    async getMessages(req: AuthRequest, res: Response) {
        const { gameId } = req.params;
        const { userId } = req;
        const response = await ChatService.getMessages(userId, parseInt(gameId, 10));
        res.send(response);
    }

    async sendMessage(req: AuthRequest, res: Response) {
        const { message } = req.body;
        const { gameId } = req.params;
        const { userId } = req;
        const response = await ChatService.sendMessage(userId, parseInt(gameId, 10), message);
        res.send(response);
    }
}

export default new ChatsController;
