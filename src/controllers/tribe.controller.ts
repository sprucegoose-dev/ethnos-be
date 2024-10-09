import { Request, Response } from 'express';

import { exceptionHandler } from '@helpers/exception-handler.decorator';
import Tribe from '../models/tribe.model';
import { Op } from 'sequelize';
import { TribeName } from '../interfaces/tribe.interface';

@exceptionHandler()
class TribesController {

    async getAll(_req: Request, res: Response): Promise<void> {
        const response = await Tribe.findAll({
            where: {
                name: {
                    [Op.not]: TribeName.DRAGON
                }
            }
        });
        res.send(response);
    }
}

export default new TribesController;
