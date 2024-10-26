import { PLAYER_COLORS, PlayerColor } from '@interfaces/player.interface';

import Card from '@models/card.model';
import Player from '@models/player.model';
import Tribe from '@models/tribe.model';

class PlayerService {

    static async create(userId: number, gameId: number): Promise<Player> {
        return await Player.create({
            userId,
            gameId,
        });
    }

    static filterAvailableColors(players: Player[]): PlayerColor[] {
        const availableColors = PLAYER_COLORS;

        players.map(player => {
            const colorIndex = availableColors.indexOf(player.color);

            if (colorIndex !== -1) {
                availableColors.splice(colorIndex, 1);
            }
        });

        return availableColors;
    }

    static async getPlayerWithCards(playerId: number): Promise<Player> {
        return await Player.findOne({
            where: {
                id: playerId,
            },
            include: [
                {
                    model: Card,
                    include: [
                        Tribe,
                    ],
                },
            ]
        });
    }
}

export default PlayerService;
