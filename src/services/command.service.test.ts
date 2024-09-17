import { Game } from '../models/game.model';
import GameService from './game.service';
import {
    userA,
    userB,
    userC,
    userD,
} from '../../jest.setup';
import PlayerService from './player.service';
import { TribeName } from '../types/tribe.interface';
import { CommandService } from './command.service';
import { CardState } from '../types/card.interface';
import { IGameState } from '../types/game.interface';
import { Card } from '../models/card.model';
import { Player } from '../models/player.model';
import { Op } from 'sequelize';
import { Tribe } from '../models/tribe.model';
import { ERROR_BAD_REQUEST } from '../helpers/exception_handler';

function getCardsFromDeck(cards: Card[], quantity: number): number[] {
    return cards.filter(card =>
            card.state === CardState.IN_DECK
        )
        .sort((cardA, cardB) => cardA.index - cardB.index)
        .slice(0, quantity)
        .map(card => card.id);
}

describe('CommandService', () => {

    describe('handlePickUpCard', () => {
        let game: Game;
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            game = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, game.id);
            await PlayerService.create(userB.id, game.id);
            await PlayerService.create(userC.id, game.id);
            await PlayerService.create(userD.id, game.id);

            const settings = {
                tribes: [
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.WIZARD,
                ]
            };

            await GameService.start(userA.id, game.id, settings);

            gameState = await GameService.getState(game.id);
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it('should throw an error if a player already has 10 cards in hand', async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 9);

            await Card.update({
                playerId: playerA.id,
                state: CardState.IN_HAND,
            }, {
                where: {
                    id: {
                        [Op.in]: cardIdsToAssign
                    },
                    index: {
                        [Op.lte]: 9
                    }
                },
            });

            const player = await Player.findOne({
                where: {
                    id: playerA.id,
                },
                include: [
                    {
                        model: Card,
                        required: false,
                        include: [
                            Tribe,
                        ],
                    },
                ]
            });

            const cardToPickUp = await Card.findOne({
                where: {
                    gameId: game.id,
                    state: CardState.IN_MARKET
                }
            });

            const updatedGame = await GameService.getState(game.id);

            try {
                await CommandService.handlePickUpCard(updatedGame, player, cardToPickUp.id);
                throw new Error('Expected error not thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Cannot exceed hand limit of 10 cards');
            }
        });

        it('should throw an error if the target card being picked up is not in the market', async () => {
            const player = await Player.findOne({
                where: {
                    id: playerA.id,
                },
                include: [
                    {
                        model: Card,
                        required: false,
                        include: [
                            Tribe,
                        ],
                    },
                ]
            });

            const cardToPickUp = await Card.findOne({
                where: {
                    gameId: game.id,
                    state: CardState.IN_DECK
                }
            });

            const updatedGame = await GameService.getState(game.id);

            try {
                await CommandService.handlePickUpCard(updatedGame, player, cardToPickUp.id);
                throw new Error('Expected error not thrown');
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Invalid card');
            }
        });

        it('should assign the target card to the player if the card is in the market', async () => {
            let player = await Player.findOne({
                where: {
                    id: playerA.id,
                },
                include: [
                    {
                        model: Card,
                        required: false,
                        include: [
                            Tribe,
                        ],
                    },
                ]
            });

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(1);

            const cardToPickUp = await Card.findOne({
                where: {
                    gameId: game.id,
                    state: CardState.IN_MARKET
                }
            });

            const updatedGame = await GameService.getState(game.id);

            await CommandService.handlePickUpCard(updatedGame, player, cardToPickUp.id);

            player = await Player.findOne({
                where: {
                    id: playerA.id,
                },
                include: [
                    {
                        model: Card,
                        required: false,
                        include: [
                            Tribe,
                        ],
                    },
                ]
            });

            expect(player.cards.filter(card => card.state === CardState.IN_HAND).length).toBe(2);
        });
    });

});
