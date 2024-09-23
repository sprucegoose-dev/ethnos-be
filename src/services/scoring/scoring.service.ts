import { Op } from 'sequelize';

import Player from '@models/player.model';
import Card from '@models/card.model';

import { CardState, IGroupedCards } from '@interfaces/card.interface';
import { TribeName } from '@interfaces/tribe.interface';
import Region from '../../models/region.model';
import Game from '../../models/game.model';
import PlayerRegion from '../../models/player_region.model';

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

        const playerRegions = await PlayerRegion.findAll({
            where: {
                regionId: {
                    [Op.in]: regions.map(region => region.id)
                }
            }
        });

        const finalAge = game.players.length >= 4 ? 3 : 2;

        const trollTokenTotals: { [playerId: number]: number } = {};

        const totalPoints: { [playerId: number]: number } = {};

        for (const player of game.players) {
            let trollTokenSum = 0;

            for (const trollToken of player.trollTokens) {
                trollTokenSum += trollToken;
            }

            trollTokenTotals[player.id] = trollTokenSum;

            totalPoints[player.id] = player.points;
        }

        const regionRankings: { [rank: string]: number[] } = {};

        for (const region of regions) {
            playerRegions
                .filter(playerRegion => playerRegion.regionId === region.id)
                .sort((a, b) => b.tokens - a.tokens)
                .map(playerRegion => {
                    const rankKey = `${playerRegion.tokens}.${trollTokenTotals[playerRegion.playerId]}`;

                    if (regionRankings[rankKey]) {
                        regionRankings[rankKey].push(playerRegion.playerId);
                    } else {
                        regionRankings[rankKey] = [playerRegion.playerId];
                    }
                });

            const regionPoints = region.values.slice(0, game.age).sort((a, b) => b - a);

            for (const playerIds of Object.values(regionRankings)) {
                if (!regionPoints.length) {
                    continue;
                }

                const totalValue = regionPoints.splice(0, playerIds.length).reduce<number>((acc, currentValue) => acc += currentValue, 0);

                const pointsPerPlayer = Math.floor(totalValue / playerIds.length);

                for (const playerId of playerIds) {
                    totalPoints[playerId] += pointsPerPlayer;
                }
            }
        }

        for (const player of game.players) {
            // get player who is highest on the Merfolk track (in case of tie, trolls break ties)

            // get player with the largest giant band (in case of tie, trolls break ties)

            if (game.age === finalAge) {
                totalPoints[player.id] += this.scoreOrcBoard(player);
            }
        }


        for (const [playerId, points] of Object.entries(totalPoints)) {
            await Player.update({
                points
            }, {
                where: {
                    id: playerId
                }
            })
        }
    }

    static async scoreGiantToken() {

    }

    static async scoreMerfolkTrack() {

    }

    static scoreOrcBoard(player: Player): number {
        const orcBoardPoints: {[tokens: number]: number} = {
            0: 0,
            1: 1,
            2: 3,
            3: 6,
            4: 10,
            5: 15,
            6: 20,
        };

        return orcBoardPoints[player.orcTokens.length];
    }

}
