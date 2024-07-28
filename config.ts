import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, './param.env') });


export const botToken = process.env.MY_SECRET_TOKEN || "";

if (!botToken) {
    console.error('MY_SECRET_TOKEN is not defined in .env file');
}
