import { Socket } from 'socket.io';

import UsersController from './controllers/user.controller';
import GamesController from './controllers/game.controller';
import TribesController from './controllers/tribe.controller';
import AuthMiddleware from './middleware/auth.middleware';
import {
    EVENT_JOIN_GAME,
    EVENT_LEAVE_GAME,
} from './interfaces/event.interface';
import '../database/connection';

const express = require('express');
const app = require('express')();
const server = require('http').createServer(app);
const socket = require('socket.io')(server, {
    cors: {
        origin: 'http://localhost:8080',
    },
    transports: [
        'websocket',
        'polling',
    ],
});

const cors = require('cors');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(AuthMiddleware.isAuthenticated);

app.post('/user/create', UsersController.create);
app.post('/user/login', UsersController.login);
app.get('/user', UsersController.getDetails);
app.patch('/user', UsersController.update);
app.delete('/user', UsersController.delete);

app.get('/game/all', GamesController.getActiveGames);
app.get('/game/:id/actions', GamesController.getActions);
app.post('/game/:id/start', GamesController.start);
app.get('/game/:id/hand', GamesController.getCardsInHand);
app.get('/game/:id/playerHands', GamesController.getPlayerHands);
app.post('/game/:id/updateSettings', GamesController.updateSettings);
app.post('/game/:id/join', GamesController.join);
app.post('/game/:id/action', GamesController.handleAction);
app.post('/game/:id/leave', GamesController.leave);
app.get('/game/:id', GamesController.getState);
app.post('/game/create', GamesController.create);

app.get('/tribe/all', TribesController.getAll);

export const gameSocket = socket;

server.listen(3000, () => {
    console.log('listening on *:3000');
});

gameSocket.on('connection', (socket: Socket) => {
    socket.on(EVENT_JOIN_GAME, (gameId: number) => {
        socket.join(`game-${gameId}`);
    });

    socket.on(EVENT_LEAVE_GAME, (gameId: number) => {
        socket.leave(`game-${gameId}`);
    });
});

