export const ERROR_BAD_FIELD = 'ER_BAD_FIELD_ERROR';
export const ERROR_FORBIDDEN = 'ERROR_FORBIDDEN';
export const ERROR_BAD_REQUEST = 'ERROR_BAD_REQUEST';
export const ERROR_CONN_REFUSED = 'ECONNREFUSED';
export const ERROR_DUP_ENTRY = 'ER_DUP_ENTRY';
export const ERROR_CUSTOM_DUP_ENTRY = 'ERROR_CUSTOM_DUP_ENTRY';
export const ERROR_NOT_FOUND = 'ER_NOT_FOUND_ERROR';
export const ERROR_UNAUTHORIZED = 'ER_UNAUTHORIZED';
export const ERROR_NO_DEFAULT_FOR_FIELD = 'ER_NO_DEFAULT_FOR_FIELD';
export const ERROR_NON_UNIQ_ERROR = 'ER_NON_UNIQ_ERROR';
export const ERROR_MULTIPLE_GAMES = 'ERROR_MULTIPLE_GAMES';
export const ERROR_SERVER = 'ER_SERVER';
export const ERROR_INVALID_COMMAND = 'ERROR_INVALID_COMMAND';
export const ERROR_CODE_BAD_REQUEST = 400;
export const ERROR_CODE_UNAUTHORIZED = 401;
export const ERROR_CODE_FORBIDDEN = 403;
export const ERROR_CODE_CONFLICT = 409;
export const ERROR_CODE_CONN_REFUSED = 502;
export const ERROR_CODE_NOT_FOUND = 404;
export const ERROR_CODE_SERVER = 500;

export interface IException {
    code: number;
    type: string;
    message: string;
}

export class CustomException {
    protected code: number | null;
    protected type: string;
    protected message: string;

    constructor(type: string, message: string) {
        this.type = type;
        this.message = message;
        this.code = null;
    }
}

export default class ExceptionHandler {
    private code;
    private type;
    private fields;
    private message;

    constructor(error: any) {
        const sequelizeError = typeof error.parent !== 'undefined';

        this.code = ERROR_CODE_SERVER;
        this.fields = error.fields ? error.fields : {};

        if (sequelizeError) {
            this.type = error.parent.code;
            this.message = error.parent.sqlMessage;
        } else {
            this.type = error.type;
            this.message = error.message;
        }
    }

    getErrorResponse(): IException {
        let error: IException = {
            code: this.code,
            type: ERROR_SERVER,
            message: 'An internal server error has occured.',
        };

        const fields: string[] = [];

        for (let [key] of Object.entries(this.fields)) {
            fields.push(key);
        }

        switch (this.type) {
            case ERROR_CUSTOM_DUP_ENTRY:
                error.code = ERROR_CODE_CONFLICT;
                error.type = ERROR_DUP_ENTRY;
                error.message = this.message;
                break;
            case ERROR_DUP_ENTRY:
                error.code = ERROR_CODE_CONFLICT;
                error.type = ERROR_DUP_ENTRY;
                error.message = `The field(s) ${fields.join(', ')} is already in use.`;
                break;
            case ERROR_BAD_FIELD:
                error.type = ERROR_BAD_FIELD;
                error.message = this.message;
                break;
            case ERROR_NOT_FOUND:
                error.code = ERROR_CODE_NOT_FOUND;
                error.type = ERROR_NOT_FOUND;
                error.message = this.message;
                break;
            case ERROR_BAD_REQUEST:
                error.code = ERROR_CODE_BAD_REQUEST;
                error.type = ERROR_BAD_REQUEST;
                error.message = this.message;
                break;
            case ERROR_FORBIDDEN:
                error.code = ERROR_CODE_FORBIDDEN;
                error.type = ERROR_FORBIDDEN;
                error.message = this.message;
                break;
            case ERROR_CONN_REFUSED:
                error.code = ERROR_CODE_CONN_REFUSED;
                error.type = ERROR_CONN_REFUSED;
                error.message = 'A database connection error has occurred.';
                break;
            case ERROR_NO_DEFAULT_FOR_FIELD:
                error.code = ERROR_CODE_BAD_REQUEST;
                error.type = ERROR_NO_DEFAULT_FOR_FIELD;
                error.message = this.message;
                break;
            case ERROR_NON_UNIQ_ERROR:
                error.code = ERROR_CODE_SERVER;
                error.type = ERROR_NON_UNIQ_ERROR;
                error.message = this.message;
                break;
            case ERROR_UNAUTHORIZED:
                error.code = ERROR_CODE_UNAUTHORIZED;
                error.type = ERROR_UNAUTHORIZED;
                error.message = this.message;
                break;
            case ERROR_INVALID_COMMAND:
                error.code = ERROR_CODE_BAD_REQUEST;
                error.type = ERROR_INVALID_COMMAND;
                error.message = this.message;
                break;
            case ERROR_MULTIPLE_GAMES:
                error.code = ERROR_CODE_CONFLICT;
                error.type = ERROR_DUP_ENTRY;
                error.message = this.message;
                break;
            default:
                error.code = ERROR_CODE_SERVER;
                error.type = ERROR_SERVER;
                error.message = 'An internal server error has occured.';
        }

        return error;
    }
}
