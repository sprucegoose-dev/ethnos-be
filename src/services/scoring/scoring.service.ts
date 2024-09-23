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

    static getTrollTokenTotals(players: Player[]) {
        const trollTokenTotals: { [playerId: number]: number } = {};
        let trollTokenSum = 0;

        for (const player of players) {
            for (const trollToken of player.trollTokens) {
                trollTokenSum += trollToken;
            }

            trollTokenTotals[player.id] = trollTokenSum;
        }

        return trollTokenTotals;
    }

    static async handleScoring(game: Game) {
        const players = game.players;
        const finalAge = players.length >= 4 ? 3 : 2;
        const trollTokenTotals = this.getTrollTokenTotals(players);
        const totalPoints: { [playerId: number]: number } = {};

        for (const player of game.players) {
            totalPoints[player.id] = player.points;
            totalPoints[player.id] += this.scoreBands(player);

            if (game.age === finalAge) {
                totalPoints[player.id] += this.scoreOrcBoard(player);
            }
        }

        const giantsScore = this.scoreGiantToken(players, game.age);

        if (giantsScore) {
            totalPoints[giantsScore.playerId] += giantsScore.points;
        }

        // score merfolks

        const regionPoints = await this.scoreRegions(game, trollTokenTotals);

        for (const [playerId, points] of Object.entries(regionPoints)) {
            totalPoints[Number(playerId)] += points;
        }

        for (const [playerId, points] of Object.entries(totalPoints)) {
            await Player.update({
                points
            }, {
                where: {
                    id: playerId
                }
            });
        }
    }

    static scoreBands(player: Player): number {
        const cardsInBands = player.cards.filter(card => card.state === CardState.IN_BAND);

        const bands = this.groupCardsByLeader(cardsInBands);

        let points = 0;

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

        return points;
    }

    static async scoreRegions(game: Game, trollTokenTotals: { [playerId: number]: number }): Promise<{[playerId: number]: number}> {
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

        const totalPoints: { [playerId: number]: number } = {};

        for (const player of game.players) {
            totalPoints[player.id] = 0;
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

        return totalPoints;
    }

    static scoreGiantToken(players: Player[], age: number): { playerId: number, points: number} {
        const tokenHolder = players.sort((a, b) => b.giantTokenValue - a.giantTokenValue)[0];

        const points: {[age: number]: number} = {
            1: 2,
            2: 4,
            3: 6
        };

        if (tokenHolder.giantTokenValue) {
            return {
                playerId: tokenHolder.id,
                points: points[age]
            };
        }

        return null;
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
