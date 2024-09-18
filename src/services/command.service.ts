import {
    ActionType,
    IActionPayload,
    IBandDetails,
    INextActionPayload,
    IPlayBandPayload
} from '../types/action.interface';
import {
    CustomException,
    ERROR_BAD_REQUEST,
    ERROR_NOT_FOUND,
} from '../helpers/exception_handler';
import GameService from './game.service';
import EventService from './event.service';
import { EVENT_GAME_UPDATE } from '../types/event.interface';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { CardState } from '../types/card.interface';
import { TribeName } from '../types/tribe.interface';
import { Card } from '../models/card.model';
import { Op } from 'sequelize';
import { Region } from '../models/region.model';
import PlayerRegion from '../models/player_region.model';
import {
    Color,
    GameState
} from '../types/game.interface';
import { IRemainingCardsOptions } from '../types/command.interface';
import { ActionService } from './action.service';
import { NextAction } from '../models/nextAction.model';
import { NextActionState } from '../types/nextAction.interface';

const {
    CENTAUR,
    DRAGON,
    ELF,
    GIANT,
    HALFLING,
    MERFOLK,
    MINOTAUR,
    ORC,
    SKELETON,
    TROLL,
    WINGFOLK,
    WIZARD,
} = TribeName;

export class CommandService {

    static async addTokenToRegion(game: Game, player: Player, band: IBandDetails, remainingCards: Card[] = []): Promise<void> {
        const {
            bandSize,
            color,
            tribe,
        } = band;

        const region = await this.getRegion(game, color);
        let playerRegion = await this.getPlayerRegion(region, player);

        if (!playerRegion) {
            playerRegion = await PlayerRegion.create({
                playerId: player.id,
                regionId: region.id,
            });
        }

        if (tribe !== HALFLING && bandSize > playerRegion.tokens) {
            await playerRegion.update({ tokens: playerRegion.tokens + 1 });

            if (tribe === CENTAUR && remainingCards.length) {
                await NextAction.create({
                    gameId: game.id,
                    playerId: player.id,
                    type: ActionType.PLAY_BAND,
                    state: NextActionState.PENDING
                });
            }
        }
    }

    static async assignCardsToBand(player: Player, bandCardIds: number[], leaderId: number) {
        await Card.update({
            state: CardState.IN_BAND,
            playerId: player.id,
            leaderId,
            index: null,
        }, {
            where: {
                id: {
                    [Op.in]: bandCardIds
                }
            }
        });
    }

    static filterElfRemainingCards = (remainingCards: Card[], cardIdsToKeep: number[], bandSize: number) => {
        if (!Array.isArray(cardIdsToKeep)) {
            throw new CustomException(ERROR_BAD_REQUEST, 'cardIdsToKeep must be an array');
        }

        const remainingCardIds = remainingCards.map(card => card.id);

        if (!cardIdsToKeep.every(cardId => remainingCardIds.includes(cardId))) {
            throw new CustomException(ERROR_BAD_REQUEST, "cardIdsToKeep must only include IDs of cards in a player's hand");
        }

        if (cardIdsToKeep.length > bandSize) {
            throw new CustomException(ERROR_BAD_REQUEST, "cardIdsToKeep must not exceed the size of the band");
        }

        return remainingCards.filter(card => !cardIdsToKeep.includes(card.id));
    }

    static getBandDetails(leader: Card, bandCardIds: number[], regionColor?: Color): IBandDetails {
        let tribe = leader.tribe.name;
        let color = leader.color;
        let bandSize = bandCardIds.length;

        if (tribe === MINOTAUR) {
            bandSize++;
        }

        if (tribe === WINGFOLK && regionColor) {
            color = regionColor;
        }

        return { tribe, color, bandSize };
    }

    static getRemainingCards(player: Player, cardIds: number[]): Card[] {
        return player.cards.filter(card => !cardIds.includes(card.id));
    }

    static async getPlayerRegion(region: Region, player: Player): Promise<PlayerRegion> {
        return PlayerRegion.findOne({
            where: {
                regionId: region.id,
                playerId: player.id
            }
        });
    }

    static async getRegion(game: Game, color: Color): Promise<Region> {
        return Region.findOne({ where: { gameId: game.id, color } });
    }

    static async handleAction(userId: number, gameId: number, payload: IActionPayload): Promise<void> {
        const game = await GameService.getState(gameId);

        if (!game) {
            throw new CustomException(ERROR_NOT_FOUND, 'Game not found');
        }

        const activePlayer = game.players.find(p =>
            p.id === game.activePlayerId && p.userId === userId
        );

        if (!activePlayer) {
            throw new CustomException(ERROR_BAD_REQUEST, 'You are not the active player');
        }

        let nextActions = [];

        switch (payload.type) {
            case ActionType.DRAW_CARD:
                await CommandService.handleDrawCard(game, activePlayer);
                break;
            case ActionType.PLAY_BAND:
                nextActions = await CommandService.handlePlayBand(game, activePlayer, payload);
                break;
            case ActionType.PICK_UP_CARD:
                await CommandService.handlePickUpCard(game, activePlayer, payload.cardId);
                break;
        }

        // TODO: update actions log

        if (!nextActions.length) {
            // end turn;
            // set next player to be the active player
        }

        const updatedGameState = await GameService.getState(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });
    }

    static async handleDrawCard(game: Game, player: Player): Promise<void> {
        const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

        if (cardsInHand.length === 10) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Cannot exceed hand limit of 10 cards');
        }

        const cardsInDeck = game.cards
            .filter(card => card.state === CardState.IN_DECK)
            .sort((cardA, cardB) => cardA.index - cardB.index);

        let dragonsRemaining = cardsInDeck.filter(card => card.tribe.name === DRAGON).length;

        let nextCardIndex = 0;

        let nextCard = cardsInDeck[nextCardIndex];

        do {
            if (nextCard.tribe.name === DRAGON) {
                await nextCard.update({
                    state: CardState.REVEALED,
                    index: null,
                });
                dragonsRemaining--;
                nextCardIndex++;
                nextCard = cardsInDeck[nextCardIndex];
            }
        } while (nextCard.tribe.name === DRAGON && dragonsRemaining > 1)

        if (!dragonsRemaining) {
            await game.update({
                state: GameState.ENDED
            });
        } else {
            await nextCard.update({
                state: CardState.IN_HAND,
                playerId: player.id,
                index: null,
            });
        }
    }

    static async handleGiantBand(game: Game, player: Player, bandSize: number) {
        const largestGiantBand = await Player.findOne({
            where: {
                gameId: game.id,
                giantTokenValue: {
                    [Op.gte]: bandSize
                }
            }
        });

        if (!largestGiantBand) {
            await player.update({
                giantTokenValue: bandSize,
                points: player.points + 2,
            });
        }
    }

    static async handlePlayBand(game: Game, player: Player, payload: IPlayBandPayload): Promise<INextActionPayload[]> {
        const leader = player.cards.find(card => card.id === payload.leaderId);
        const band = this.getBandDetails(leader, payload.cardIds, payload.regionColor);
        const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);
        let remainingCards = this.getRemainingCards(player, payload.cardIds);

        this.validateBand(cardsInHand, payload.cardIds, leader);

        await this.assignCardsToBand(player, payload.cardIds, leader.id);

        await this.addTokenToRegion(game, player, band, remainingCards);

        await this.handleTribeLogic(game,player, band);

        const nextActions = await NextAction.findAll({
            where: {
                gameId: game.id,
                state: NextActionState.PENDING,
            }
        });

        await CommandService.handleRemainingCards({
            remainingCards,
            nextActions,
            player,
            cardIdsToKeep: payload.cardIdsToKeep,
            band,
        });

        return nextActions;
    }

    static async handleOrcTokens(player: Player, color: Color) {
        if (!player.orcTokens.includes(color)) {
            await player.update({ orcTokens: [...player.orcTokens, color] });
        }
    }

    static async handleMerfolkTrack(player: Player, bandSize: number): Promise<void> {
        const merfolkTrackCheckpoints = [3, 7, 12, 18];
        let freeTokens = 0;

        for (let i = 1; i <= bandSize; i++) {
            if (merfolkTrackCheckpoints.includes(player.merfolkTrackScore + i)) {
                freeTokens++;
            }
        }

        for (let i = 0; i < freeTokens; i++) {
            await NextAction.create({
                gameId: player.gameId,
                playerId: player.id,
                type: ActionType.ADD_TOKEN,
                state: NextActionState.PENDING
            });
        }

        await player.update({
            merfolkTrackScore: player.merfolkTrackScore + bandSize,
        });
    }

    static async handleRemainingCards({
        remainingCards,
        nextActions,
        player,
        cardIdsToKeep,
        band,
    }: IRemainingCardsOptions) {
        if (band.tribe === ELF) {
            remainingCards = CommandService.filterElfRemainingCards(remainingCards, cardIdsToKeep, band.bandSize);
        }

        if (band.tribe === CENTAUR && nextActions.find(action => action.type === ActionType.PLAY_BAND)) {
            return;
        }

        if (remainingCards.length) {
            await Card.update({
                state: CardState.IN_MARKET,
                playerId: player.id,
                leaderId: null,
                index: null,
            }, {
                where: {
                    playerId: player.id,
                    id: { [Op.in]: remainingCards.map(card => card.id) }
                }
            });
        }
    }

    static async handleTribeLogic(game: Game, player: Player, band: IBandDetails): Promise<void> {
        const {
            bandSize,
            color,
            tribe,
        } = band;

        switch (tribe) {
            case ORC:
                await this.handleOrcTokens(player, color);
                break;
            case GIANT:
                await this.handleGiantBand(game, player, bandSize);
                break;
            case MERFOLK:
                await this.handleMerfolkTrack(player, bandSize);
                break;
            case WIZARD:
                await this.handleWizardDraw(game, player, bandSize);
                break;
            case TROLL:
                await this.handleTrollTokens(game, player, bandSize);
                break;
        }
    }

    static async handleTrollTokens(game: Game, player: Player, bandSize: number) {
        let claimedTokens: number[] = [];

        game.players.map(player => {
            claimedTokens = [...claimedTokens, ...player.trollTokens]
        });

        const trollTokens = [6, 5, 4, 3, 2, 1].filter(token => !claimedTokens.includes(token));

        if (trollTokens.includes(bandSize)) {
            await player.update({ trollTokens: [...player.trollTokens, bandSize] });
        } else {
            const smallerToken = trollTokens.find(token => token < bandSize);

            if (smallerToken) {
                await player.update({ trollTokens: [...player.trollTokens, smallerToken] });
            }
        }
    }

    static async handleWizardDraw(game: Game, player: Player, bandSize: number) {
        const cardsInDeck = game.cards.filter(card => card.state === CardState.IN_DECK)
            .sort((cardA, cardB) => cardA.index - cardB.index);
        const maxDrawSize = Math.min(bandSize, cardsInDeck.length);

        for (let i = 0; i < maxDrawSize; i++) {
            await CommandService.handleDrawCard(game, player);
        }
    }

    static async handlePickUpCard(game: Game, player: Player, cardId: number): Promise<void> {
        const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

        if (cardsInHand.length === 10) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Cannot exceed hand limit of 10 cards');
        }

        const card = game.cards.find(card => card.state === CardState.IN_MARKET && card.id === cardId);

        if (!card) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid card');
        }

        await card.update({
            state: CardState.IN_HAND,
            playerId: player.id,
            index: null,
        });
    }

    static validateBand(cardsInHand: Card[], bandCardIds: number[], leader: Card): boolean {
        if (leader.tribe.name === SKELETON) {
            throw new CustomException(ERROR_BAD_REQUEST, 'A Skeleton cannot be the leader of a band');
        }

        const validActions = ActionService.getPlayBandActions(cardsInHand);

        let isValid = false;

        for (const action of validActions) {
            const validCardIds = action.cardIds;

            if (bandCardIds.every(cardId => validCardIds.includes(cardId))) {
                isValid = true;
                break;
            }
        }

        if (!isValid) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Invalid band');
        }

        return isValid;
    }
}

export default CommandService;
