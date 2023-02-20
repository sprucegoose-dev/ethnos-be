import { CardType } from '../models/card_type.model';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { ActionType } from '../types/action.interface';
import { Color, Suit } from '../types/card_type.interface';
import { IUserResponse } from '../types/user.interface';
import { ActionService } from './action.service';
import CardService from './card.service';
import GameService from './game.service';
import PlayerService from './player.service';
import UserService from './user.service';

describe('ActionService', () => {
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
    let game: Game;
    let playerA: Player;

    beforeAll(async () => {
        userA = await UserService.create(userDataA);
        userB = await UserService.create(userDataB);
        game = await GameService.create(userA.id);
        playerA = await PlayerService.create(userA.id, game.id);
        await PlayerService.create(userB.id, game.id);
        await GameService.start(userA.id, game.id);
    });

    describe('getDeployActions', () => {

        it('should a Deploy action for each card on the continuum that matches the Codex color', async () => {
            const continuumCards = await CardService.getCardsWithType(game.id, { continuum: true });
            const codexColor = Color.BLUE;
            const deployActions = ActionService.getDeployActions(codexColor, continuumCards);
            const validDeployTargets = continuumCards.filter(c => c.type.color === codexColor);

            for (let i = 0; i < validDeployTargets.length; i++) {
                expect(deployActions[i]).toEqual({
                    targetIndex: validDeployTargets[i].index,
                    type: ActionType.DEPLOY,
                });
            }
        });

    });

    describe('getReplaceActions', () => {

        it('should return a Replace action of cards in the future when the player has no room in the past', async () => {
            const continuumCards = await CardService.getCardsWithType(game.id, { continuum: true });

            playerA.position = 1;

            const replaceActions = await ActionService.getReplaceActions(playerA, continuumCards);

            expect(replaceActions.length).toBe(1);
            expect(replaceActions[0].targetIndex).toBe(2);
            expect(replaceActions[0].type).toBe(ActionType.REPLACE);
        });

        it('should return a Replace action of cards in the past when the player has no room in the future', async () => {
            const continuumCards = await CardService.getCardsWithType(game.id, { continuum: true });

            playerA.position = 7;

            const replaceActions = await ActionService.getReplaceActions(playerA, continuumCards);

            expect(replaceActions.length).toBe(1);
            expect(replaceActions[0].targetIndex).toBe(6);
            expect(replaceActions[0].type).toBe(ActionType.REPLACE);
        });

        it('should return Replace actions of cards in the past or future when the player has enough roome', async () => {
            const continuumCards = await CardService.getCardsWithType(game.id, { continuum: true });

            playerA.position = 4;

            const replaceActions = await ActionService.getReplaceActions(playerA, continuumCards);

            expect(replaceActions.length).toBe(2);
            expect(replaceActions[0].targetIndex).toBe(3);
            expect(replaceActions[0].type).toBe(ActionType.REPLACE);
            expect(replaceActions[1].targetIndex).toBe(5);
            expect(replaceActions[1].type).toBe(ActionType.REPLACE);
        });

    });

    describe('getMoveActions', () => {

        it('should return a Move action into the future based on the card number', async () => {
            const continuumCards = await CardService.getCardsWithType(game.id, { continuum: true });
            const cardTypes =  await CardType.findAll();
            let mockCard =  await CardService.create({
                playerId: playerA.id,
                cardTypeId: cardTypes[0].id,
            });

            // @ts-ignore
            mockCard.type = {
                ...mockCard.type,
                value: 3,
                suit: Suit.KEY,
                color: Color.RED,
            };

            const cardsInHand = [
                mockCard,
            ];

            playerA.position = 5;

            const moveActions = ActionService.getMoveActions(playerA, cardsInHand, continuumCards);

            const futureMoveAction = moveActions.find(a => a.targetIndex === 8);

            expect(futureMoveAction.sourceCardId).toBe(mockCard.id);
            expect(futureMoveAction.type).toBe(ActionType.MOVE);
        });

        it('should return a Move action into the past based on the card suit or color', async () => {
            const continuumCards = await CardService.getCardsWithType(game.id, { continuum: true });
            const cardTypes =  await CardType.findAll();
            let mockCard =  await CardService.create({
                playerId: playerA.id,
                cardTypeId: cardTypes[0].id,
            });

            // @ts-ignore
            mockCard.type = {
                ...mockCard.type,
                value: 3,
                suit: Suit.KEY,
                color: Color.RED,
            };

            const cardsInHand = [
                mockCard,
            ];

            playerA.position = 8;

            const pastMoveActions = ActionService.getMoveActions(playerA, cardsInHand, continuumCards);

            const validCardsInPast = continuumCards.filter(c =>
                c.index !== playerA.position &&
                (
                    c.type.color === mockCard.type.color ||
                    c.type.suit === mockCard.type.suit
                )
            );

            for (let i = 0; i < validCardsInPast.length; i++) {
                expect(pastMoveActions[i]).toEqual({
                    sourceCardId: mockCard.id,
                    targetIndex: validCardsInPast[i].index,
                    type: ActionType.MOVE,
                });
            }
        });

    });

});
