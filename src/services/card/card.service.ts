
import { Op } from 'sequelize';

import Card from '@models/card.model';
import Tribe from '@models/tribe.model';

import { ICardFilters } from '@interfaces/card.interface';

class CardService {

    static async getCardsWithType(gameId: number, filters: ICardFilters = {}): Promise<Card[]> {
        let where: any = {
            gameId: gameId,
        };

        if (filters.playerIds) {
            where = {
                ...where,
                playerId: {
                    [Op.in]: filters.playerIds,
                }
            }
        }

        return await Card.findAll({
            where,
            include: [
                Tribe,
            ],
        });
    }
}

export default CardService;

