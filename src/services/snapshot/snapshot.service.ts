import { Color, IGameState } from '@interfaces/game.interface';
import {
    COMPRESSED_CARD_STATE_KEYS,
    COMPRESSED_COLOR_KEYS,
    COMPRESSED_KEY_ACTIVE_PLAYER_ID,
    COMPRESSED_KEY_AGE,
    COMPRESSED_KEY_CARDS,
    COMPRESSED_KEY_GAME,
    COMPRESSED_KEY_GIANT_TOKEN_VALUE,
    COMPRESSED_KEY_INDEX,
    COMPRESSED_KEY_IN_BAND,
    COMPRESSED_KEY_IN_DECK,
    COMPRESSED_KEY_IN_HAND,
    COMPRESSED_KEY_IN_MARKET,
    COMPRESSED_KEY_LEADER_ID,
    COMPRESSED_KEY_MERFOLK_TRACK_SCORE,
    COMPRESSED_KEY_ORC_TOKENS,
    COMPRESSED_KEY_PLAYERS,
    COMPRESSED_KEY_PLAYER_ID,
    COMPRESSED_KEY_PLAYER_POINTS,
    COMPRESSED_KEY_PLAYER_REGIONS,
    COMPRESSED_KEY_REGION_ID,
    COMPRESSED_KEY_REVEALED,
    COMPRESSED_KEY_TOKENS,
    COMPRESSED_KEY_TROLL_TOKENS,
    DECOMPRESSED_COLOR_KEYS,
    ICompressedCard,
    ICompressedCards,
    ICompressedGame,
    ICompressedPlayer,
    ICompressedPlayerRegion,
    ICompressedSnapshot,
    IDecompressedCard,
    IDecompressedGame,
    IDecompressedPlayer,
    IDecompressedPlayerRegion,
    IDecompressedSnapshot,
} from './snapshot.interface';
import { CardState } from '@interfaces/card.interface';
import { NextActionState } from '@interfaces/next-action.interface';

import Player from '@models/player.model';
import Card from '@models/card.model';
import Snapshot from '@models/snapshot.model';
import Region from '@models/region.model';
import Game from '@models/game.model';
import NextAction from '@models/next-action.model';

import sequelize from '@database/connection';

import { CustomException, ERROR_NOT_FOUND } from '@helpers/exception-handler';
import { Op } from 'sequelize';
import PlayerRegion from '../../models/player-region.model';
import ActionLog from '../../models/action-log.model';

export default class SnapshotService {

    static async create(gameState: IGameState, resetPoint: boolean): Promise<Snapshot> {
        const snapshot = SnapshotService.compress(gameState)

        return await Snapshot.create({
            gameId: gameState.id,
            age: gameState.age,
            playerId: gameState.activePlayerId,
            snapshot,
            resetPoint,
        });
    }

    static compress(gameState: IGameState): ICompressedSnapshot  {
        return {
            [COMPRESSED_KEY_GAME]: SnapshotService.compressGame(gameState),
            [COMPRESSED_KEY_PLAYERS]: gameState.players.map(SnapshotService.compressPlayer),
            [COMPRESSED_KEY_CARDS]: SnapshotService.compressCards(gameState.cards),
            [COMPRESSED_KEY_PLAYER_REGIONS]: SnapshotService.compressPlayerRegions(gameState.regions)
        };
    }

    static compressCards(cards: Card[], playerId?: number): ICompressedCards {
        const compressedCards: ICompressedCards = {
            [COMPRESSED_KEY_IN_BAND]: [],
            [COMPRESSED_KEY_IN_DECK]: [],
            [COMPRESSED_KEY_IN_HAND]: [],
            [COMPRESSED_KEY_IN_MARKET]: [],
            [COMPRESSED_KEY_REVEALED]: []
        };

        cards = cards.filter(card => playerId ?
            [CardState.IN_HAND, CardState.IN_BAND].includes(card.state) :
            [CardState.IN_MARKET, CardState.IN_DECK, CardState.REVEALED].includes(card.state)
        )

        for (const card of cards) {
            const compressedCard: ICompressedCard  = {
                id: card.id,
            };

            if (typeof card.index === 'number') {
                compressedCard[COMPRESSED_KEY_INDEX] = card.index;
            }

            if (card.leaderId) {
                compressedCard[COMPRESSED_KEY_LEADER_ID] = card.leaderId;
            }

            // @ts-ignore
            compressedCards[COMPRESSED_CARD_STATE_KEYS[card.state]].push(compressedCard);
        }

        return compressedCards;
    }

    static compressColor(color: Color) {
        return COMPRESSED_COLOR_KEYS[color];
    }

    static compressGame(gameState: IGameState): ICompressedGame {
        return {
            [COMPRESSED_KEY_AGE]: gameState.age,
            [COMPRESSED_KEY_ACTIVE_PLAYER_ID]: gameState.activePlayerId,
        };
    }

    static compressPlayer(player: Player): ICompressedPlayer {
        return {
            id: player.id,
            [COMPRESSED_KEY_PLAYER_POINTS]: player.points,
            [COMPRESSED_KEY_GIANT_TOKEN_VALUE]: player.giantTokenValue,
            [COMPRESSED_KEY_MERFOLK_TRACK_SCORE]: player.merfolkTrackScore,
            [COMPRESSED_KEY_TROLL_TOKENS]: player.trollTokens,
            [COMPRESSED_KEY_ORC_TOKENS]: player.orcTokens.map(SnapshotService.compressColor),
            [COMPRESSED_KEY_CARDS]: SnapshotService.compressCards(player.cards, player.id)
        };
    }

    static compressPlayerRegions(regions: Region[]): ICompressedPlayerRegion[] {
        const playerRegions = [];

        for (const region of regions) {
            for (const playerRegion of region.playerTokens) {
                playerRegions.push({
                    [COMPRESSED_KEY_REGION_ID]: playerRegion.regionId,
                    [COMPRESSED_KEY_PLAYER_ID]: playerRegion.playerId,
                    [COMPRESSED_KEY_TOKENS]: playerRegion.tokens,
                });
            }
        }

        return playerRegions;
    }

    static decompress(snapshot: ICompressedSnapshot): IDecompressedSnapshot {
        return {
            game: SnapshotService.decompressGame(snapshot[COMPRESSED_KEY_GAME]),
            players: snapshot[COMPRESSED_KEY_PLAYERS].map(SnapshotService.decompressPlayer),
            cards: SnapshotService.decompressCards(snapshot[COMPRESSED_KEY_CARDS]),
            playerRegions: SnapshotService.decompressPlayerRegions(snapshot[COMPRESSED_KEY_PLAYER_REGIONS])
        };
    }

    static decompressCard(compressedCard: ICompressedCard, state: CardState, playerId?: number): IDecompressedCard {
        return {
            id: compressedCard.id,
            index: compressedCard[COMPRESSED_KEY_INDEX],
            state,
            leaderId: compressedCard[COMPRESSED_KEY_LEADER_ID],
            playerId,
        }
    }

    static decompressCards(compressedCards: ICompressedCards, playerId?: number): IDecompressedCard[] {
        const decompressedCards: IDecompressedCard[] = [];

        if (playerId) {
            for (const card of compressedCards[COMPRESSED_KEY_IN_BAND]) {
                decompressedCards.push(SnapshotService.decompressCard(card, CardState.IN_BAND, playerId));
            }

            for (const card of compressedCards[COMPRESSED_KEY_IN_HAND]) {
                decompressedCards.push(SnapshotService.decompressCard(card, CardState.IN_HAND, playerId));
            }
        } else {
            for (const card of compressedCards[COMPRESSED_KEY_IN_MARKET]) {
                decompressedCards.push(SnapshotService.decompressCard(card, CardState.IN_MARKET));
            }

            for (const card of compressedCards[COMPRESSED_KEY_IN_DECK]) {
                decompressedCards.push(SnapshotService.decompressCard(card, CardState.IN_DECK));
            }

            for (const card of compressedCards[COMPRESSED_KEY_REVEALED]) {
                decompressedCards.push(SnapshotService.decompressCard(card, CardState.REVEALED));
            }
        }

        return decompressedCards;
    }

    static decompressColor(compressedColor: string): Color {
        return DECOMPRESSED_COLOR_KEYS[compressedColor];
    }

    static decompressGame(compressedGame: ICompressedGame): IDecompressedGame  {
        return {
            age: compressedGame[COMPRESSED_KEY_AGE],
            activePlayerId: compressedGame[COMPRESSED_KEY_ACTIVE_PLAYER_ID],
        }
    }

    static decompressPlayer(compressedPlayer: ICompressedPlayer): IDecompressedPlayer  {
        return {
            id: compressedPlayer.id,
            points: compressedPlayer[COMPRESSED_KEY_PLAYER_POINTS],
            giantTokenValue: compressedPlayer[COMPRESSED_KEY_GIANT_TOKEN_VALUE],
            merfolkTrackScore: compressedPlayer[COMPRESSED_KEY_MERFOLK_TRACK_SCORE],
            trollTokens: compressedPlayer[COMPRESSED_KEY_TROLL_TOKENS],
            orcTokens: compressedPlayer[COMPRESSED_KEY_ORC_TOKENS].map(SnapshotService.decompressColor),
            cards: SnapshotService.decompressCards(compressedPlayer[COMPRESSED_KEY_CARDS], compressedPlayer.id),
        };
    }

    static decompressPlayerRegions(compressedPlayerRegions: ICompressedPlayerRegion[]): IDecompressedPlayerRegion[]  {
        return compressedPlayerRegions.map(compressedPlayerRegion => ({
            playerId: compressedPlayerRegion[COMPRESSED_KEY_PLAYER_ID],
            regionId: compressedPlayerRegion[COMPRESSED_KEY_REGION_ID],
            tokens: compressedPlayerRegion[COMPRESSED_KEY_TOKENS],
        }));
    }

    static async restore(snapshotId: number) {
        const transaction = await sequelize.transaction();

        try {
            const snapshot = await Snapshot.findOne({
                where: {
                    id: snapshotId,
                }
            });

            if (!snapshot) {
                throw new CustomException(ERROR_NOT_FOUND, 'Snapshot not found');
            }

            const decompressedSnapshot = SnapshotService.decompress(snapshot.snapshot);

            await Game.update(decompressedSnapshot.game, {
                where: {
                    id: snapshot.gameId,
                }
            });

            for (const player of decompressedSnapshot.players) {
                await Player.update(player, {
                    where: {
                        id: player.id,
                    }
                });

                for (const card of player.cards) {
                    await Card.update(card, {
                        where: {
                            id: card.id,
                        }
                    });
                }
            }

            for (const card of decompressedSnapshot.cards) {
                await Card.update(card, {
                    where: {
                        id: card.id,
                    }
                });
            }

            const regionIds: number[] = [];

            for (const playerRegion of decompressedSnapshot.playerRegions) {
                regionIds.push(playerRegion.regionId);

                await PlayerRegion.update(playerRegion, {
                    where: {
                        regionId: playerRegion.regionId,
                        playerId: playerRegion.playerId,
                    }
                });
            }

            await PlayerRegion.destroy({
                where: {
                    playerId: {
                        [Op.in]: decompressedSnapshot.players.map(player => player.id),
                    },
                    regionId: {
                        [Op.notIn]: regionIds
                    }
                }
            });

            await NextAction.destroy({
                where: {
                    gameId: snapshot.gameId,
                    state: NextActionState.PENDING
                }
            });

            const actionLog = await ActionLog.findOne({
                where: {
                    id: snapshotId,
                }
            });

            if (actionLog) {
                await ActionLog.destroy({
                    where: {
                        gameId: snapshot.gameId,
                        id: {
                            [Op.gte]: actionLog.id,
                        }
                    }
                });
            }

            await Snapshot.destroy({
                where: {
                    gameId: snapshot.gameId,
                    id: {
                        [Op.gte]: snapshotId,
                    }
                }
            });

            await transaction.commit();
        } catch (error: any) {
            await transaction.rollback();
            throw new CustomException(error.type, error.message);
        }
    }
};
