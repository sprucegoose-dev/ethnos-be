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
    COMPRESSED_KEY_PLAYER_POINTS,
    COMPRESSED_KEY_REVEALED,
    COMPRESSED_KEY_TROLL_TOKENS,
    DECOMPRESSED_COLOR_KEYS,
    ICompressedCard,
    ICompressedCards,
    ICompressedGame,
    ICompressedPlayer,
    ICompressedSnapshot,
    IDecompressedCard,
    IDecompressedGame,
    IDecompressedPlayer,
    IDecompressedSnapshot,
} from './snapshot.interface';

import { CardState } from '@interfaces/card.interface';

import Player from '@models/player.model';
import Card from '@models/card.model';
import Snapshot from '@models/snapshot.model';

export default class SnapshotService {

    static async create(gameState: IGameState): Promise<void> {
        const snapshot = SnapshotService.compress(gameState)

        await Snapshot.create({
            gameId: gameState.id,
            age: gameState.age,
            playerId: gameState.activePlayerId,
            snapshot,
        });
    }

    static compress(gameState: IGameState): ICompressedSnapshot  {
        return {
            [COMPRESSED_KEY_GAME]: SnapshotService.compressGame(gameState),
            [COMPRESSED_KEY_PLAYERS]: gameState.players.map(SnapshotService.compressPlayer),
            [COMPRESSED_KEY_CARDS]: SnapshotService.compressCards(gameState.cards)
        }
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
            [CardState.IN_MARKET, CardState.IN_DECK, CardState.IN_MARKET].includes(card.state)
        )

        for (const card of cards) {
            const compressedCard: ICompressedCard  = {
                id: card.id,
                [COMPRESSED_KEY_INDEX]: card.index,
            };

            if (card.leaderId) {
                compressedCard[COMPRESSED_KEY_LEADER_ID] = card.leaderId;
            }

            // @ts-ignore
            compressedCards[COMPRESSED_CARD_STATE_KEYS[card.state]].push(card.id);
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

    static async decompress(snapshot: ICompressedSnapshot): Promise<IDecompressedSnapshot>  {
        return {
            game: SnapshotService.decompressGame(snapshot[COMPRESSED_KEY_GAME]),
            players: snapshot[COMPRESSED_KEY_PLAYERS].map(SnapshotService.decompressPlayer),
            cards: SnapshotService.decompressCards(snapshot[COMPRESSED_KEY_CARDS]),
        }

    }

    static decompressCard(compressedCard: ICompressedCard, playerId: number, state: CardState): IDecompressedCard {
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
                decompressedCards.push(SnapshotService.decompressCard(card, playerId, CardState.IN_BAND));
            }

            for (const card of compressedCards[COMPRESSED_KEY_IN_HAND]) {
                decompressedCards.push(SnapshotService.decompressCard(card, playerId, CardState.IN_HAND));
            }
        } else {
            for (const card of compressedCards[COMPRESSED_KEY_IN_MARKET]) {
                decompressedCards.push(SnapshotService.decompressCard(card, null, CardState.IN_MARKET));
            }

            for (const card of compressedCards[COMPRESSED_KEY_IN_DECK]) {
                decompressedCards.push(SnapshotService.decompressCard(card, null, CardState.IN_DECK));
            }

            for (const card of compressedCards[COMPRESSED_KEY_REVEALED]) {
                decompressedCards.push(SnapshotService.decompressCard(card, null, CardState.REVEALED));
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
            cards: SnapshotService.decompressCards(compressedPlayer[COMPRESSED_KEY_CARDS]),
        }
    }

};