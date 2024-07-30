import { validate, parse, type InitDataParsed } from '@telegram-apps/init-data-node';
import { RequestHandler, Response } from 'express';
import {botToken} from "../../config";

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
function getInitData(res: Response): InitDataParsed | undefined {
    return res.locals.initData;
}

// Your secret bot token.


/**
 * Middleware which authorizes the external client.
 * @param req - Request object.
 * @param res - Response object.
 * @param next - function to call the next middleware.
 */
export const authMiddleware: RequestHandler = (req, res, next) => {
    // We expect passing init data in the Authorization header in the following format:
    // <auth-type> <auth-data>
    // <auth-type> must be "tma", and <auth-data> is Telegram Mini Apps init data.
    const [authType, authData = ''] = (req.header('authorization') || '').split(' ');

    switch (authType) {
        case 'tma':
            try {
                console.error("authData -", authData)
                // Validate init data.
                validate(authData, botToken, {
                    // We consider init data sign valid for 1 hour from their creation moment.
                    expiresIn: 3600,
                });

                // Parse init data. We will surely need it in the future.
                setInitData(res, parse(authData));
                return next();
            } catch (e) {
                return next(e);
            }
        // ... other authorization methods.
        default:
            return next(new Error('Unauthorized'));
    }
};
