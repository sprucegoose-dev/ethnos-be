import { PLAYER_COLORS, PlayerColor } from '@interfaces/player.interface';

import Card from '@models/card.model';
import Player from '@models/player.model';
import Tribe from '@models/tribe.model';
import { CustomException, ERROR_BAD_REQUEST } from '../../helpers/exception-handler';
import Game from '../../models/game.model';
import { GameState } from '../../interfaces/game.interface';

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

    static async assignColor(userId: number, gameId: number, color: PlayerColor) {
        const game = await Game.findOne({
            where: {
                id: gameId,
            },
            attributes: ['state']
        });

        if (game.state !== GameState.CREATED) {
            throw new CustomException(ERROR_BAD_REQUEST, "You can't change a player's color after the game had started");
        }

        if (color === null) {
            await Player.update({
                color: null
            }, {
                where: {
                    gameId,
                    userId,
                }
            });
            return;
        }

        if (!PLAYER_COLORS.includes(color)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid color');
        }

        const players = await Player.findAll({
            where: {
                gameId,
            }
        });

        const availableColors = this.filterAvailableColors(players);

        if (!availableColors.includes(color)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'This color is already assigned to another player');
        }
        await Player.update({
            color
        }, {
            where: {
                gameId,
                userId,
            }
        });
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
