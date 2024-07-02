import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

export async function connectDatabase(): Promise<Database> {
    const db = await open({
        filename: './mydatabase.db',
        driver: sqlite3.Database,
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
                                             userId TEXT PRIMARY KEY,
                                             userName TEXT,
                                             coins INTEGER DEFAULT 0,
                                             codeToInvite TEXT,
                                             address TEXT,
                                             referral TEXT,
                                             createAt TEXT,
                                             dataUpdate TEXT,
                                             listUserInvited TEXT,
                                             currentEnergy INTEGER DEFAULT 0,
                                             maxEnergy INTEGER DEFAULT 0,
                                             lastTapBootUpdate TEXT DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS completedTasks (
                                                      userId TEXT,
                                                      taskId INTEGER,
                                                      PRIMARY KEY (userId, taskId),
            FOREIGN KEY (userId) REFERENCES users(userId)
            );

        CREATE TABLE IF NOT EXISTS leagueLevels (
                                                    level TEXT PRIMARY KEY,
                                                    maxEnergy INTEGER,
                                                    minCoins INTEGER,
                                                    maxCoins INTEGER
        );

        CREATE TABLE IF NOT EXISTS boosts (
                                              boostName TEXT PRIMARY KEY,
                                              price INTEGER,
                                              level INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS userBoosts (
                                                  userId TEXT,
                                                  boostName TEXT,
                                                  level INTEGER DEFAULT 1,
                                                  FOREIGN KEY (userId) REFERENCES users(userId),
            FOREIGN KEY (boostName) REFERENCES boosts(boostName),
            PRIMARY KEY (userId, boostName)
            );

        INSERT OR IGNORE INTO boosts (boostName, price, level) VALUES
            ('multitap', 2000, 1),
            ('energy limit', 1500, 1),
            ('tapBoot', 3500, 1),
            ('turbo', 5000, 1);

        INSERT OR IGNORE INTO leagueLevels (level, maxEnergy, minCoins, maxCoins) VALUES
            ('bronze', 500, 0, 5000),
            ('silver', 1500, 5001, 25000),
            ('gold', 2000, 25001, 100000),
            ('platinum', 15000, 100001, 1000000);
    `);

    return db;
}

export default connectDatabase();




// import sqlite3 from 'sqlite3';
// import { open, Database } from 'sqlite';
//
// export async function connectDatabase(): Promise<Database> {
//     const db = await open({
//         filename: './mydatabase.db',
//         driver: sqlite3.Database,
//     });
//
//     await db.exec(`
//         CREATE TABLE IF NOT EXISTS users (
//             userId TEXT PRIMARY KEY,
//             userName TEXT,
//             coins INTEGER DEFAULT 0,
//             codeToInvite TEXT,
//             address TEXT,
//             referral TEXT,
//             createAt TEXT,
//             dataUpdate TEXT,
//             listUserInvited TEXT,
//             currentEnergy INTEGER DEFAULT 0,
//             maxEnergy INTEGER DEFAULT 0
//         );
//
//         CREATE TABLE IF NOT EXISTS completedTasks (
//             userId TEXT,
//             taskId INTEGER,
//             PRIMARY KEY (userId, taskId),
//             FOREIGN KEY (userId) REFERENCES users(userId)
//         );
//
//         CREATE TABLE IF NOT EXISTS leagueLevels (
//             level TEXT PRIMARY KEY,
//             maxEnergy INTEGER,
//             minCoins INTEGER,
//             maxCoins INTEGER
//         );
//
//         INSERT OR IGNORE INTO leagueLevels (level, maxEnergy, minCoins, maxCoins) VALUES
//             ('bronze', 500, 0, 5000),
//             ('silver', 1500, 5001, 25000),
//             ('gold', 2000, 25001, 100000),
//             ('platinum', 15000, 100001, 1000000);
//     `);
//
//     return db;
// }
//
// export default connectDatabase();
