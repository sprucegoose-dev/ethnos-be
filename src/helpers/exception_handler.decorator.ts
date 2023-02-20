import ExceptionHandler from './exception_handler';

export function exceptionHandler() {
    return (target: any) => {
        for (const method of Object.getOwnPropertyNames(target.prototype)) {
            if (method !== 'constructor') {
                const callback = target.prototype[method];

                target.prototype[method] = async function () {
                    try {
                        await callback.apply(this, arguments);
                    } catch (error) {

                        console.log('---------------');
                        console.log(error);
                        console.log('---------------');

                        const res = arguments[1];
                        if (res) {
                            const errorResponse = (new ExceptionHandler(error)).getErrorResponse();
                            res.status(errorResponse.code).send(errorResponse);
                        }
                    }
                };
            }
        }
    };
}
