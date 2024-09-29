import {
    CustomException,
    ERROR_BAD_FIELD,
    ERROR_BAD_REQUEST,
    ERROR_CODE_BAD_REQUEST,
    ERROR_CODE_CONFLICT,
    ERROR_CODE_CONN_REFUSED,
    ERROR_CODE_FORBIDDEN,
    ERROR_CODE_NOT_FOUND,
    ERROR_CODE_SERVER,
    ERROR_CODE_UNAUTHORIZED,
    ERROR_CONN_REFUSED,
    ERROR_CUSTOM_DUP_ENTRY,
    ERROR_DUP_ENTRY,
    ERROR_FORBIDDEN,
    ERROR_INVALID_COMMAND,
    ERROR_MULTIPLE_GAMES,
    ERROR_NON_UNIQ_ERROR,
    ERROR_NOT_FOUND,
    ERROR_NO_DEFAULT_FOR_FIELD,
    ERROR_SERVER,
    ERROR_UNAUTHORIZED,
    IException,
} from './exception-handler';

import ExceptionHandler from './exception-handler';

describe('ExceptionHandler', () => {

    describe('getErrorResponse', () => {
        const testErrorResponse = (errorInstance: any, expected: IException) => {
            const handler = new ExceptionHandler(errorInstance);
            const errorResponse = handler.getErrorResponse();
            expect(errorResponse).toEqual(expected);
        };

        it('should return a conflict error for duplicate entry', () => {
            const errorInstance = {
                type: ERROR_DUP_ENTRY,
                fields: { username: 'test' },
                message: 'Duplicate entry',
            };

            const expected: IException = {
                code: ERROR_CODE_CONFLICT,
                type: ERROR_DUP_ENTRY,
                message: 'The field(s) username is already in use.',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return a conflict error for custom duplicate entry', () => {
            const errorInstance = {
                parent: { code: ERROR_CUSTOM_DUP_ENTRY, sqlMessage: 'Custom duplicate entry' }
            };

            const expected: IException = {
                code: ERROR_CODE_CONFLICT,
                type: ERROR_DUP_ENTRY,
                message: 'Custom duplicate entry',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return a bad field error', () => {
            const errorInstance = {
                type: ERROR_BAD_FIELD,
                message: 'Invalid field',
            };

            const expected: IException = {
                code: ERROR_CODE_SERVER,
                type: ERROR_BAD_FIELD,
                message: 'Invalid field',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return a not found error', () => {
            const errorInstance = {
                type: ERROR_NOT_FOUND,
                message: 'Not found',
            };

            const expected: IException = {
                code: ERROR_CODE_NOT_FOUND,
                type: ERROR_NOT_FOUND,
                message: 'Not found',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return a bad request error', () => {
            const errorInstance = {
                type: ERROR_BAD_REQUEST,
                message: 'Bad request',
            };

            const expected: IException = {
                code: ERROR_CODE_BAD_REQUEST,
                type: ERROR_BAD_REQUEST,
                message: 'Bad request',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return a forbidden error', () => {
            const errorInstance = {
                type: ERROR_FORBIDDEN,
                message: 'Access denied',
            };

            const expected: IException = {
                code: ERROR_CODE_FORBIDDEN,
                type: ERROR_FORBIDDEN,
                message: 'Access denied',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return a connection refused error', () => {
            const errorInstance = {
                parent: { code: ERROR_CONN_REFUSED },
            };

            const expected: IException = {
                code: ERROR_CODE_CONN_REFUSED,
                type: ERROR_CONN_REFUSED,
                message: 'A database connection error has occurred.',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return unauthorized error', () => {
            const errorInstance = {
                type: ERROR_UNAUTHORIZED,
                message: 'Unauthorized access',
            };

            const expected: IException = {
                code: ERROR_CODE_UNAUTHORIZED,
                type: ERROR_UNAUTHORIZED,
                message: 'Unauthorized access',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return no default for field error', () => {
            const errorInstance = {
                type: ERROR_NO_DEFAULT_FOR_FIELD,
                message: 'No default for field',
            };

            const expected: IException = {
                code: ERROR_CODE_BAD_REQUEST,
                type: ERROR_NO_DEFAULT_FOR_FIELD,
                message: 'No default for field',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return non unique error', () => {
            const errorInstance = {
                type: ERROR_NON_UNIQ_ERROR,
                message: 'Non unique value',
            };

            const expected: IException = {
                code: ERROR_CODE_SERVER,
                type: ERROR_NON_UNIQ_ERROR,
                message: 'Non unique value',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return invalid command error', () => {
            const errorInstance = {
                type: ERROR_INVALID_COMMAND,
                message: 'Invalid command',
            };

            const expected: IException = {
                code: ERROR_CODE_BAD_REQUEST,
                type: ERROR_INVALID_COMMAND,
                message: 'Invalid command',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return multiple games error', () => {
            const errorInstance = {
                type: ERROR_MULTIPLE_GAMES,
                message: 'Multiple games found',
            };

            const expected: IException = {
                code: ERROR_CODE_CONFLICT,
                type: ERROR_DUP_ENTRY,
                message: 'Multiple games found',
            };

            testErrorResponse(errorInstance, expected);
        });

        it('should return server error for unhandled types', () => {
            const errorInstance = {
                type: 'UNKNOWN_ERROR',
                message: 'Unknown error occurred',
            };

            const expected: IException = {
                code: ERROR_CODE_SERVER,
                type: ERROR_SERVER,
                message: 'An internal server error has occured.',
            };

            testErrorResponse(errorInstance, expected);
        });
    });

    describe('CustomException', () => {
        it('should initialize with provided type and message, and null code', () => {
            const type = 'CUSTOM_ERROR';
            const message = 'This is a custom error message';

            const customException = new CustomException(type, message);

            //@ts-ignore
            expect(customException.type).toBe(type);
            //@ts-ignore
            expect(customException.message).toBe(message);
            //@ts-ignore
            expect(customException.code).toBeNull();
        });

        it('should allow access to type, message, and code', () => {
            const type = 'ERROR_CUSTOM';
            const message = 'Custom exception message';

            const customException = new CustomException(type, message);

            //@ts-ignore
            expect(customException.type).toEqual(type);
            //@ts-ignore
            expect(customException.message).toEqual(message);
            //@ts-ignore
            expect(customException.code).toBeNull();
        });
    });
});
