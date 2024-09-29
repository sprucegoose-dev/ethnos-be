import ExceptionHandler from './exception-handler';
import { exceptionHandler } from './exception-handler.decorator';

@exceptionHandler()
class MockService {
    async successfulMethod() {
        return 'Success';
    }

    async failingMethod(_this: any = null, _mockResponse: any = null) {
        throw new Error('Something went wrong');
    }
}

describe('exceptionHandler', () => {
    let service: MockService;
    let mockResponse: any;

    beforeEach(() => {
        service = new MockService();
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    it('should execute a method successfully without error handling', async () => {
        const successfulMethodSpy = jest.spyOn(service, 'successfulMethod');
        await service.successfulMethod();
        expect(successfulMethodSpy).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it('should log the error to the console when an error occurs', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        try {
            await service.failingMethod();
            throw new Error('Expected error not to be thrown');
        } catch {
            expect(consoleLogSpy).toHaveBeenCalledWith('---------------');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
            expect(consoleLogSpy).toHaveBeenCalledWith('---------------');
        }
    });

    it('should handle error and return proper error response via res object', async () => {
        const mockErrorResponse = {
            code: 500,
            type: 'ER_SERVER',
            message: 'An internal server error has occurred.',
        };

        const errorHandlerSpy = jest.spyOn(ExceptionHandler.prototype, 'getErrorResponse').mockReturnValue(mockErrorResponse);

        await service.failingMethod(null, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith(mockErrorResponse);

        expect(errorHandlerSpy).toHaveBeenCalledTimes(1);
    });
});
