import { Response } from 'express';

import { exceptionHandler } from '@helpers/exception-handler.decorator';
import { AuthRequest } from '@interfaces/index.interface';

import SnapshotService from '../services/snapshot/snapshot.service';

@exceptionHandler()
class SnapshotController {

    async restore(req: AuthRequest, res: Response) {
        const { snapshotId } = req.params;
        const response = await SnapshotService.restore(parseInt(snapshotId, 10));
        res.send(response);
    }
}

export default new SnapshotController;
