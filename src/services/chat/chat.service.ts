import { IChatMessagePayload } from '@interfaces/chat.interface';
import { EVENT_CHAT_UPDATE } from '@interfaces/event.interface';

import {
    CustomException,
    ERROR_BAD_REQUEST,
} from '@helpers/exception-handler';

import EventService from '@services/event/event.service';

import Game from '@models/game.model';
import Player from '@models/player.model';
import User from '@models/user.model';
import ChatMessage from '@models/chat-message.model';

export default class ChatService {

    static async queryGetMessages(gameId: number) {
        const messages = await ChatMessage.findAll({
            where: {
                gameId,
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'username',
                    ],
                },
            ],
        });

       return messages.map(message => {
            return {
                createdAt: message.createdAt,
                id: message.id,
                message: message.filteredMessage ? message.filteredMessage: message.message,
                username: message.user.username,
            }
       });
    }

    static async getMessages(userId: number, gameId: number): Promise<IChatMessagePayload[]> {
        const game = await Game.findOne({
            where: {
                id: gameId,
            },
            include: [
                {
                    model: Player,
                    as: 'players',
                    include : [{
                        model: User,
                        as: 'user',
                        attributes: [
                            'id',
                        ]
                    }],
                    required: true,
                },
            ],
        });

        if (!game) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Game not found');
        }

        const player = game.players.filter(player => player.user.id === userId)[0];

        if (!player) {
            return [];
        }

        return this.queryGetMessages(gameId);
    }

    static async sendMessage(userId: number, gameId: number, message: string): Promise<any> {
        const game = await Game.findOne({
            where: {
                id: gameId,
            },
            include: [
                {
                    model: Player,
                    as: 'players',
                    include : [{
                        model: User,
                        as: 'user',
                        attributes: [
                            'id',
                        ]
                    }],
                    required: true,
                },
            ],
        });

        if (!game) {
            throw new CustomException(ERROR_BAD_REQUEST, 'Game not found');
        }

        const player = game.players.filter(player => player.user.id === userId)[0];

        if (!player) {
            throw new CustomException(ERROR_BAD_REQUEST, 'User not in game');
        }

        let filteredMessage = message;

        await ChatMessage.create({
            gameId,
            userId,
            message,
            filteredMessage: message !== filteredMessage ? filteredMessage : null,
        });

        const messages = await this.queryGetMessages(gameId);

        EventService.emitEvent({
            gameId: gameId,
            type: EVENT_CHAT_UPDATE,
            payload: messages,
        });

        return;
    }
};
