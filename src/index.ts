import { Server, Socket } from 'socket.io';
import { setupWorker } from '@socket.io/sticky';
import { createAdapter } from '@socket.io/cluster-adapter';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import UsersController from './controllers/user.controller';
import GamesController from './controllers/game.controller';
import ChatsController from './controllers/chat.controller';
import TribesController from './controllers/tribe.controller';
import UndoController from './controllers/undo.controller';
import AuthMiddleware from './middleware/auth.middleware';
import {
    EVENT_JOIN_GAME,
    EVENT_LEAVE_GAME,
} from './interfaces/event.interface';
import '../database/connection';
import BotService from './services/bot/bot.service';

const express = require('express');
const app = require('express')();
const cors = require('cors');
const http = require('http');

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(AuthMiddleware.isAuthenticated);

app.post('/user/create', UsersController.create);
app.post('/user/login', UsersController.login);
app.get('/user/:username/matches', UsersController.getMatches);
app.get('/user', UsersController.getDetails);
app.patch('/user', UsersController.update);
app.delete('/user', UsersController.delete);

app.get('/chat/:gameId/messages', ChatsController.getMessages);
app.post('/chat/:gameId/message', ChatsController.sendMessage);

app.post('/game/:id/addBot', GamesController.addBotPlayer);
app.delete('/game/:id/removeBot/:botPlayerId', GamesController.removeBotPlayer);
app.post('/game/:id/assignColor', GamesController.assignPlayerColor);
app.get('/game/all', GamesController.getActiveGames);
app.get('/game/:id/actions', GamesController.getActions);
app.post('/game/:id/start', GamesController.start);
app.get('/game/:id/cards', GamesController.getGameCards);
app.get('/game/:id/hand', GamesController.getCardsInHand);
app.get('/game/:id/playerHands', GamesController.getPlayerHands);
app.post('/game/:id/updateSettings', GamesController.updateSettings);
app.post('/game/:id/join', GamesController.join);
app.post('/game/:id/action', GamesController.handleAction);
app.get('/game/:id/actionsLog', GamesController.getActionsLog);
app.get('/game/:id/age/:age', GamesController.getAgeResults);
app.post('/game/:id/leave', GamesController.leave);
app.post('/game/:id/orderCards', GamesController.orderCards);
app.get('/game/:id', GamesController.getState);
app.post('/game/create', GamesController.create);

app.get('/tribe/all', TribesController.getAll);

app.get('/undo/:gameId', UndoController.getUndoState);
app.post('/undo/:gameId/request', UndoController.requestUndo);
app.post('/undo/:gameId/decision', UndoController.recordDecision);
app.get('/undo/:undoRequestId/request', UndoController.getUndoRequest);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET','HEAD','PUT','PATCH','POST','DELETE']
    },
    transports: ['websocket'],
});

export const gameSocket = io;

let instance = '0';

if (process.env.NODE_ENV === 'production') {
    // use the cluster adapter
    io.adapter(createAdapter());

    // setup connection with the primary process
    setupWorker(io);

    // assign the process instance number when in cluster mode
    instance = process.env.NODE_APP_INSTANCE;
}

io.on('connection', (socket: Socket) => {
    socket.on(EVENT_JOIN_GAME, (gameId: number) => {
        socket.join(`game-${gameId}`);
    });

    socket.on(EVENT_LEAVE_GAME, (gameId: number) => {
        socket.leave(`game-${gameId}`);
    });
});

const port = `300${instance}`;

httpServer.listen(port, () => {
    console.log(`listening on *:${port}`);
});

if (instance === '0') {
    setInterval(BotService.activateStaleBots, 5000);
}
