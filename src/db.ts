import mysql from 'mysql2/promise';
import { Connection } from 'mysql2/promise';
import {databaseName, passwordForDB, userForDB} from "../config";

// Настройка подключения к MySQL
const MYSQL_CONFIG = {
    host: 'localhost',
    user: userForDB,
    password: passwordForDB,
    database: databaseName
};

// const MYSQL_CONFIG = {
//     host: 'localhost',
//     user: 'root',
//     password: 'Eh@Kx$4bmdVT',
//     database: 'mainVersionStenBit'
// };

// Функция для подключения к базе данных MySQL
async function connectDatabase() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('Connected to MySQL database');

    await createTables(connection);
    await insertInitialData(connection);
    await addUrlChannelToClans(connection);

    return connection;
}

async function createTables(db: Connection) {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            userId VARCHAR(255) PRIMARY KEY,
            userName VARCHAR(255),
            coins INT DEFAULT 0,
            codeToInvite VARCHAR(255),
            address VARCHAR(255),
            referral VARCHAR(255),
            createAt VARCHAR(255),
            dataUpdate VARCHAR(255),
            currentEnergy INT DEFAULT 0,
            maxEnergy INT DEFAULT 0,
            lastTapBootUpdate VARCHAR(255) DEFAULT NULL,
            imageAvatar VARCHAR(255) DEFAULT NULL
        );
    `;

    const createCompletedTasksTable = `
        CREATE TABLE IF NOT EXISTS completedTasks (
            userId VARCHAR(255),
            taskId INT,
            PRIMARY KEY (userId, taskId),
            FOREIGN KEY (userId) REFERENCES users(userId)
        );
    `;

    const createLeagueLevelsTable = `
        CREATE TABLE IF NOT EXISTS leagueLevels (
            level VARCHAR(255) PRIMARY KEY,
            maxEnergy INT,
            minCoins INT,
            maxCoins INT
        );
    `;

    const createBoostsTable = `
        CREATE TABLE IF NOT EXISTS boosts (
            boostName VARCHAR(255) PRIMARY KEY,
            price INT,
            level INT DEFAULT 1
        );
    `;

    const createUserBoostsTable = `
        CREATE TABLE IF NOT EXISTS userBoosts (
            userId VARCHAR(255),
            boostName VARCHAR(255),
            level INT DEFAULT 1,
            turboBoostUpgradeCount INT DEFAULT 0,
            lastTurboBoostUpgrade VARCHAR(255) DEFAULT NULL,
            FOREIGN KEY (userId) REFERENCES users(userId),
            FOREIGN KEY (boostName) REFERENCES boosts(boostName),
            PRIMARY KEY (userId, boostName)
        );
    `;

    const createUserInvitationsTable = `
        CREATE TABLE IF NOT EXISTS user_invitations (
            inviter_id VARCHAR(255),
            invitee_id VARCHAR(255),
            coinsReferral INT DEFAULT 0,
            FOREIGN KEY (inviter_id) REFERENCES users(userId),
            FOREIGN KEY (invitee_id) REFERENCES users(userId),
            PRIMARY KEY (inviter_id, invitee_id)
        );
    `;

    const createTasksTable = `
        CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            text VARCHAR(255),
            coins INT,
            checkIcon VARCHAR(255),
            taskType VARCHAR(255),
            type VARCHAR(255),
            actionBtnTx VARCHAR(255) DEFAULT NULL,
            txDescription VARCHAR(255) DEFAULT NULL,
            sortLocal VARCHAR(255) DEFAULT NULL
        );
    `;

    const createUserTasksTable = `
        CREATE TABLE IF NOT EXISTS userTasks (
            userId VARCHAR(255),
            taskId INT,
            text VARCHAR(255),
            coins INT,
            checkIcon VARCHAR(255),
            taskType VARCHAR(255),
            type VARCHAR(255),
            completed BOOLEAN DEFAULT 0,
            lastCompletedDate VARCHAR(255) DEFAULT NULL,
            actionBtnTx VARCHAR(255) DEFAULT NULL,
            txDescription VARCHAR(255) DEFAULT NULL,
            dataSendCheck VARCHAR(255) DEFAULT NULL,
            isLoading BOOLEAN DEFAULT 0,
            etTx VARCHAR(255) DEFAULT NULL,
            etaps INT DEFAULT 0,
            storedValues VARCHAR(255) DEFAULT NULL,
            sortLocal VARCHAR(255) DEFAULT NULL,
            FOREIGN KEY (userId) REFERENCES users(userId),
            FOREIGN KEY (taskId) REFERENCES tasks(id),
            PRIMARY KEY (userId, taskId)
        );
    `;

    const createPremiumTable = `
        CREATE TABLE IF NOT EXISTS premium (
            userId VARCHAR(255),
            amountSpent INT DEFAULT 0,
            endDateOfWork VARCHAR(255) DEFAULT NULL,
            FOREIGN KEY (userId) REFERENCES users(userId),
            PRIMARY KEY (userId)
        );
    `;

    const createClansTable = `
        CREATE TABLE IF NOT EXISTS clans (
                                             clanId VARCHAR(255) PRIMARY KEY,
            clanName VARCHAR(255) NOT NULL,
            description VARCHAR(255) DEFAULT NULL,
            rating INT DEFAULT 0,
            createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            Urlchanel VARCHAR(255) DEFAULT NULL
            );
    `;


    const createUserClansTable = `
        CREATE TABLE IF NOT EXISTS userClans (
            userId VARCHAR(255),
            clanId VARCHAR(255),
            role ENUM('simple', 'creator') DEFAULT 'simple',
            joinDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            contributedRating INT DEFAULT 0,
            PRIMARY KEY (userId, clanId),
            FOREIGN KEY (userId) REFERENCES users(userId),
            FOREIGN KEY (clanId) REFERENCES clans(clanId)
        );
    `;

    // Новые таблицы
    const createCoinsProgressLevelTable = `
        CREATE TABLE IF NOT EXISTS CoinsProgressLevel (
            levelId INT AUTO_INCREMENT PRIMARY KEY,
            levelName VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            price INT NOT NULL
        );
    `;

    const createUserCoinsProgressLevelTable = `
        CREATE TABLE IF NOT EXISTS UserCoinsProgressLevel (
            userId VARCHAR(255),
            levelId INT,
            FOREIGN KEY (userId) REFERENCES users(userId),
            FOREIGN KEY (levelId) REFERENCES CoinsProgressLevel(levelId),
            PRIMARY KEY (userId, levelId)
        );
    `;


    // Таблица UserLeague
    const createUserLeagueTable = `
        CREATE TABLE IF NOT EXISTS UserLeague (
            leagueId INT AUTO_INCREMENT PRIMARY KEY,
            userId VARCHAR(255),
            userName VARCHAR(255),
            imageAvatar VARCHAR(255),
            score INT DEFAULT 0,
            buyscore INT DEFAULT 0,
            freescore INT DEFAULT 0,
            reward INT DEFAULT 0,
            FOREIGN KEY (userId) REFERENCES users(userId)
        );
    `;

    const createAcquisitionsTableQuery = `
        CREATE TABLE IF NOT EXISTS acquisitions (
            userId VARCHAR(255),
            totalAmount DECIMAL(10, 2) DEFAULT 0,
            lastPurchase VARCHAR(255) DEFAULT NULL,
            selectedPurchase VARCHAR(255) DEFAULT NULL,
            selectedAmount DECIMAL(10, 2) DEFAULT 0,
            PRIMARY KEY (userId),
            FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
        );
    `;


    try {
        await db.execute(createUsersTable);
        await db.execute(createCompletedTasksTable);
        await db.execute(createLeagueLevelsTable);
        await db.execute(createBoostsTable);
        await db.execute(createUserBoostsTable);
        await db.execute(createUserInvitationsTable);
        await db.execute(createTasksTable);
        await db.execute(createUserTasksTable);
        await db.execute(createPremiumTable);
        await db.execute(createClansTable);
        await db.execute(createUserClansTable);
        await db.execute(createCoinsProgressLevelTable);
        await db.execute(createUserCoinsProgressLevelTable);
        await db.execute(createUserLeagueTable);
        await db.execute(createAcquisitionsTableQuery);
        console.log('Tables created successfully');
    } catch (error) {
        console.error('Failed to create tables:', error);
    }
}



// Функция для вставки начальных данных
async function insertInitialData(db: Connection) {
    const insertBoosts = `
        INSERT IGNORE INTO boosts (boostName, price, level) VALUES
            ('multitap', 2000, 1),
            ('energy limit', 1500, 1),
            ('tapBoot', 3500, 1),
            ('turbo', 5000, 1);
    `;

    const insertLeagueLevels = `
        INSERT IGNORE INTO leagueLevels (level, maxEnergy, minCoins, maxCoins) VALUES
            ('bronze', 500, 0, 5000),
            ('silver', 1500, 5001, 25000),
            ('gold', 2000, 25001, 100000),
            ('platinum', 15000, 100001, 1000000);
    `;

    try {
        await db.execute(insertBoosts);
        await db.execute(insertLeagueLevels);
        console.log('Initial data inserted successfully');
    } catch (error) {
        console.error('Failed to insert initial data:', error);
    }
}


async function addUrlChannelToClans(db: Connection) {
    try {
        const addUrlChannelQuery = `
            ALTER TABLE clans 
            ADD COLUMN Urlchanel VARCHAR(255) DEFAULT NULL;
        `;

        const addreward = `
                 ALTER TABLE UserLeague 
            ADD COLUMN reward INT DEFAULT 0;
        `
        // added storedValues
        const addStoredValueQuery = `
            ALTER TABLE userTasks
            ADD COLUMN storedValues VARCHAR(255) DEFAULT NULL;
        `

        const addedSortLocalUserTasks = `
            ALTER TABLE userTasks
            ADD COLUMN  sortLocal VARCHAR(255) DEFAULT NULL;
        `

        const addedSortLocalTasks = `
            ALTER TABLE tasks
            ADD COLUMN  sortLocal VARCHAR(255) DEFAULT NULL;
        `

        // Выполнение запроса на добавление нового столбца
        // await db.execute(addStoredValueQuery);
        await db.execute(addedSortLocalTasks);
        await db.execute(addedSortLocalUserTasks);
        // await db.execute(addreward);
        // await db.execute(addUrlChannelQuery);
        console.log('Urlchanel column added to clans table successfully');
    } catch (error) {
            console.error('Failed to add Urlchanel column to clans table:', error);
    }
}



export default connectDatabase;