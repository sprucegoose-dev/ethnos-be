import {
    ActionType,
    IActionPayload,
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
import { Color } from '../types/game.interface';
import { IHandleTribeOptions, IRemainingCardsOptions } from '../types/command.interface';

const {
    CENTAUR,
    DRAGON,
    // DWARF,
    ELF,
    GIANT,
    HALFING,
    MERFOLK,
    MINOTAUR,
    ORC,
    SKELETON,
    TROLL,
    WINGFOLK,
    WIZARD,
} = TribeName;

export class CommandService {

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

        let nextAction = null;

        switch (payload.type) {
            case ActionType.DRAW_CARD:
                await CommandService.handleDrawCard(game, activePlayer);
                break;
            case ActionType.PLAY_BAND:
                nextAction = await CommandService.handlePlayBand(game, activePlayer, payload);
                break;
            case ActionType.PICK_UP_CARD:
                nextAction = await CommandService.handlePickUpCard(game, activePlayer, payload.cardId);
                break;
        }

        if (!nextAction) {
            // end turn;
        } else {
            // set next player to be the active player
        }

        const updatedGameState = await GameService.getState(gameId);

        EventService.emitEvent({
            type: EVENT_GAME_UPDATE,
            payload: updatedGameState
        });
    }

    static async handlePlayBand(game: Game, player: Player, payload: IPlayBandPayload): Promise<INextActionPayload> {
        let nextAction;

        const bandCards = this.getBandCards(player, payload.cardIds);
        const leader = this.getLeader(bandCards, payload.leaderId);
        const band = this.getBandDetails(leader, bandCards, payload);
        let remainingCards = this.getRemainingCards(player, payload.cardIds);

        this.validateTribe(band.tribe);

        await this.assignCardsToBand(player, payload, bandCards);
        const region = await this.getRegion(game, band.color);
        const playerRegion = await this.getPlayerRegion(region, player);

        nextAction = await this.handleTribeLogic({
            band,
            game,
            player,
            payload,
            remainingCards,
            playerRegion
        });

        await this.handleRemainingCards({
            remainingCards,
            nextAction,
            player,
            payload,
            tribe: band.tribe
        });

        return nextAction;
    }

    static getBandCards(player: Player, cardIds: number[]): Card[] {
        return player.cards.filter(card => cardIds.includes(card.id));
    }

    static getRemainingCards(player: Player, cardIds: number[]): Card[] {
        return player.cards.filter(card => !cardIds.includes(card.id));
    }

    static getLeader(bandCards: Card[], leaderId: number): Card {
        return bandCards.find(card => card.id === leaderId);
    }

    static getBandDetails(leader: Card, bandCards: Card[], payload: IPlayBandPayload) {
        let tribe = leader.tribe.name;
        let color = leader.color;
        let bandSize = bandCards.length;

        if (tribe === MINOTAUR) {
            bandSize++;
        }

        if (tribe === WINGFOLK) {
            color = payload.regionColor;
        }

        return { tribe, color, bandSize };
    }

    static validateTribe(tribe: TribeName) {
        if (tribe === SKELETON) {
            throw new CustomException(ERROR_BAD_REQUEST, 'A Skeleton cannot be the leader of a band');
        }
    }

    static async assignCardsToBand(player: Player, payload: IPlayBandPayload, bandCards: Card[]) {
        await Card.update({
            state: CardState.IN_BAND,
            playerId: player.id,
            leaderId: payload.leaderId,
            index: null,
        }, {
            where: {
                id: { [Op.in]: bandCards.map(card => card.id) }
            }
        });
    }

    static async getRegion(game: Game, color: Color) {
        return Region.findOne({ where: { gameId: game.id, color } });
    }

    static async getPlayerRegion(region: Region, player: Player) {
        return PlayerRegion.findOne({
            where: {
                regionId: region.id,
                playerId: player.id
            }
        });
    }

    static async handleTribeLogic({
        band,
        game,
        player,
        remainingCards,
        playerRegion,
    }: IHandleTribeOptions): Promise<INextActionPayload> {
        let nextAction;

        const {
            bandSize,
            color,
            tribe,
        } = band;

        if (tribe !== HALFING && bandSize > playerRegion.tokens) {
            await playerRegion.update({ tokens: playerRegion.tokens + 1 });

            if (tribe === CENTAUR && remainingCards.length) {
                nextAction = { type: ActionType.PLAY_BAND };
            }
        }

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

        return nextAction;
    }

    static async handleOrcTokens(player: Player, color: Color) {
        if (!player.orcTokens.includes(color)) {
            await player.update({ orcTokens: [...player.orcTokens, color] });
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

    static async handleMerfolkTrack(player: Player, bandSize: number) {
        const merfolkTrackCheckpoints = [3, 7, 12, 18];
        let freeTokens = 0;

        for (let i = 1; i <= bandSize; i++) {
            if (merfolkTrackCheckpoints.includes(player.merfolkTrackScore + i)) {
                freeTokens++;
            }
        }

        for (let i = 0; i < freeTokens; i++) {
            // TODO: add 'FREE_TOKEN' next action for each free token
        }

        await player.update({
            merfolkTrackScore: player.merfolkTrackScore + bandSize,
        });
    }

    static async handleWizardDraw(game: Game, player: Player, bandSize: number) {
        const cardsInMarket = game.cards.filter(card => card.state === CardState.IN_MARKET);
        const maxDrawSize = Math.min(bandSize, cardsInMarket.length);

        for (let i = 0; i < maxDrawSize; i++) {
            await CommandService.handleDrawCard(game, player);
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

    static filterElfCards(remainingCards: Card[], payload: IPlayBandPayload) {
        return remainingCards.filter(card => !payload.cardIdsToKeep.includes(card.id));
    }

    static async handleRemainingCards({
        remainingCards,
        nextAction,
        player,
        payload,
        tribe,
    }: IRemainingCardsOptions) {
        if (tribe === ELF) {
            remainingCards = this.filterElfCards(remainingCards, payload);
        }

        if (remainingCards.length && !nextAction) {
            await Card.update({
                state: CardState.IN_MARKET,
                playerId: player.id,
                leaderId: payload.leaderId,
                index: null,
            }, {
                where: {
                    playerId: player.id,
                    id: { [Op.in]: remainingCards.map(card => card.id) }
                }
            });
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

        while (nextCard.tribe.name === DRAGON && dragonsRemaining > 1) {
            await nextCard.update({
                state: CardState.REVEALED,
            });
            dragonsRemaining--;
            nextCardIndex++;
            nextCard = cardsInDeck[nextCardIndex];
        }

        if (!dragonsRemaining) {
            // trigger game end
        } else {
            await nextCard.update({
                state: CardState.IN_HAND,
                playerId: player.id,
                index: null,
            });
        }
    }
}

export default CommandService;
