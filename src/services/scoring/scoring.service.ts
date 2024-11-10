import { Op } from 'sequelize';

import Player from '@models/player.model';
import Card from '@models/card.model';
import Region from '@models/region.model';
import Game from '@models/game.model';
import PlayerRegion from '@models/player_region.model';

import { CardState, IGroupedCards } from '@interfaces/card.interface';
import { IScoringResults } from '@interfaces/command.interface';
import { TribeName } from '@interfaces/tribe.interface';

export default class ScoringService {

    static getTrollTokenTotals(players: Player[]) {
        const trollTokenTotals: { [playerId: number]: number } = {};

        for (const player of players) {
            let trollTokenSum = 0;

            for (const trollToken of player.trollTokens) {
                trollTokenSum += trollToken;
            }

            trollTokenTotals[player.id] = trollTokenSum;
        }

        return trollTokenTotals;
    }

    static groupCardsByLeader(cards: Card[]): IGroupedCards {
        return cards.reduce<IGroupedCards>((acc, card) => {
            const { leaderId } = card;
            if (!acc[leaderId]) {
              acc[leaderId] = [];
            }
            acc[leaderId].push(card);
            return acc;
        }, {});
    }

    static async handleScoring(game: Game): Promise<IScoringResults> {
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

        const merfolkPoints = this.scoreMerfolkTrack(game, trollTokenTotals);

        if (merfolkPoints) {
            for (const [playerId, points] of Object.entries(merfolkPoints)) {
                totalPoints[Number(playerId)] += points;
            }
        }

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

        return {
            totalPoints,
            trollTokenTotals,
        }
    }

    static getBandPoints(bandSize: number) {
        const BAND_VALUES: { [key: number]: number } = {
            1: 0,
            2: 1,
            3: 3,
            4: 6,
            5: 10,
            6: 15
        };

        if (bandSize >= 6) {
            return 15;
        } else {
            return BAND_VALUES[bandSize];
        }
    }

    static scoreBands(player: Player): number {
        const cardsInBands = player.cards.filter(card => card.state === CardState.IN_BAND);
        const bands = this.groupCardsByLeader(cardsInBands);
        let points = 0;
        let leader;
        let bandSize;

        if (!Object.keys(bands).length) {
            return points;
        }

        for (const [leaderId, bandCards] of Object.entries(bands)) {
            leader = bandCards.find(card => card.id === Number(leaderId));
            bandSize = bandCards.length;

            if (leader.tribe.name === TribeName.DWARVES) {
                bandSize++;
            }

            points += this.getBandPoints(bandSize);
        }

        return points;
    }

    static scoreRegion(region: Region, playersInRegion: PlayerRegion[], trollTokenTotals: { [playerId: number]: number }, age: number) {
        const regionRankings: { [rank: string]: number[] } = {};
        const totalPoints: { [playerId: number]: number } = {};

        playersInRegion
            .sort((playerA, playerB) => playerB.tokens - playerA.tokens)
            .map(playerRegion => {
                const rankKey = `${playerRegion.tokens}.${trollTokenTotals[playerRegion.playerId]}`;

                if (regionRankings[rankKey]) {
                    regionRankings[rankKey].push(playerRegion.playerId);
                } else {
                    regionRankings[rankKey] = [playerRegion.playerId];
                }
            });

        const regionPoints = region.values.slice(0, age).sort((a, b) => b - a);

        for (const playerIds of Object.values(regionRankings)) {
            if (!regionPoints.length) {
                continue;
            }

            const totalValue = regionPoints.splice(0, playerIds.length).reduce<number>((acc, currentValue) => acc += currentValue, 0);

            const pointsPerPlayer = Math.floor(totalValue / playerIds.length);

            for (const playerId of playerIds) {
                totalPoints[playerId] = pointsPerPlayer;
            }
        }

        return totalPoints;
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

        for (const region of regions) {
            const playersInRegion = playerRegions.filter(playerRegion =>
                playerRegion.regionId === region.id
            );

            const regionPoints = this.scoreRegion(region, playersInRegion, trollTokenTotals, game.age);

            for (const [playerId, points] of Object.entries(regionPoints)) {
                totalPoints[Number(playerId)] += points;
            }
        }

        return totalPoints;
    }

    static scoreGiantToken(players: Player[], age: number): { playerId: number, points: number} {
        const tokenHolder = players.sort((a, b) => b.giantTokenValue - a.giantTokenValue)[0];

        const points: {[age: number]: number} = players.length >= 4 ? {
            1: 2,
            2: 4,
            3: 6
        } : {
            1: 2,
            2: 5
        };

        if (tokenHolder.giantTokenValue) {
            return {
                playerId: tokenHolder.id,
                points: points[age]
            };
        }

        return null;
    }

    static scoreMerfolkTrack(game: Game, trollTokenTotals: { [playerId: number]: number }): {[playerId: number]: number} {
        if (!game.settings.tribes.find(tribeName => tribeName === TribeName.MERFOLK)) {
            return null;
        }

        const merfolkRankings: { [rank: string]: number[] } = {};

        const points: {[age: number]: number} = game.players.length >= 4 ? {
            1: 1,
            2: 2,
            3: 4
        } : {
            1: 1,
            2: 3,
        };

        game.players.sort((a, b) => {
                if (b.merfolkTrackScore === a.merfolkTrackScore) {
                    return trollTokenTotals[b.id] - trollTokenTotals[a.id];
                }

                return b.merfolkTrackScore - a.merfolkTrackScore
            })
            .map(player => {
                const merfolkRank = `${player.merfolkTrackScore}.${trollTokenTotals[player.id]}`;

                if (merfolkRankings[merfolkRank]) {
                    merfolkRankings[merfolkRank].push(player.id);
                } else {
                    merfolkRankings[merfolkRank] = [player.id];
                }
            });


        const firstPlaceValue = points[game.age];

        const totalPoints: { [playerId: number]: number } = {};

        for (const playerIds of Object.values(merfolkRankings)) {
            const pointsPerPlayer = Math.floor(firstPlaceValue / playerIds.length);

            for (const playerId of playerIds) {
                totalPoints[playerId] = pointsPerPlayer;
            }

            break;
        }

        return totalPoints;
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
