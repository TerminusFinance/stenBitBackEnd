PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
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
            lastTapBootUpdate TEXT DEFAULT NULL
        );
INSERT INTO users VALUES('user1','Jo Doe',100,'UNIQUE_CODE_PNEYTHUHF',NULL,'','2024-07-08T06:58:40.465Z','2024-07-08T06:58:40.465Z',0,0,NULL);
INSERT INTO users VALUES('user2','Jo Doe',100,'UNIQUE_CODE_K6K150WH3',NULL,'','2024-07-08T07:03:12.182Z','2024-07-08T07:03:12.182Z',0,0,NULL);
INSERT INTO users VALUES('755050714','Roma',203815,'UNIQUE_CODE_67TNLHU1H',NULL,'','2024-07-09T18:18:44.049Z','2024-07-12T13:51:22.466Z',818,1000,'2024-07-12T13:51:22.510Z');
CREATE TABLE completedTasks (
            userId TEXT,
            taskId INTEGER,
            PRIMARY KEY (userId, taskId),
            FOREIGN KEY (userId) REFERENCES users(userId)
        );
CREATE TABLE leagueLevels (
            level TEXT PRIMARY KEY,
            maxEnergy INTEGER,
            minCoins INTEGER,
            maxCoins INTEGER
        );
INSERT INTO leagueLevels VALUES('bronze',500,0,5000);
INSERT INTO leagueLevels VALUES('silver',1500,5001,25000);
INSERT INTO leagueLevels VALUES('gold',2000,25001,100000);
INSERT INTO leagueLevels VALUES('platinum',15000,100001,1000000);
CREATE TABLE boosts (
            boostName TEXT PRIMARY KEY,
            price INTEGER,
            level INTEGER DEFAULT 1
        );
INSERT INTO boosts VALUES('multitap',2000,1);
INSERT INTO boosts VALUES('energy limit',1500,1);
INSERT INTO boosts VALUES('tapBoot',3500,1);
INSERT INTO boosts VALUES('turbo',5000,1);
CREATE TABLE userBoosts (
            userId TEXT,
            boostName TEXT,
            level INTEGER DEFAULT 1, turboBoostUpgradeCount INTEGER DEFAULT 0, lastTurboBoostUpgrade TEXT DEFAULT NULL,
            FOREIGN KEY (userId) REFERENCES users(userId),
            FOREIGN KEY (boostName) REFERENCES boosts(boostName),
            PRIMARY KEY (userId, boostName)
        );
INSERT INTO userBoosts VALUES('user1','multitap',1,0,NULL);
INSERT INTO userBoosts VALUES('user1','energy limit',1,0,NULL);
INSERT INTO userBoosts VALUES('user1','tapBoot',1,0,NULL);
INSERT INTO userBoosts VALUES('user1','turbo',1,0,NULL);
INSERT INTO userBoosts VALUES('user2','multitap',1,0,NULL);
INSERT INTO userBoosts VALUES('user2','energy limit',2,0,NULL);
INSERT INTO userBoosts VALUES('user2','tapBoot',1,0,NULL);
INSERT INTO userBoosts VALUES('user2','turbo',1,0,NULL);
INSERT INTO userBoosts VALUES('755050714','multitap',1,0,NULL);
INSERT INTO userBoosts VALUES('755050714','energy limit',1,0,NULL);
INSERT INTO userBoosts VALUES('755050714','tapBoot',1,0,NULL);
INSERT INTO userBoosts VALUES('755050714','turbo',-3,0,NULL);
CREATE TABLE user_invitations (
            inviter_id TEXT,
            invitee_id TEXT,
            coinsReferral INTEGER DEFAULT 0,
            FOREIGN KEY (inviter_id) REFERENCES users(userId),
            FOREIGN KEY (invitee_id) REFERENCES users(userId),
            PRIMARY KEY (inviter_id, invitee_id)
        );
CREATE TABLE tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT,
            coins INTEGER,
            checkIcon TEXT,
            taskType TEXT,
            type TEXT,
            actionBtnTx TEXT DEFAULT NULL,
            txDescription TEXT DEFAULT NULL
        );
INSERT INTO tasks VALUES(1,'Buy NFT',3400800,'https://i.imgur.com/fyqPUj5.png','{"type":"SubscribeToTg","url":"EQBRvxhdrViPDimj46_hk2jv53-2UFbbP0bUUu-vDT2-k4EY","id":"12121"}','challenge','Go but',NULL);
INSERT INTO tasks VALUES(2,'ByiBit registration',3400800,'https://i.imgur.com/fyqPUj5.png','{"type":"StockReg","url":"EQBRvxhdrViPDimj46_hk2jv53-2UFbbP0bUUu-vDT2-k4EY"}','challenge',NULL,NULL);
CREATE TABLE userTasks (
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
            txDescription TEXT DEFAULT NULL, dataSendCheck TEXT DEFAULT NULL, isLoading BOOLEAN DEFAULT 0, etTx TEXT DEFAULT NULL, etaps INTEGER DEFAULT 0,
            FOREIGN KEY (userId) REFERENCES users(userId),
            FOREIGN KEY (taskId) REFERENCES tasks(id),
            PRIMARY KEY (userId, taskId)
        );
INSERT INTO userTasks VALUES('755050714',1,NULL,NULL,NULL,'{"type":"SubscribeToTg","url":"EQBRvxhdrViPDimj46_hk2jv53-2UFbbP0bUUu-vDT2-k4EY","id":"12121"}',NULL,0,NULL,'Go but',NULL,NULL,0,NULL,0);
INSERT INTO userTasks VALUES('user1',1,NULL,NULL,NULL,'{"type":"SubscribeToTg","url":"EQBRvxhdrViPDimj46_hk2jv53-2UFbbP0bUUu-vDT2-k4EY","id":"12121"}',NULL,0,NULL,'Go but',NULL,NULL,0,NULL,0);
INSERT INTO userTasks VALUES('user2',1,NULL,NULL,NULL,'{"type":"SubscribeToTg","url":"EQBRvxhdrViPDimj46_hk2jv53-2UFbbP0bUUu-vDT2-k4EY","id":"12121"}',NULL,0,NULL,'Go but',NULL,NULL,0,NULL,0);
INSERT INTO userTasks VALUES('755050714',2,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'2024-07-11T09:13:01.756Z',0,NULL,2);
INSERT INTO userTasks VALUES('user1',2,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,0,NULL,0);
INSERT INTO userTasks VALUES('user2',2,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,0,NULL,0);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('tasks',2);
COMMIT;
