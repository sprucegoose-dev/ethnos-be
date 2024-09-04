
import { Op } from 'sequelize';
import { Card } from '../models/card.model';
import { Tribe } from '../models/tribe.model';
import { ICard, ICardFilters } from '../types/card.interface';

class CardService {

    static async create({
        color = null,
        index = null,
        tribeId,
        gameId = null,
        playerId = null,
        state = null,
    }: ICard): Promise<Card> {
        const card = await Card.create({
            color,
            index,
            tribeId,
            gameId,
            playerId,
            state,
        });

        return await Card.findOne({
            where: {
                id: card.id,
            },
            include: [
                Tribe,
            ]
        });
    }

    static async getCardsWithType(gameId: number, filters: ICardFilters): Promise<Card[]> {
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

