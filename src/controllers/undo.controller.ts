import { Response } from 'express';

import { AuthRequest } from '@interfaces/index.interface';

import { exceptionHandler } from '@helpers/exception-handler.decorator';
import UndoRequestService from '../services/undoRequest/undo-request.service';

@exceptionHandler()
class UndoController {

    async requestUndo(req: AuthRequest, res: Response) {
        const { userId } = req;
        const { gameId } = req.params;
        const response = await UndoRequestService.create(userId, parseInt(gameId, 10));
        res.send(response);
    }

    async recordDecision(req: AuthRequest, res: Response) {
        const { userId } = req;
        const { state, undoApprovalId } = req.body;
        const { gameId } = req.params;
        const response = await UndoRequestService.recordDecision(userId, parseInt(gameId, 10), undoApprovalId, state);
        res.send(response);
    }

    async getUndoState(req: AuthRequest, res: Response) {
        const { userId } = req;
        const { gameId } = req.params;
        const response = await UndoRequestService.getUndoState(userId, parseInt(gameId, 10));
        res.send(response);
    }

    async getUndoRequest(req: AuthRequest, res: Response) {
        const { undoRequestId } = req.params;
        const response = await UndoRequestService.getUndoRequest(parseInt(undoRequestId, 10));
        res.send(response);
    }
}

export default new UndoController;
