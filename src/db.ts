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
            currentEnergy INTEGER DEFAULT 0,
            maxEnergy INTEGER DEFAULT 0,
            lastTapBootUpdate TEXT DEFAULT NULL,
            imageAvatar TEXT DEFAULT NULL  -- Added new column
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
            turboBoostUpgradeCount INTEGER DEFAULT 0,
            lastTurboBoostUpgrade TEXT DEFAULT NULL,
            FOREIGN KEY (userId) REFERENCES users(userId),
            FOREIGN KEY (boostName) REFERENCES boosts(boostName),
            PRIMARY KEY (userId, boostName)
        );

        CREATE TABLE IF NOT EXISTS user_invitations (
            inviter_id TEXT,
            invitee_id TEXT,
            coinsReferral INTEGER DEFAULT 0,
            FOREIGN KEY (inviter_id) REFERENCES users(userId),
            FOREIGN KEY (invitee_id) REFERENCES users(userId),
            PRIMARY KEY (inviter_id, invitee_id)
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT,
            coins INTEGER,
            checkIcon TEXT,
            taskType TEXT,
            type TEXT,
            actionBtnTx TEXT DEFAULT NULL,
            txDescription TEXT DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS userTasks (
            userId TEXT,
            taskId INTEGER,
            text TEXT,
            coins INTEGER,
            checkIcon TEXT,
            taskType TEXT,
            type TEXT,
            completed BOOLEAN DEFAULT 0,
            lastCompletedDate TEXT DEFAULT NULL,
            actionBtnTx TEXT DEFAULT NULL,
            txDescription TEXT DEFAULT NULL,
            dataSendCheck TEXT DEFAULT NULL,
            isLoading BOOLEAN DEFAULT 0,
            etTx TEXT DEFAULT NULL,
            etaps INTEGER DEFAULT 0,
            FOREIGN KEY (userId) REFERENCES users(userId),
            FOREIGN KEY (taskId) REFERENCES tasks(id),
            PRIMARY KEY (userId, taskId)
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


        CREATE TABLE IF NOT EXISTS premium (
                                               userId TEXT,
                                               amountSpent INTEGER DEFAULT 0,
                                               endDateOfWork TEXT DEFAULT NULL,
                                               FOREIGN KEY (userId) REFERENCES users(userId),
            PRIMARY KEY (userId)
            );

    `);

    // Run migrations
    await migrateDatabase(db);

    return db;
}

export default connectDatabase();

async function migrateDatabase(db: Database): Promise<void> {
    const existingUserColumnsSql = `PRAGMA table_info(users)`;
    const existingUserColumns = await db.all(existingUserColumnsSql);

    // if (!existingUserColumns.some((col) => col.name === 'imageAvatar')) {
    //     await db.exec(`ALTER TABLE users ADD COLUMN imageAvatar TEXT DEFAULT NULL`);
    // }

    const existingUserTaskColumnsSql = `PRAGMA table_info(userTasks)`;
    const existingUserTaskColumns = await db.all(existingUserTaskColumnsSql);

    if (!existingUserTaskColumns.some((col) => col.name === 'actionBtnTx')) {
        await db.exec(`ALTER TABLE userTasks ADD COLUMN actionBtnTx TEXT DEFAULT NULL`);
    }
    if (!existingUserTaskColumns.some((col) => col.name === 'txDescription')) {
        await db.exec(`ALTER TABLE userTasks ADD COLUMN txDescription TEXT DEFAULT NULL`);
    }
    if (!existingUserTaskColumns.some((col) => col.name === 'isLoading')) {
        await db.exec(`ALTER TABLE userTasks ADD COLUMN isLoading BOOLEAN DEFAULT 0`);
    }
    if (!existingUserTaskColumns.some((col) => col.name === 'etTx')) {
        await db.exec(`ALTER TABLE userTasks ADD COLUMN etTx TEXT DEFAULT NULL`);
    }
    if (!existingUserTaskColumns.some((col) => col.name === 'etaps')) {
        await db.exec(`ALTER TABLE userTasks ADD COLUMN etaps INTEGER DEFAULT 0`);
    }

    const existingUserBoostColumnsSql = `PRAGMA table_info(userBoosts)`;
    const existingUserBoostColumns = await db.all(existingUserBoostColumnsSql);

    if (!existingUserBoostColumns.some((col) => col.name === 'turboBoostUpgradeCount')) {
        await db.exec(`ALTER TABLE userBoosts ADD COLUMN turboBoostUpgradeCount INTEGER DEFAULT 0`);
    }
    if (!existingUserBoostColumns.some((col) => col.name === 'lastTurboBoostUpgrade')) {
        await db.exec(`ALTER TABLE userBoosts ADD COLUMN lastTurboBoostUpgrade TEXT DEFAULT NULL`);
    }

    const existingPremiumColumnsSql = `PRAGMA table_info(premium)`;
    const existingPremiumColumns = await db.all(existingPremiumColumnsSql);

    if (!existingPremiumColumns.some((col) => col.name === 'amountSpent')) {
        await db.exec(`ALTER TABLE premium ADD COLUMN amountSpent INTEGER DEFAULT 0`);
    }
    if (!existingPremiumColumns.some((col) => col.name === 'endDateOfWork')) {
        await db.exec(`ALTER TABLE premium ADD COLUMN endDateOfWork TEXT DEFAULT NULL`);
    }




}
