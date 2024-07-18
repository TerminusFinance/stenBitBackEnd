import { validate, parse, type InitDataParsed } from '@telegram-apps/init-data-node';
import { RequestHandler, Response } from 'express';

/**
 * Sets init data in the specified Response object.
 * @param res - Response object.
 * @param initData - init data.
 */
function setInitData(res: Response, initData: InitDataParsed): void {
    res.locals.initData = initData;
}

/**
 * Extracts init data from the Response object.
 * @param res - Response object.
 * @returns Init data stored in the Response object. Can return undefined in case,
 * the client is not authorized.
 */

/**
 * Middleware which authorizes the external client.
 * @param req - Request object.
 * @param res - Response object.
 * @param next - function to call the next middleware.
 */
export const authFromCode: RequestHandler = (req, res, next) => {
    // We expect passing init data in the Authorization header in the following format:
    // <auth-type> <auth-data>
    // <auth-type> must be "tma", and <auth-data> is Telegram Mini Apps init data.
    const [authType, authData = ''] = (req.header('authorization') || '').split(' ');

    switch (authType) {
        case 'tma':
            try {
                // Validate init data.
                if (authData !== "KEY_HGJFKDIFJDFJDBNVJ") return next(new Error('Unauthorized'));
                return next();
            } catch (e) {
                return next(e);
            }
        // ... other authorization methods.
        default:
            return next(new Error('Unauthorized'));
    }
};
