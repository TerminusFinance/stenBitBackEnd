import { validate, parse, type InitDataParsed } from '@telegram-apps/init-data-node';
import { RequestHandler, Response } from 'express';
import fs from 'fs';
import path from 'path';

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

    // Load and parse the list of valid tokens from the JSON file
    const tokensFilePath = path.join(__dirname, '../../tokens.json');
    let authTokens: string[] = [];

    try {
        const tokensFileContent = fs.readFileSync(tokensFilePath, 'utf-8');
        const tokensData = JSON.parse(tokensFileContent);
        authTokens = tokensData.tokens;
    } catch (error) {
        console.error('Error reading or parsing tokens.json:', error);
        return next(new Error('Internal Server Error'));
    }

    switch (authType) {
        case 'tma':
            try {
                // Validate init data by checking if authData is in the list of valid tokens
                if (!authTokens.includes(authData)) return next(new Error('Unauthorized'));
                return next();
            } catch (e) {
                return next(e);
            }
        // ... other authorization methods.
        default:
            return next(new Error('Unauthorized'));
    }
};
