import Tribe from '@models/tribe.model';

import TribesController from './tribe.controller';
import { Op } from 'sequelize';
import { TribeName } from '../interfaces/tribe.interface';

describe('TribesController', () => {

    describe('getAll', () => {
        let response: any;

        beforeEach(() => {
            response = {
                send: jest.fn()
            };
        });

        it('should return all tribes', async () => {
            const request: any = {
                body: {
                    username: 'test-user-name',
                    email: 'test-user-email@gmail.com',
                    password: 'some-password-1!'
                }
            };

            await TribesController.getAll(request, response);

            const tribes = await Tribe.findAll({
                where: {
                    name: {
                        [Op.not]: TribeName.DRAGON
                    }
                }
            });

            expect(response.send).toHaveBeenCalledWith(tribes);
        });
    });
});
