import Game from '@models/game.model';
import Card from '@models/card.model';
import Player from '@models/player.model';

import GameService from '@services/game/game.service';

import { TribeName } from '@interfaces/tribe.interface';
import { Color, IGameState } from '@interfaces/game.interface';

import { createGame, returnPlayerCardsToDeck } from '../test-helpers';
import ScoringService from './scoring.service';


describe('ScoringService', () => {

    describe('groupCardsByLeader', () => {
        let gameId: number;
        let gameState: IGameState;
        let playerA: Player;

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
            gameState = result.gameState;
        });

        afterEach(async () => {
            await Game.truncate();
            await Card.truncate();
        });

        it('should return cards grouped by the leader ID', async () => {
            await returnPlayerCardsToDeck(playerA.id);

            gameState = await GameService.getState(gameId);

            const bandA = gameState.cards.filter(card =>
                card.tribe.name === TribeName.CENTAUR &&
                card.color !== Color.ORANGE &&
                !card.playerId
            ).slice(0, 3);

            const bandB = gameState.cards.filter(card =>
                card.color === Color.ORANGE &&
                !card.playerId
            ).slice(0, 5);

            bandA.map(card => card.leaderId = bandA[0].id);
            bandB.map(card => card.leaderId = bandB[0].id);

            const groupedCards = await ScoringService.groupCardsByLeader([...bandA, ...bandB]);

            expect(groupedCards[bandA[0].id].length).toBe(3);
            expect(groupedCards[bandB[0].id].length).toBe(5);
        });

    });
});
