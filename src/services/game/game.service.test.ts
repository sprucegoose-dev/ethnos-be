import { Op } from 'sequelize';

import GameService from './game.service';

import Game from '@models/game.model';
import Player from '@models/player.model';
import Card from '@models/card.model';

import EventService from '@services/event/event.service';
import PlayerService from '@services/player/player.service';

import { EVENT_ACTIVE_GAMES_UPDATE } from '@interfaces/event.interface';
import { GameState, IGameSettings, IGameState } from '@interfaces/game.interface';
import { TribeName } from '@interfaces/tribe.interface';
import { CardState } from '@interfaces/card.interface';
import { PLAYER_COLORS, PlayerColor } from '@interfaces/player.interface';

import {
    ERROR_BAD_REQUEST,
    ERROR_FORBIDDEN,
    ERROR_NOT_FOUND,
} from '@helpers/exception-handler';

import {
    UNEXPECTED_ERROR_MSG,
    userA,
    userB,
    userC,
    userD,
} from '@jest.setup';
import { assignCardsToPlayer, createGame, getCardsFromDeck, returnPlayerCardsToDeck } from '../test-helpers';
import BotService from '../bot/bot.service';
import User from '../../models/user.model';
import { IScoringResults } from '../../interfaces/command.interface';

describe('GameService', () => {

    describe('addBotPlayer', () => {
        let gameState: IGameState;
        let playerA: Player;
        let playerB: Player;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
            playerA = result.playerA;
            playerB = result.playerB;
        });

        afterEach(async () => await Game.truncate());

        it('should add a bot to a game', async () => {
            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            await GameService.addBotPlayer(playerA.userId, gameState.id);

            gameState = await GameService.getState(gameState.id);

            const botPlayer = gameState.players.find(player => player.user.isBot);

            expect(botPlayer).not.toBe(undefined);
        });

        it('should throw an error if the game is not found', async () => {
            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            try {
                await GameService.addBotPlayer(playerA.userId, 10);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it('should throw an error if a player other than the game creator is trying to add a bot', async () => {
            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            try {
                await GameService.addBotPlayer(playerB.userId, gameState.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Only the game creator can add a bot player');
            }
        });

        it('should throw an error if a player tries to add a bot after the game had already started', async () => {
            await Game.update({
                state: GameState.STARTED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            try {
                await GameService.addBotPlayer(playerA.userId, gameState.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('You cannot add a bot to a game after it has started');
            }
        });

        it('should throw an error if a player tries to add a bot when the game is already full', async () => {
            await Game.update({
                state: GameState.CREATED,
                maxPlayers: 4,
            }, {
                where: {
                    id: gameState.id
                }
            });

            try {
                await GameService.addBotPlayer(playerA.userId, gameState.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('This game is already full');
            }
        });
    });

    describe('assignPlayerColor', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;

            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            await Player.update({
                color: null,
            }, {
                where: {
                    gameId: gameState.id
                }
            });
        });

        afterEach(async () => await Game.truncate());

        it('should assign a color to a player', async () => {
            await GameService.assignPlayerColor(userA.id, gameState.id, PlayerColor.BLUE);

            const updatedPlayer = await Player.findOne({
                where: {
                    gameId: gameState.id,
                    userId: userA.id,
                }
            });
            expect(updatedPlayer.color).toBe(PlayerColor.BLUE);
        });

        it('should allow resetting the color by providing a null value', async () => {
            await GameService.assignPlayerColor(userA.id, gameState.id, PlayerColor.BLUE);

            let updatedPlayer = await Player.findOne({
                where: {
                    gameId: gameState.id,
                    userId: userA.id,
                }
            });

            expect(updatedPlayer.color).toBe(PlayerColor.BLUE);

            await GameService.assignPlayerColor(userA.id, gameState.id, null);

            updatedPlayer = await Player.findOne({
                where: {
                    gameId: gameState.id,
                    userId: userA.id,
                }
            });

            expect(updatedPlayer.color).toBe(null);
        });

        it("should throw an error when trying to assign a color that's already taken", async () => {
            await GameService.assignPlayerColor(userA.id, gameState.id, PlayerColor.BLUE);

            try {
                await GameService.assignPlayerColor(userB.id, gameState.id, PlayerColor.BLUE);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('This color is already assigned to another player');
            }
        });

        it('should throw an error if the color is invalid', async () => {
            try {
                await GameService.assignPlayerColor(userB.id, gameState.id, 'invalid-color' as PlayerColor);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Invalid color');
            }
        });

        it('should throw an error if the game had already started', async () => {
            await Game.update({
                state: GameState.STARTED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            try {
                await GameService.assignPlayerColor(userB.id, gameState.id, PlayerColor.BLUE);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe("You can't change a player's color after the game had started");
            }
        });
    });

    describe('assignPlayerColors', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;

            await Player.update({
                color: null,
            }, {
                where: {
                    gameId: gameState.id
                }
            });
        });

        afterEach(async () => await Game.truncate());

        it('automatically assigns colors to players in a game', async () => {
            const players = await Player.findAll({
                where: {
                    gameId: gameState.id
                }
            });

            for (const player of players) {
                expect(player.color).toBe(null);
            }

            await GameService.assignPlayerColors(players);

            const updatedGame = await GameService.getState(gameState.id);

            for (const player of updatedGame.players) {
                expect(PLAYER_COLORS.includes(player.color)).toBe(true);
            }
        });
    });

    describe('create', () => {

        afterEach(async () => await Game.truncate());

        it('should create a new game', async () => {
            const newGame = await GameService.create(userA.id);

            const existingGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(existingGame.creatorId).toBe(userA.id);
            expect(existingGame.state).toBe(GameState.CREATED);
        });

        it('should emit an \'update active games\' websocket event', async () => {
            await GameService.create(userA.id);

            const activeGames = await GameService.getActiveGames();

            const emitEventSpy = jest.spyOn(EventService, 'emitEvent');

            expect(emitEventSpy).toHaveBeenCalledWith({
                type: EVENT_ACTIVE_GAMES_UPDATE,
                payload: activeGames
            });
        });

        it('should throw an error if the user already has an active game', async () => {
            await GameService.create(userA.id);

            try {
                await GameService.create(userA.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Please leave your other active game(s) before creating a new one.');
            }
        });
    });

    describe('getActiveGames', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
        });

        afterEach(async () => await Game.truncate());

        it('should return all active games', async () => {
            const activeGames = await GameService.getActiveGames();
            expect(activeGames[0].id).toBe(gameState.id);
        });

        it("should return a game with a 'hasPassword' value of 1 if the active game has a password", async () => {
            await Game.update({
                password: 'some-password'
            }, {
                where: {
                    id: gameState.id
                }
            });

            const activeGames = await GameService.getActiveGames();

            expect(activeGames[0].id).toBe(gameState.id);
            expect(activeGames[0].toJSON().hasPassword).toBe(1);
        });
    });

    describe('getCardsInHand', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
            playerA = result.playerA;
        });

        afterEach(async () => await Game.truncate());

        it("should return all cards in a player's hand", async () => {
            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameState.id);

            const cardsToAssign = gameState.cards.filter(card =>
                card.tribe.name === TribeName.DWARVES &&
                card.index !== null
            ).slice(0, 3)
            .sort((cardA, cardB) => cardA.index - cardB.index);

            const cardIdsToAssign = cardsToAssign.map(card => card.id);

            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const cardsInHand = await GameService.getCardsInHand(playerA.userId, gameState.id);

            expect(cardsInHand.length).toBe(3);

            for (let i = 0; i < cardsInHand.length; i++) {
                const card = cardsInHand[i];
                card.id = cardsToAssign[i].id;
                card.color = cardsToAssign[i].color;
                card.index = cardsToAssign[i].index;
                card.state = CardState.IN_HAND;
                card.state = CardState.IN_HAND;
                card.tribeId = cardsToAssign[i].tribeId;
            }
        });
    });

    describe('getStateResponse', () => {

        beforeEach(async () => {
            await createGame();
        });

        afterEach(async () => await Game.truncate());

        it('should throw an error if the game is not found', async () => {
            try {
                await GameService.getStateResponse(10);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });
    });

    describe('leave', () => {

        afterEach(async () => await Game.truncate());

        it('should delete the game if the creator has left before the game started and the room is empty', async () => {
            const newGame = await GameService.create(userA.id);

            await GameService.leave(userA.id, newGame.id);

            const existingGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(existingGame).toBe(null);
        });

        it('should cancel the game if the creator has left before the game started and there is another player in the room', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userB.id, newGame.id);

            await GameService.leave(userA.id, newGame.id);

            const existingGame = await Game.findOne({
                where: {
                    id: newGame.id,
                }
            });

            expect(existingGame.state).toBe(GameState.CANCELLED);
        });

        it('should prevent leaving the game if it has already ended', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userB.id, newGame.id);

            await Game.update({
                state: GameState.ENDED,
            }, {
                where: {
                    id: newGame.id
                }
            });

            try {
                await GameService.leave(userA.id, newGame.id);

            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);

            }
        });

        // TODO: change logic as there are multiple players in the game
        // TODO: maybe replace the player whose left with a bot

        it('should emit an \'update active games\' websocket event', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userB.id, newGame.id);

            await GameService.leave(userA.id, newGame.id);

            const activeGames = await GameService.getActiveGames();

            const emitEventSpy = jest.spyOn(EventService, 'emitEvent');

            expect(emitEventSpy).toHaveBeenCalledWith({
                type: EVENT_ACTIVE_GAMES_UPDATE,
                payload: activeGames
            });
        });

        it('should throw an error if the game is not found', async () => {
            try {
                await GameService.leave(userA.id, 1);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it('should throw an error if the user is not in the game', async () => {
            const newGame = await GameService.create(userA.id);

            try {
                await GameService.leave(userB.id, newGame.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('You are not in this game');
            }
        });
    });

    describe('join', () => {

        afterEach(async () => await Game.truncate());

        it('should assign the user as a player in the game', async () => {
            const newGame = await GameService.create(userA.id);
            await GameService.join(userB.id, newGame.id);

            const player = await Player.findOne({
                where: {
                    gameId: newGame.id,
                    userId: userB.id,
                }
            });

            expect(player).toBeDefined();
        });

        it('should throw an error if the user is already in another active game', async () => {
            await GameService.create(userA.id);
            const newGame2 = await GameService.create(userB.id);

            try {
                await GameService.join(userA.id, newGame2.id);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toContain('Please leave');
            }
        });

        it('should throw an error if the game is already full', async () => {
            const newGame = await GameService.create(userA.id);
            await PlayerService.create(userB.id, newGame.id);
            await PlayerService.create(userC.id, newGame.id);

            await Game.update({
                maxPlayers: 3
            }, {
                where: {
                    id: newGame.id
                }
            });

            try {
                await GameService.join(userD.id, newGame.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('This game is already full');
            }
        });

        it('should throw an error if the game is not found', async () => {
            try {
                await GameService.join(userA.id, 1);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it('should throw an error if the game has a password and an incorrect password is provided', async () => {
            const newGame = await GameService.create(userA.id, true, 'some-password');
            await PlayerService.create(userB.id, newGame.id);
            await PlayerService.create(userC.id, newGame.id);

            try {
                await GameService.join(userD.id, newGame.id, 'incorrect-password');
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_FORBIDDEN);
                expect(error.message).toBe('Incorrect room password');
            }
        });

        it('should throw an error if the game has a password and no password is provided', async () => {
            const newGame = await GameService.create(userA.id, true, 'some-password');
            await PlayerService.create(userB.id, newGame.id);
            await PlayerService.create(userC.id, newGame.id);

            try {
                await GameService.join(userD.id, newGame.id, null);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_FORBIDDEN);
                expect(error.message).toBe('Incorrect room password');
            }
        });
    });

    describe('orderCards', () => {
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
            gameState = result.gameState;
            gameState.players.map(async player => await returnPlayerCardsToDeck(player.id));
        });

        afterEach(async () => await Game.truncate());

        it("should rearrange the cards in a player's hand", async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 5);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const rearrangedCardIds = [
                cardIdsToAssign[3],
                cardIdsToAssign[2],
                cardIdsToAssign[4],
                cardIdsToAssign[0],
                cardIdsToAssign[1],
            ]

            await GameService.orderCards(playerA.userId, gameState.id, rearrangedCardIds);

            const updatedPlayer = await PlayerService.getPlayerWithCards(playerA.id);

            const cardInHand = updatedPlayer
                .cards
                .filter(card => card.state === CardState.IN_HAND)
                .sort((cardA, cardB) => cardA.index - cardB.index);


            expect(cardInHand[0].id).toBe(cardIdsToAssign[3]);
            expect(cardInHand[1].id).toBe(cardIdsToAssign[2]);
            expect(cardInHand[2].id).toBe(cardIdsToAssign[4]);
            expect(cardInHand[3].id).toBe(cardIdsToAssign[0]);
            expect(cardInHand[4].id).toBe(cardIdsToAssign[1]);
            expect(cardInHand[0].index).toBe(0);
            expect(cardInHand[1].index).toBe(1);
            expect(cardInHand[2].index).toBe(2);
            expect(cardInHand[3].index).toBe(3);
            expect(cardInHand[4].index).toBe(4);
        });

        it("should throw an error if a card ID that is not in the player's hand is provided", async () => {
            const cardIdsToAssign = getCardsFromDeck(gameState.cards, 5);
            await assignCardsToPlayer(playerA.id, cardIdsToAssign);

            const rearrangedCardIds = [
                cardIdsToAssign[3],
                cardIdsToAssign[2],
                cardIdsToAssign[4],
                cardIdsToAssign[0],
                0
            ]


            try {
                await GameService.orderCards(playerA.userId, gameState.id, rearrangedCardIds);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Card not found');
            }
        });
    });

    describe('removeBotPlayer', () => {
        let gameState: IGameState;
        let playerA: Player;
        let playerB: Player;

        beforeEach(async () => {
            const result = await createGame();
            gameState = result.gameState;
            playerA = result.playerA;
            playerB = result.playerB;
        });

        afterEach(async () => await Game.truncate());

        it('should remove a bot from a game', async () => {
            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            await GameService.addBotPlayer(userA.id, gameState.id);

            gameState = await GameService.getState(gameState.id);

            let botPlayer = gameState.players.find(player => player.user.isBot);

            await GameService.removeBotPlayer(playerA.userId, gameState.id, botPlayer.id);

            gameState = await GameService.getState(gameState.id);

            botPlayer = gameState.players.find(player => player.user.isBot);

            expect(botPlayer).toBe(undefined);
        });

        it('should throw an error if the game is not found', async () => {
            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            await GameService.addBotPlayer(userA.id, gameState.id);

            gameState = await GameService.getState(gameState.id);

            let botPlayer = gameState.players.find(player => player.user.isBot);

            try {
                await GameService.removeBotPlayer(playerA.userId, 10, botPlayer.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it('should throw an error if a player other than the game creator tries to remove a bot', async () => {
            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            await GameService.addBotPlayer(userA.id, gameState.id);

            gameState = await GameService.getState(gameState.id);

            let botPlayer = gameState.players.find(player => player.user.isBot);

            try {
                await GameService.removeBotPlayer(playerB.userId, gameState.id, botPlayer.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Only the game creator can remove a bot player');
            }
        });

        it('should throw an error if a player tries to remove a bot after the game had already started', async () => {
            await Game.update({
                state: GameState.CREATED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            await GameService.addBotPlayer(userA.id, gameState.id);

            await Game.update({
                state: GameState.STARTED,
            }, {
                where: {
                    id: gameState.id
                }
            });

            gameState = await GameService.getState(gameState.id);

            let botPlayer = gameState.players.find(player => player.user.isBot);

            try {
                await GameService.removeBotPlayer(playerA.userId, gameState.id, botPlayer.id);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('You cannot remove a bot after the game has already started');
            }
        });
    });

    describe('start', () => {
        let game: Game;
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;
        let settings: IGameSettings;

        beforeEach(async () => {
            game = await GameService.create(userA.id, false);
            playerA = await PlayerService.create(userA.id, game.id);
            playerB = await PlayerService.create(userB.id, game.id);
            playerC = await PlayerService.create(userC.id, game.id);
            playerD = await PlayerService.create(userD.id, game.id);

            settings = {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                ]
            };
        });

        afterEach(async () => {
            await Game.truncate();

            await User.update({
                isBot: false
            }, {
                where: {
                    id: playerA.id
                }
            });
        });

        it("should set the game state to 'started'", async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            expect(updatedGame.state).toBe(GameState.STARTED);
        });

        it('should deal 1 card to each player', async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            const playerCards = updatedGame.cards.filter(card => card.state === CardState.IN_HAND);

            expect(playerCards.length).toBe(4);

            expect(playerCards.filter(card => card.playerId === playerA.id).length).toBe(1);
            expect(playerCards.filter(card => card.playerId === playerB.id).length).toBe(1);
            expect(playerCards.filter(card => card.playerId === playerC.id).length).toBe(1);
            expect(playerCards.filter(card => card.playerId === playerD.id).length).toBe(1);
        });

        it('should deal twice as many cards to the market as there are players', async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            const marketCards = updatedGame.cards.filter(card => card.state == CardState.IN_MARKET);

            expect(marketCards.length).toBe(8);
        });

        it('should create a draw pile from the remaining cards plus three dragon cards', async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            const deckCards = updatedGame.cards.filter(card => card.state == CardState.IN_DECK);

            const marketCards = updatedGame.cards.filter(card => card.state == CardState.IN_MARKET);

            const totalCardsInclDragons = 75;

            expect(deckCards.length).toBe(totalCardsInclDragons - updatedGame.players.length - marketCards.length);
            expect(deckCards.filter(card => card.tribe.name === TribeName.DRAGON).length).toBe(3);
        });

        it('should create 6 regions with 3 ascending values each', async () => {
            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            expect(updatedGame.regions.length).toBe(6);

            for (const region of updatedGame.regions) {
                expect(region.values.length).toBe(3);
                expect(region.values[0]).toBeLessThanOrEqual(region.values[1]);
                expect(region.values[1]).toBeLessThanOrEqual(region.values[2]);
            }
        });

        it('should throw an error if the game is not found', async () => {
            try {
                await GameService.start(userA.id, 1, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it("should throw an error if the user starting the game isn't the room creator", async () => {
            try {
                await GameService.start(userB.id, game.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_FORBIDDEN);
                expect(error.message).toBe('Only the game creator can start the game');
            }
        });

        it("should throw an error if the game has already started", async () => {
            await Game.update({
                state: GameState.STARTED,
            }, {
                where: {
                    id: game.id,
                }
            });

            try {
                await GameService.start(userA.id, game.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('The game has already started');
            }
        });

        it("should throw an error if the game has fewer than 2 players", async () => {
            await Player.destroy({
                where: {
                    userId: {
                        [Op.not]: userA.id
                    }
                }
            });

            try {
                await GameService.start(userA.id, game.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('The game must have at least two players');
            }
        });

        it.each([
            null,
            {},
            { tribes: 'not an array' },
            { tribes: [], invalidOption: {} },
            {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                    'invalid tribe'
                ]
            },
            {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                ]
            },
        ])('should throw an error when the game settings are invalid: %s', async (settings) => {

            try {
                await GameService.start(userA.id, game.id, settings as IGameSettings);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Invalid game settings');
            }
        });

        it("automatically assigns a color to players who don't have one assigned yet", async () => {
            const players = await Player.findAll({
                where: {
                    gameId: game.id
                }
            });

            for (const player of players) {
                expect(player.color).toBe(null);
            }

            await GameService.start(userA.id, game.id, settings);

            const updatedGame = await GameService.getState(game.id);

            for (const player of updatedGame.players) {
                expect(PLAYER_COLORS.includes(player.color)).toBe(true);
            }
        });

        it("should automatically take a bot's turn if the first player is a bot", async () => {
            jest.useFakeTimers();

            await User.update({
                isBot: true,
            }, {
                where: {
                    id: playerA.userId
                }
            });

            jest.spyOn(GameService, 'setTurnOrder').mockReturnValueOnce(
                [playerA.id, playerB.id, playerC.id, playerD.id]
            );
            jest.spyOn(BotService, 'takeTurn').mockResolvedValueOnce();

            await GameService.start(playerA.userId, game.id, settings);

            jest.runAllTimers();

            expect(BotService.takeTurn).toHaveBeenCalledWith(game.id, playerA.id);
        });
    });

    describe('startNewAge', () => {
        let gameId: number;
        let gameState: IGameState;
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
            playerB = result.playerB;
            playerC = result.playerC;
            playerD = result.playerD;
            gameId = result.gameId;
            gameState = result.gameState;
            gameState.players.map(async player => await returnPlayerCardsToDeck(player.id));

            await Card.update({
                state: CardState.IN_DECK
            }, {
                where: {
                    gameId,
                    state: CardState.IN_MARKET
                }
            });
        });

        afterEach(async () => await Game.truncate());

        it("should deal a card to each player and cards to the market based on the number of players", async () => {
            await GameService.startNewAge(gameState);

            const updatedGame = await GameService.getState(gameId);

            for (const player of updatedGame.players) {
                expect(player.cards.length).toBe(1);
                expect(player.cards[0].state).toBe(CardState.IN_HAND);
            }

            expect(updatedGame.cards.filter(card => card.state === CardState.IN_MARKET).length).toBe(8);
        });

        it("should reset the players' 'giant token value' and 'troll tokens''", async () => {
            await Player.update({
                giantTokenValue: 5,
                trollTokens: [1]
            }, {
                where: {
                    id: playerA.id,
                }
            });
            await Player.update({
                giantTokenValue: 2,
                trollTokens: [4]
            }, {
                where: {
                    id: playerB.id,
                }
            });
            await Player.update({
                giantTokenValue: 3,
                trollTokens: [5]
            }, {
                where: {
                    id: playerC.id,
                }
            });
            await Player.update({
                giantTokenValue: 1,
                trollTokens: [2, 3]
            }, {
                where: {
                    id: playerD.id,
                }
            });

            await GameService.startNewAge(gameState);

            const updatedGame = await GameService.getState(gameId);

            for (const player of updatedGame.players) {
                expect(player.giantTokenValue).toBe(0);
                expect(player.trollTokens).toEqual([]);
            }
        });

        it("should automatically take a bot's turn if the next player is a bot", async () => {
            jest.useFakeTimers();

            gameState.players = gameState.players.map(player => {

                if (player.id === playerD.id) {
                    player.user.isBot = true;
                }

                return player;
            });

            jest.spyOn(BotService, 'takeTurn').mockResolvedValueOnce();
            jest.spyOn(GameService, 'getNewAgeFirstPlayerId').mockReturnValueOnce(playerD.id);

            await GameService.startNewAge(gameState);

            jest.runAllTimers();

            expect(BotService.takeTurn).toHaveBeenCalledWith(gameState.id, playerD.id);
        });
    });

    describe('getNextPlayerId', () => {
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
            playerB = result.playerB;
            playerC = result.playerC;
            playerD = result.playerD;
        });

        afterEach(async () => await Game.truncate());

        it("should return the ID of the next player in turn order", () => {
            const activePlayerId = playerA.id;
            const turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];

            const nextPlayerId = GameService.getNextPlayerId(activePlayerId, turnOrder);
            expect(nextPlayerId).toBe(playerB.id);
        });

        it("should return the ID of the first player if the current active player is the last player", () => {
            const activePlayerId = playerD.id;
            const turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];

            const nextPlayerId = GameService.getNextPlayerId(activePlayerId, turnOrder);
            expect(nextPlayerId).toBe(playerA.id);
        });
    });

    describe('getNewAgeFirstPlayerId', () => {
        let playerA: Player;
        let playerB: Player;
        let playerC: Player;
        let playerD: Player;
        let prevPlayerId: number;
        let turnOrder: number[];

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.DWARVES,
                    TribeName.MINOTAURS,
                    TribeName.MERFOLK,
                    TribeName.CENTAURS,
                    TribeName.ELVES,
                    TribeName.TROLLS,
                ]
            });
            playerA = result.playerA;
            playerB = result.playerB;
            playerC = result.playerC;
            playerD = result.playerD;
            prevPlayerId = playerA.id;
            turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];
        });

        afterEach(async () => await Game.truncate());

        it('should return the ID of the player with the fewest points', () => {
            const scoringResults: IScoringResults = {
                winnerId: null,
                totalPoints: {
                    [playerA.id]: 18,
                    [playerB.id]: 12,
                    [playerC.id]: 10,
                    [playerD.id]: 14,
                },
                trollTokenTotals: {},
            };

            const playerId = GameService.getNewAgeFirstPlayerId(scoringResults, prevPlayerId, turnOrder);

            expect(playerId).toBe(playerC.id);
        });

        it('should break ties between the players with the fewest points based on the greatest troll token value', () => {
            const scoringResults: IScoringResults = {
                winnerId: null,
                totalPoints: {
                    [playerA.id]: 18,
                    [playerB.id]: 10,
                    [playerC.id]: 10,
                    [playerD.id]: 14,
                },
                trollTokenTotals: {
                    [playerA.id]: 0,
                    [playerB.id]: 3,
                    [playerC.id]: 1,
                    [playerD.id]: 6,
                },
            };

            const playerId = GameService.getNewAgeFirstPlayerId(scoringResults, prevPlayerId, turnOrder);

            expect(playerId).toBe(playerB.id);
        });

        it('should assign the player who drew the last dragon if they are among the players with fewest points and players are still tied', () => {
            const scoringResults: IScoringResults = {
                winnerId: null,
                totalPoints: {
                    [playerA.id]: 10,
                    [playerB.id]: 10,
                    [playerC.id]: 10,
                    [playerD.id]: 14,
                },
                trollTokenTotals: {
                    [playerA.id]: 0,
                    [playerB.id]: 0,
                    [playerC.id]: 0,
                    [playerD.id]: 0,
                },
            };

            turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];

            const playerId = GameService.getNewAgeFirstPlayerId(scoringResults, prevPlayerId, turnOrder);

            expect(playerId).toBe(playerA.id);
        });

        it('should assign the player closest in turn order to the player who drew the last dragon if players are still tied', () => {
            const scoringResults: IScoringResults = {
                winnerId: null,
                totalPoints: {
                    [playerA.id]: 12,
                    [playerB.id]: 10,
                    [playerC.id]: 10,
                    [playerD.id]: 14,
                },
                trollTokenTotals: {
                    [playerA.id]: 0,
                    [playerB.id]: 0,
                    [playerC.id]: 0,
                    [playerD.id]: 0,
                },
            };

            turnOrder = [playerA.id, playerB.id, playerC.id, playerD.id];

            const playerId = GameService.getNewAgeFirstPlayerId(scoringResults, prevPlayerId, turnOrder);

            expect(playerId).toBe(playerB.id);
        });
    });

    describe('validateSettings', () => {
        it.each([
            null,
            {},
            { tribes: 'not an array' },
            { tribes: [], invalidOption: {} },
            {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                    'invalid tribe'
                ]
            },
            {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                ]
            },
        ])('should return false when the game settings are invalid: %s', (settings) => {
            expect(GameService.validateSettings(settings as IGameSettings)).toEqual(false);
        });

        it('should return true when the game settings are valid: %s', () => {
            const settings = {
                tribes: [
                    TribeName.DWARVES,
                    TribeName.ELVES,
                    TribeName.WIZARDS,
                    TribeName.WINGFOLK,
                    TribeName.ORCS,
                    TribeName.MERFOLK,
                ]
            };
            expect(GameService.validateSettings(settings)).toEqual(true);
        });
    });

    describe('updateSettings', () => {
        let gameState: IGameState;

        beforeEach(async () => {
            gameState = await GameService.create(userA.id, false);
        });

        afterEach(async () => await Game.truncate());

        it('should update the game settings', async () => {
            const settings = {
                tribes: [
                    TribeName.ORCS,
                    TribeName.ELVES,
                    TribeName.SKELETONS
                ]
            }
            await GameService.updateSettings(userA.id, gameState.id, settings);

            const updatedGameState = await Game.findOne({ where: {
                id: gameState.id }
            });

            expect(updatedGameState.settings).toEqual(settings);
        });

        it('should throw an error if the game is not found', async () => {
            try {
                await Game.truncate();
                await GameService.updateSettings(userA.id, 1, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_NOT_FOUND);
                expect(error.message).toBe('Game not found');
            }
        });

        it("should throw an error if the user updating the game isn't the room creator", async () => {
            try {
                await GameService.updateSettings(userB.id, gameState.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_FORBIDDEN);
                expect(error.message).toBe('Only the game creator can update the settings');
            }
        });

        it("should throw an error if the game has already started", async () => {
            await Game.update({
                state: GameState.STARTED,
            }, {
                where: {
                    id: gameState.id,
                }
            });

            try {
                await GameService.updateSettings(userA.id, gameState.id, { tribes: []});
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('The game has already started');
            }
        });

        it.each([
            null,
            {},
            { tribes: 'not an array' },
        ])('should throw an error when the game settings are invalid: %s', async (settings) => {

            try {
                await GameService.updateSettings(userA.id, gameState.id, settings as IGameSettings);
                throw new Error(UNEXPECTED_ERROR_MSG);
            } catch (error: any) {
                expect(error.type).toBe(ERROR_BAD_REQUEST);
                expect(error.message).toBe('Invalid game settings');
            }
        });

    });
});
