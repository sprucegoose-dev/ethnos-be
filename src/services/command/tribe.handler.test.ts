import { Game } from '../../models/game.model';
import GameService from '../game/game.service';
import PlayerService from '../player/player.service';
import { TribeName } from '../../types/tribe.interface';
import TribeService from './tribe.handler';
import { CardState } from '../../types/card.interface';
import { IGameState } from '../../types/game.interface';
import { Card } from '../../models/card.model';
import { Player } from '../../models/player.model';
import { createGame } from './test-helpers';

describe('TribeService', () => {

    describe('handleTrollTokens', () => {
        let gameId: number;
        let gameState: IGameState;
        let playerA: Player;
        let playerB: Player;

        beforeEach(async () => {
            const result = await createGame({
                tribes: [
                    TribeName.DWARF,
                    TribeName.MINOTAUR,
                    TribeName.MERFOLK,
                    TribeName.CENTAUR,
                    TribeName.ELF,
                    TribeName.TROLL,
                ]
            });
            gameId = result.gameId;
            playerA = result.playerA;
            playerB = result.playerB;
            gameState = result.gameState;
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });


        it('should assign a troll token equal to the size of the band played, if available', async () => {
            let player = await PlayerService.getPlayerWithCards(playerA.id);

            await TribeService.handleTrollTokens(gameState, player, 5);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.trollTokens).toEqual([5]);
        });

        it("should assign the next largest troll token if the one matching the band size isn't available", async () => {
            await Player.update({
                trollTokens: [5]
            }, {
                where: {
                    id: playerB.id
                }
            });

            gameState = await GameService.getState(gameId);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            await TribeService.handleTrollTokens(gameState, player, 5);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            expect(player.trollTokens).toEqual([4]);
        });
    });

    describe('handleWizardDraw', () => {
        let gameId: number;
        let gameState: IGameState;
        let playerA: Player;

        beforeEach(async () => {
            const result = await createGame();
            playerA = result.playerA;
            gameId = result.gameId;
            gameState = result.gameState;
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it('should draw cards equal to the size of the band played', async () => {
            await Card.update({
                playerId: null,
                state: CardState.IN_DECK
            }, {
                where: {
                    playerId: playerA.id
                }
            });

            gameState = await GameService.getState(gameId);

            let player = await PlayerService.getPlayerWithCards(playerA.id);

            await TribeService.handleWizardDraw(gameState, player, 3);

            player = await PlayerService.getPlayerWithCards(playerA.id);

            const cardsInHand = player.cards.filter(card => card.state === CardState.IN_HAND);

            expect(cardsInHand.length).toBe(3);
        });
    });
});