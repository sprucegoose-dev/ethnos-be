import { Op } from 'sequelize';

import Player from '@models/player.model';
import Card from '@models/card.model';

import { CardState, IGroupedCards } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import Region from '../../models/region.model';
import Game from '../../models/game.model';

const BAND_VALUES: { [key: number]: number } = {
    1: 0,
    2: 1,
    3: 3,
    4: 6,
    5: 10,
    6: 15
}

export default class ScoringService {

    static groupCardsByLeader(cards: Card[]) {
        return cards.reduce<IGroupedCards>((acc, card) => {
            const { leaderId } = card;
            if (!acc[leaderId]) {
              acc[leaderId] = [];
            }
            acc[leaderId].push(card);
            return acc;
          }, {});
    }

    static async scoreBands(player: Player): Promise<void> {
        const cardsInBands = player.cards.filter(card => card.state === CardState.IN_BAND);

        const bands = this.groupCardsByLeader(cardsInBands);

        let points = player.points;

        let leader;
        let bandSize;

        for (const [leaderId, bandCards] of Object.entries(bands)) {
            leader = bandCards.find(card => card.id === Number(leaderId));
            bandSize = bandCards.length;

            if (leader.tribe.name === TribeName.DWARF) {
                bandSize++;
            }
        }

        if (bandSize >= 6) {
            points += 15;
        } else {
            points += BAND_VALUES[bandSize];
        }

        await player.update({
            points
        });
    }

    static async scoreRegions(game: Game) {
        const regions = await Region.findAll({
            where: {
                gameId: game.id
            }
        });

        const playerRegions = await Region.findAll({
            where: {
                regionId: {
                    [Op.in]: regions.map(region => region.id)
                }
            }
        });


        for (const region of regions) {

            // depending on age and who has the most tokens, give out scores

        }

        const finalAge = game.players.length >= 4 ? 3 : 2;

        if (game.age === finalAge) {
            await this.scoreOrcBoards(game.players);
        }
    }

    static async scoreGiantToken() {

    }

    static async scoreMerfolkTrack() {

    }

    static async scoreOrcBoards(players: Player[]) {

    }

}
