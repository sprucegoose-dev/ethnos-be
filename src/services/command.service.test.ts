import { Op } from 'sequelize';
import { Card } from '../models/card.model';
import { CardType } from '../models/card_type.model';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { ActionType, IActionPayload } from '../types/action.interface';
import { Color, Suit } from '../types/card_type.interface';
import { EVENT_GAME_UPDATE } from '../types/event.interface';
import { GameState } from '../types/game.interface';
import { IUserResponse } from '../types/user.interface';
import CardService from './card.service';
import CommandService from './command.service';
import EventService from './event.service';
import GameService from './game.service';
import PlayerService from './player.service';
import UserService from './user.service';

describe('CommandService', () => {
    const userDataA = {
        username: 'SpruceGoose',
        email: 'spruce.goose@gmail.com',
        password: 'alrighty.then',
    };
    const userDataB = {
        username: 'VioleTide',
        email: 'violet.tide@gmail.com',
        password: 'animaniacs',
    };
    let userA: IUserResponse;
    let userB: IUserResponse;

    beforeAll(async () => {
        await Game.truncate();
        userA = await UserService.create(userDataA);
        userB = await UserService.create(userDataB);
    });

    describe('hasSet', () => {

        it('should return \'true\' if 3 cards have the same color, which isn\'t the Codex color', async () => {
            const cardTypes = await CardType.findAll({
                where: {
                    color: Color.RED,
                },
                limit: 3,
            });

            const cards = [];

            for (const cardType of cardTypes) {
                const card = await CardService.create({
                    cardTypeId: cardType.id,
                });

                cards.push(card);
            }

            expect(CommandService.hasSet(cards, Color.BLUE)).toBe(true);
        });

        it('should return \'true\' if 3 cards have the same suit, and none have the Codex color', async () => {
            const cardTypes = await CardType.findAll({
                where: {
                    suit: Suit.SKULL,
                    color: {
                        [Op.not]: Color.BLUE,
                    },
                },
                limit: 3,
            });

            const cards = [];

            for (const cardType of cardTypes) {
                const card = await CardService.create({
                    cardTypeId: cardType.id,
                });

                cards.push(card);
            }

            expect(CommandService.hasSet(cards, Color.BLUE)).toBe(true);
        });

        it('should return \'true\' if 3 cards have the same number, and none have the Codex color', async () => {
            const cardTypes = await CardType.findAll({
                where: {
                    value: 3,
                    color: {
                        [Op.not]: Color.BLUE,
                    },
                },
                limit: 3,
            });

            const cards = [];

            for (const cardType of cardTypes) {
                const card = await CardService.create({
                    cardTypeId: cardType.id,
                });

                cards.push(card);
            }

            expect(CommandService.hasSet(cards, Color.BLUE)).toBe(true);
        });

        it('should return \'false\' if 3 cards have the same color, but it\'s the Codex color', async () => {
            const cardTypes = await CardType.findAll({
                where: {
                    color: Color.RED,
                },
                limit: 3,
            });

            const cards = [];

            for (const cardType of cardTypes) {
                const card = await CardService.create({
                    cardTypeId: cardType.id,
                });

                cards.push(card);
            }

            expect(CommandService.hasSet(cards, Color.RED)).toBe(false);
        });

        it('should return \'false\' if 3 cards have the same suit, but at least one is the Codex color', async () => {
            const cardTypes = await CardType.findAll({
                where: {
                    suit: Suit.FEATHER,
                    color: {
                        [Op.in]: [
                            Color.RED,
                            Color.BLUE,
                            Color.GREEN,
                        ]
                    }
                },
                limit: 3,
            });

            const cards = [];

            for (const cardType of cardTypes) {
                const card = await CardService.create({
                    cardTypeId: cardType.id,
                });

                cards.push(card);
            }

            expect(CommandService.hasSet(cards, Color.RED)).toBe(false);
        });

        it('should return \'false\' if 3 cards have the same number, but at least one is the Codex color', async () => {
            const cardTypes = await CardType.findAll({
                where: {
                    value: 2,
                    color: {
                        [Op.in]: [
                            Color.RED,
                            Color.BLUE,
                            Color.GREEN,
                        ]
                    }
                },
                limit: 3,
            });

            const cards = [];

            for (const cardType of cardTypes) {
                const card = await CardService.create({
                    cardTypeId: cardType.id,
                });

                cards.push(card);
            }

            expect(CommandService.hasSet(cards, Color.RED)).toBe(false);
        });

    });

    describe('resolveCombat', () => {
        let game: Game;
        let playerA: Player;
        let playerB: Player;
        let resolveParadoxSpy: any;

        beforeAll(async () => {
            game = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, game.id);
            playerB = await PlayerService.create(userB.id, game.id);

            await GameService.start(userA.id, game.id);

            resolveParadoxSpy = jest.spyOn(CommandService, 'resolveParadox');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        afterAll(async () => {
            await Game.truncate();
        });

        it('should call CommandService.resolveParadox if there is a winner and the loser has points to lose', async () => {
            let cards = await Card.findAll({
                where: {
                    gameId: game.id,
                },
                include: [CardType]
            });

            game.codexColor = Color.RED;

            cards = cards.map(c => c.toJSON());

            const mockPlayerCards = cards.filter(c =>
                [3 ,4].includes(c.type.value) && c.type.color !== game.codexColor
            ).slice(0, 3);

            const mockOpponentCards = cards.filter(c =>
                [1, 2].includes(c.type.value)
            ).slice(0, 3);

            playerA.points = 3;
            playerB.points = 2;

            await CommandService.resolveCombat({
                game,
                player: playerA,
                opponent: playerB,
                playerCards: mockPlayerCards,
                opponentCards: mockOpponentCards,
            });

            expect(resolveParadoxSpy).toHaveBeenCalledWith(game, playerA, playerB);
        });

        it('should call CommandService.resolveParadox via the tiebreaker when applicable', async () => {
            let cards = await Card.findAll({
                where: {
                    gameId: game.id,
                },
                include: [CardType]
            });

            game.codexColor = Color.RED;

            cards = cards.map(c => c.toJSON());

            // a single card with a value of 3
            const mockPlayerCards = [
                {
                    ...cards[0],
                    type: {
                        ...cards[0].type,
                        color: Color.BLUE,
                        value: 3,
                    }
                }
            ];

            // three cards with a value of 1
            const mockOpponentCards = cards.filter(c =>
                c.type.color !== game.codexColor
            ).slice(0, 3).map(c => {
                c.type.value = 1;
                return c;
            });

            playerA.points = 3;
            playerB.points = 2;

            await CommandService.resolveCombat({
                game,
                player: playerA,
                opponent: playerB,
                // @ts-ignore
                playerCards: mockPlayerCards,
                opponentCards: mockOpponentCards,
            });

            expect(resolveParadoxSpy).toHaveBeenCalledWith(game, playerA, playerB);
        });

        it('should NOT call CommandService.resolveParadox when players are tied', async () => {
            let cards = await Card.findAll({
                where: {
                    gameId: game.id,
                },
                include: [CardType]
            });

            game.codexColor = Color.RED;

            cards = cards.map(c => c.toJSON());

            const mockPlayerCards = cards.filter(c =>
                c.type.color !== game.codexColor
            ).slice(0, 3).map(c => {
                c.type.value = 2;
                return c;
            });
            const mockOpponentCards = cards.filter(c =>
                c.type.color !== game.codexColor
            ).slice(0, 3).map(c => {
                c.type.value = 2;
                return c;
            });

            playerA.points = 3;
            playerB.points = 2;

            await CommandService.resolveCombat({
                game,
                player: playerA,
                opponent: playerB,
                playerCards: mockPlayerCards,
                opponentCards: mockOpponentCards,
            });

            expect(resolveParadoxSpy).not.toHaveBeenCalled();
        });

        it('should NOT call CommandService.resolveParadox if there is a winner and the loser has NO points', async () => {
            let cards = await Card.findAll({
                where: {
                    gameId: game.id,
                },
                include: [CardType]
            });

            game.codexColor = Color.RED;

            cards = cards.map(c => c.toJSON());

            const mockPlayerCards = cards.filter(c =>
                [3 ,4].includes(c.type.value) && c.type.color !== game.codexColor
            ).slice(0, 3);

            const mockOpponentCards = cards.filter(c =>
                [1, 2].includes(c.type.value)
            ).slice(0, 3);

            playerA.points = 3;
            playerB.points = 0;

            await CommandService.resolveCombat({
                game,
                player: playerA,
                opponent: playerB,
                playerCards: mockPlayerCards,
                opponentCards: mockOpponentCards,
            });

            expect(resolveParadoxSpy).not.toHaveBeenCalledWith(game, playerA, playerB);
        });

    });

    describe('resolveParadox', () => {
        let game: Game;
        let playerA: Player;

        beforeAll(async () => {
            game = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, game.id);
            await PlayerService.create(userB.id, game.id);
            await GameService.start(userA.id, game.id);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        afterAll(async () => {
            await Game.truncate();
        });

        it('should award the player a point', async () => {
            await CommandService.resolveParadox(
                game,
                playerA,
            );

            const updatedPlayer = await Player.findByPk(playerA.id);

            expect(updatedPlayer.points).toBe(1);
        });

        it('should advance the Codex color', async () => {
            const initialCodexColor = Color.RED;

            await Game.update({
                codexColor: initialCodexColor,
            }, {
                where: {
                    id: game.id,
                }
            });

           let updatedGame = await Game.findByPk(game.id);

            await CommandService.resolveParadox(
                updatedGame,
                playerA,
            );

            updatedGame = await Game.findByPk(game.id);

            const nextCodexColor = CommandService.getNextCodeColor(initialCodexColor);

            expect(updatedGame.codexColor).toBe(nextCodexColor);
        });

        it('should end the game and set a winner if the player has reached 5 points', async () => {
            playerA.points = 4;

            await CommandService.resolveParadox(
                game,
                playerA,
            );

            const updatedGame = await Game.findByPk(game.id);

            expect(updatedGame.winnerId).toBe(playerA.userId);
            expect(updatedGame.state).toBe(GameState.ENDED);
        });

    });

    describe('Commands', () => {
        let game: Game;
        let playerA: Player;
        let playerB: Player;

        beforeAll(async () => {
            const newGame = await GameService.create(userA.id);
            playerA = await PlayerService.create(userA.id, newGame.id);
            playerB = await PlayerService.create(userB.id, newGame.id);
            game = await GameService.getState(newGame.id);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        describe('handleAction', () => {

            it('should call the Move command with the relevant payload', async () => {
                const handleMoveSpy = jest.spyOn(CommandService, 'handleMove');

                handleMoveSpy.mockImplementationOnce(jest.fn());

                await Game.update({
                    activePlayerId: playerA.id,
                }, {
                    where: {
                        id: game.id,
                    }
                });

                const payload: IActionPayload = {
                    sourceCardId: 1,
                    targetIndex: 3,
                    type: ActionType.MOVE,
                };

                await CommandService.handleAction(userA.id, game.id, payload);

                expect(handleMoveSpy).toHaveBeenCalled();
            });

            it('should call the Replace command with the relevant payload', async () => {
                const handleReplaceSpy = jest.spyOn(CommandService, 'handleReplace');

                handleReplaceSpy.mockImplementationOnce(jest.fn());

                await Game.update({
                    activePlayerId: playerA.id,
                }, {
                    where: {
                        id: game.id,
                    }
                });

                const payload: IActionPayload = {
                    targetIndex: 5,
                    type: ActionType.REPLACE,
                };

                await CommandService.handleAction(userA.id, game.id, payload);

                expect(handleReplaceSpy).toHaveBeenCalled();
            });

            it('should call the Deploy command with the relevant payload', async () => {
                const handleDeploySpy = jest.spyOn(CommandService, 'handleDeploy');

                handleDeploySpy.mockImplementationOnce(jest.fn());

                await Game.update({
                    activePlayerId: playerA.id,
                }, {
                    where: {
                        id: game.id,
                    }
                });

                const payload: IActionPayload = {
                    targetIndex: 6,
                    type: ActionType.DEPLOY,
                };

                await CommandService.handleAction(userA.id, game.id, payload);

                expect(handleDeploySpy).toHaveBeenCalled();
            });

            it('should emit an \'update game\' event', async () => {
                const emitEventSpy = jest.spyOn(EventService, 'emitEvent');

                const handleMoveSpy = jest.spyOn(CommandService, 'handleMove');

                handleMoveSpy.mockImplementationOnce(jest.fn());

                await Game.update({
                    activePlayerId: playerA.id,
                }, {
                    where: {
                        id: game.id,
                    }
                });

                const updatedGame = await GameService.getState(game.id);

                const payload: IActionPayload = {
                    targetIndex: 6,
                    type: ActionType.MOVE,
                };

                await CommandService.handleAction(userA.id, game.id, payload);

                expect(emitEventSpy).toHaveBeenCalledWith({
                    type: EVENT_GAME_UPDATE,
                    payload: updatedGame,
                });
            });

        });

        describe('handleDeploy', () => {

            it('should update the player\'s position', async () => {
                const actionPayload: IActionPayload = {
                    targetIndex: 4,
                    type: ActionType.DEPLOY,
                };

                await CommandService.handleDeploy(game, playerA, actionPayload);

                const updatedPlayer = await Player.findOne({
                    where: {
                        id: playerA.id,
                    }
                });

                expect(updatedPlayer.position).toBe(actionPayload.targetIndex);
            });

            it(`should update the game state from ${GameState.SETUP} to ${GameState.STARTED} when both players have positions`, async () => {
                const actionPayload: IActionPayload = {
                    targetIndex: 5,
                    type: ActionType.DEPLOY,
                };

                await CommandService.handleDeploy(game, playerB, actionPayload);

                const updatedGame = await Game.findOne({
                    where: {
                        id: game.id,
                    }
                });

                expect(updatedGame.state).toBe(GameState.STARTED);

            });

        });

        describe('handleReplace', () => {

            afterEach(async () => {
                await Card.truncate();
            });

            it('should place 3 cards from the player\'s instead of 3 cards in the continuum (lower index)', async () => {
                await GameService.start(userA.id, game.id);

                const playerCards = await Card.findAll({
                    where: {
                        playerId: playerA.id,
                    }
                });

                const playerCardIds = playerCards.map(c => c.id);

                const actionPayload: IActionPayload = {
                    targetIndex: 6,
                    type: ActionType.REPLACE,
                };

                playerA.position = 5;

                await CommandService.handleReplace(game, playerA, actionPayload);

                const updatedContinuumCards = await Card.findAll({
                    where: {
                        gameId: game.id,
                        index: {
                            [Op.in]: [6, 7, 8]
                        }
                    }
                });


                const updatedContinuumCardIds = updatedContinuumCards.map(c => c.id);

                expect(updatedContinuumCardIds).toEqual(playerCardIds);
            });

            it('should place 3 cards from the continuum into the player\'s hand', async () => {
                await GameService.start(userA.id, game.id);


                const cardsToPickUp = await Card.findAll({
                    where: {
                        gameId: game.id,
                        index: {
                            [Op.in]: [6, 7, 8]
                        }
                    }
                });

                const cardsToPickUpIds = cardsToPickUp.map(c => c.id);

                const actionPayload: IActionPayload = {
                    targetIndex: 6,
                    type: ActionType.REPLACE,
                };

                playerA.position = 5;

                await CommandService.handleReplace(game, playerA, actionPayload);

                const updatedPlayerCards = await Card.findAll({
                    where: {
                        index: null,
                        playerId: playerA.id,
                    }
                });

                const updatedPlayerCardIds = updatedPlayerCards.map(c => c.id);

                expect(updatedPlayerCardIds).toEqual(cardsToPickUpIds);
            });

            it('should place 3 cards from the player\'s instead of 3 cards in the continuum (higher index)', async () => {
                await GameService.start(userA.id, game.id);

                const playerCards = await Card.findAll({
                    where: {
                        playerId: playerA.id,
                    }
                });

                const playerCardIds = playerCards.map(c => c.id);

                const actionPayload: IActionPayload = {
                    targetIndex: 4,
                    type: ActionType.REPLACE,
                };

                playerA.position = 5;

                await CommandService.handleReplace(game, playerA, actionPayload);

                const updatedContinuumCards = await Card.findAll({
                    where: {
                        gameId: game.id,
                        index: {
                            [Op.in]: [2, 3, 4]
                        }
                    }
                });

                const updatedContinuumCardIds = updatedContinuumCards.map(c => c.id);

                expect(updatedContinuumCardIds).toEqual(playerCardIds);
            });

        });

        describe('handleMove', () => {

            afterEach(async () => {
                await Card.truncate();
            });

            it('should update the player\'s position to the target index', async () => {
                await GameService.start(userA.id, game.id);

                const startedGame = await GameService.getState(game.id);

                const playerCards = await await Card.findAll({
                    where: {
                        playerId: playerA.id,
                    }
                });

                const actionPayload: IActionPayload = {
                    sourceCardId: playerCards[0].id,
                    targetIndex: 6,
                    type: ActionType.MOVE,
                };

                playerA.position = 5;

                await CommandService.handleMove(startedGame, playerA, actionPayload);

                const updatedPlayer = await Player.findOne({
                    where: {
                        id: playerA.id,
                    }
                });

                expect(updatedPlayer.position).toEqual(actionPayload.targetIndex);
            });

            it('should swap the player\'s card with a card from the continuum', async () => {
                await GameService.start(userA.id, game.id);

                const startedGame = await GameService.getState(game.id);

                const playerCards = await await Card.findAll({
                    where: {
                        playerId: playerA.id,
                    }
                });

                const actionPayload: IActionPayload = {
                    sourceCardId: playerCards[0].id,
                    targetIndex: 6,
                    type: ActionType.MOVE,
                };

                const targetCard = await Card.findOne({
                    where: {
                        gameId: game.id,
                        index: actionPayload.targetIndex,
                    }
                });

                playerA.position = 5;

                await CommandService.handleMove(startedGame, playerA, actionPayload);


                const updatedPlayerCard = await Card.findAll({
                    where: {
                        playerId: playerA.id,
                        id: targetCard.id,
                    }
                });

                const updatedContinuumCard = await Card.findOne({
                    where: {
                        gameId: game.id,
                        index: actionPayload.targetIndex,
                    }
                });

                expect(updatedPlayerCard).toBeDefined();
                expect(updatedContinuumCard.id).toBe(actionPayload.sourceCardId);
            });

            it('should advance the codex color if the player has formed a set (i.e. \'paradox\')', async () => {
                await GameService.start(userA.id, game.id);

                const startedGame = await GameService.getState(game.id);

                const currentGame = await Game.findOne({
                    where: {
                        id: game.id,
                    }
                });

                const playerCards = await await Card.findAll({
                    where: {
                        playerId: playerA.id,
                    }
                });

                const hasSetSpy = jest.spyOn(CommandService, 'hasSet');

                hasSetSpy.mockReturnValueOnce(true);

                const actionPayload: IActionPayload = {
                    sourceCardId: playerCards[0].id,
                    targetIndex: 6,
                    type: ActionType.MOVE,
                };

                playerA.position = 5;

                await CommandService.handleMove(startedGame, playerA, actionPayload);

                const updatedGame = await Game.findOne({
                    where: {
                        id: game.id,
                    }
                });

                expect(updatedGame.codexColor).toBe(CommandService.getNextCodeColor(currentGame.codexColor));
            });

        });

        afterAll(async () => {
            await Game.truncate();
        });

    });

});
