import { Player } from '../models/player.model';

class PlayerService {

    static async create(userId: number, gameId: number): Promise<Player> {
        return await Player.create({
            userId,
            gameId,
        });
    }
}

export default PlayerService;
