
import { Op } from 'sequelize';
import { Card } from '../models/card.model';
import { CardType } from '../models/card_type.model';
import { ICard, ICardFilters } from '../types/card.interface';

class CardService {

    static async create({
        cardTypeId,
        gameId = null,
        index = null,
        playerId = null,
        state = null,
    }: ICard): Promise<Card> {
        const card = await Card.create({
            cardTypeId,
            gameId,
            index,
            playerId,
            state,
        });

        return await Card.findOne({
            where: {
                id: card.id,
            },
            include: [
                CardType,
            ]
        });
    }

    static async getCardsWithType(gameId: number, filters: ICardFilters): Promise<Card[]> {
        let where: any = {
            gameId: gameId,
        };

        if (filters.continuum) {
            where = {
                ...where,
                index: {
                    [Op.not]: null,
                }
            }
        }

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
                CardType,
            ],
        });
    }
}

export default CardService;

