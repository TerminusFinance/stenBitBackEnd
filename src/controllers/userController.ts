import {Database} from 'sqlite';
import {isUserSubscribed, sendToCheckUserHaveNftFromCollections} from "../tonWork/CheckToNftitem";
import {
    Boost,
    IsCheckNftTask, IsOpenUrl, IsStockReg,
    IsSubscribeToTg,
    TaskCardProps,
    TaskType,
    User,
    UserBoost,
    UserTask
} from "../types/Types";


class UserController {
    constructor(private db: Database) {
    }

    private generateUniqueCodeToInvite(): string {
        return `UNIQUE_CODE_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    async createUser(userId: string, userName: string, coins: number, address: string): Promise<User> {
        try {
            // Проверка, существует ли уже пользователь с таким userId
            const existingUser = await this.getUserFromId(userId, null);
            if (existingUser) {
                throw new Error(`User with userId ${userId} already exists`);
            }

            const codeToInvite = this.generateUniqueCodeToInvite();
            const createAt = new Date().toISOString();
            const dataUpdate = createAt;

            const createUserSql = `
                INSERT INTO users (userId, userName, coins, codeToInvite, address, referral, createAt, dataUpdate,
                                   currentEnergy, maxEnergy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1000, 1000) `;

            await this.db.run(createUserSql, [userId, userName, coins, codeToInvite, address, '', createAt, dataUpdate]);

            // Инициализация бустов для нового пользователя
            const boosts = [
                {boostName: 'multitap', level: 1, price: 2000},
                {boostName: 'energy limit', level: 1, price: 1500},
                {boostName: 'tapBoot', level: 1, price: 3500},
                {boostName: 'turbo', level: 1, price: 5000}
            ];

            const insertUserBoostSql = `INSERT INTO userBoosts (userId, boostName, level)
                                        VALUES (?, ?, ?)`;
            for (const boost of boosts) {
                await this.db.run(insertUserBoostSql, [userId, boost.boostName, boost.level]);
            }

            // Инициализация задач для нового пользователя
            const tasksSql = `SELECT id,
                                     text,
                                     coins,
                                     checkIcon,
                                     taskType,
                                     type,
                                     actionBtnTx,
                                     txDescription
                              FROM tasks`;
            const allTasks = await this.db.all(tasksSql);


            const insertUserTaskSql = `
                INSERT INTO userTasks (userId, taskId, text, coins, checkIcon, taskType, type, completed,
                                       lastCompletedDate, actionBtnTx, txDescription)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, null, ?, ?)
            `;
            for (const task of allTasks) {
                await this.db.run(insertUserTaskSql, [userId, task.id, task.text, task.coins, task.checkIcon, task.taskType, task.type, task.actionBtnTx, task.txDescription]);
            }

            const newUser = await this.getUserFromId(userId, null);
            if (!newUser) {
                throw new Error('Failed to create new user');
            }

            return newUser;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }


    async checkAndUpdateTasksForUser(userId: string) {
        const userTasksSql = `
            SELECT t.id AS taskId,
                   t.taskType,
                   ut.etaps
            FROM tasks t
                     JOIN userTasks ut ON t.id = ut.taskId
            WHERE ut.userId = ?
        `;
        const userTasks = await this.db.all(userTasksSql, [userId]);
        for (const task of userTasks) {
            if ((task.etaps == 1 || task.etaps == 3)) {
                await this.checkSuccessTask(userId, task.taskId);
            }
        }
    }

    async addCoinsAndDeductEnergy(userId: string, coins: number): Promise<User | undefined> {
        const user = await this.getUserFromId(userId, null);
        if (user && user.boosts) {
            const maxCoinsChanged = user.boosts[1].level * 10 * 20 * 3
            if (coins > maxCoinsChanged) {
                throw new Error('The user can t get that many coins');
            }

            if (user.currentEnergy < coins) {
                throw new Error('The user can t get that many coins of energy limits');
            }

            const newCoins = user.coins + coins;
            const newEnergy = Math.max(0, user.currentEnergy - coins);

            const updateUserSql = `UPDATE users
                                   SET coins         = ?,
                                       currentEnergy = ?
                                   WHERE userId = ?`;
            await this.db.run(updateUserSql, [newCoins, newEnergy, userId]);
            const returneduser = await this.getUserFromId(userId, null)


            if (user.referral && returneduser != undefined) {
                const referralSql = `SELECT *
                                     FROM users
                                     WHERE codeToInvite = ?`;
                const inviter = await this.db.get(referralSql, [user.referral]);
                if (inviter) {
                    const updatedCoins = returneduser.coins ;
                    const originalThousands = Math.floor(user.coins / 1000);
                    const updatedThousands = Math.floor(updatedCoins / 1000);
                    if (updatedThousands > originalThousands) {
                        const additionalCoins = (updatedThousands - originalThousands) * 100;
                        const updateInviterCoinsSql = `UPDATE users
                                                       SET coins = coins + ?
                                                       WHERE userId = ?`;
                        await this.db.run(updateInviterCoinsSql, [additionalCoins, inviter.userId]);

                        const updateInvitationSql = `
                            INSERT INTO user_invitations (inviter_id, invitee_id, coinsReferral)
                            VALUES (?, ?, ?) ON CONFLICT(inviter_id, invitee_id) DO
                            UPDATE SET
                                coinsReferral = user_invitations.coinsReferral + excluded.coinsReferral
                        `;
                        await this.db.run(updateInvitationSql, [inviter.userId, userId, additionalCoins]);
                    }
                }
            }
            return returneduser;
        }
    }

    async getUserFromId(userId: string, imageAvatar: string | null): Promise<User | undefined> {
        const userSql = `SELECT *
                         FROM users
                         WHERE userId = ?`;
        const user = await this.db.get(userSql, [userId]);

        if (user) {
            // Calculate energy recovery
            const currentTime = new Date();
            const lastUpdate = user.dataUpdate ? new Date(user.dataUpdate) : new Date();
            const elapsedSeconds = Math.floor((currentTime.getTime() - lastUpdate.getTime()) / 1000);

            // Energy recovery: 1 point per second
            const recoveredEnergy = elapsedSeconds;

            user.currentEnergy = Math.min(user.maxEnergy, user.currentEnergy + recoveredEnergy);
            user.dataUpdate = currentTime.toISOString();

            // Update the user's currentEnergy and dataUpdate in the database
            const updateEnergySql = `UPDATE users
                                     SET currentEnergy = ?,
                                         dataUpdate    = ?
                                     WHERE userId = ?`;
            await this.db.run(updateEnergySql, [user.currentEnergy, user.dataUpdate, userId]);

            // Check and update imageAvatar if necessary
            console.error("imageAvatar - ", imageAvatar)
            if (imageAvatar !== null && imageAvatar !== user.imageAvatar) {
                console.error("imageAvatar - continue")
                user.imageAvatar = imageAvatar;
                const updateAvatarSql = `UPDATE users
                                         SET imageAvatar = ?
                                         WHERE userId = ?`;
                await this.db.run(updateAvatarSql, [imageAvatar, userId]);
            }

            // Fetch user's completed tasks
            const tasksSql = `SELECT taskId
                              FROM completedTasks
                              WHERE userId = ?`;
            const tasks = await this.db.all(tasksSql, [userId]);

            // Fetch user's boosts
            const boostsSql = `
                SELECT b.boostName, ub.level, b.price
                FROM userBoosts ub
                         JOIN boosts b ON ub.boostName = b.boostName
                WHERE ub.userId = ?
            `;
            const boosts = await this.db.all(boostsSql, [userId]);
            user.boosts = boosts.map(boost => ({
                boostName: boost.boostName,
                level: boost.level,
                price: boost.price * Math.pow(2, boost.level - 1) // Цена увеличивается в 2 раза за каждый уровень
            }));

            // Handle tapBoost logic
            const tapBoost = user.boosts.find((boost: UserBoost) => boost.boostName === 'tapBoot');
            if (tapBoost) {
                if (!user.lastTapBootUpdate) {
                    user.lastTapBootUpdate = currentTime.toISOString();
                } else {
                    await this.updateCoinsWithTapBoot(userId, tapBoost.level, user.lastTapBootUpdate);
                }
            }

            // Fetch user's invited users
            const inviteesSql = `
                SELECT u.userId, u.userName, ui.coinsReferral
                FROM users u
                         JOIN user_invitations ui ON u.userId = ui.invitee_id
                WHERE ui.inviter_id = ?
            `;
            const invitees = await this.db.all(inviteesSql, [userId]);

            // Fetch and update user tasks
            const userTasksSql = `
                SELECT t.id AS taskId,
                       t.text,
                       t.coins,
                       t.checkIcon,
                       t.taskType,
                       t.type,
                       ut.completed,
                       ut.lastCompletedDate,
                       ut.actionBtnTx,
                       ut.txDescription,
                       ut.dataSendCheck,
                       ut.isLoading,
                       ut.etTx,
                       ut.etaps
                FROM tasks t
                         JOIN userTasks ut ON t.id = ut.taskId
                WHERE ut.userId = ?
            `;
            let userTasks = await this.db.all(userTasksSql, [userId]);

            const today = new Date().toISOString().split('T')[0];
            userTasks = await Promise.all(userTasks.map(async (task) => {
                if (task.type === 'DailyTask' && task.lastCompletedDate !== today) {
                    await this.db.run(
                        `UPDATE userTasks
                         SET completed         = 0,
                             lastCompletedDate = ?
                         WHERE userId = ?
                           AND taskId = ?`,
                        [today, userId, task.taskId]
                    );
                    task.completed = false;
                    task.lastCompletedDate = today;
                }

                return {
                    taskId: task.taskId,
                    text: task.text,
                    coins: task.coins,
                    checkIcon: task.checkIcon,
                    taskType: JSON.parse(task.taskType),
                    type: task.type,
                    completed: task.completed === 1, // Convert 1 to true and 0 to false
                    lastCompletedDate: task.lastCompletedDate,
                    actionBtnTx: task.actionBtnTx,
                    txDescription: task.txDescription,
                    dataSendCheck: task.dataSendCheck,
                    isLoading: task.isLoading === 1, // Convert 1 to true and 0 to false
                    etTx: task.etTx,
                    etaps: task.etaps
                };
            }));

            // Проверка и обновление задач
            await this.checkAndUpdateTasksForUser(userId);

            // Снова извлечем обновленные задачи
            userTasks = await this.db.all(userTasksSql, [userId]);

            const formattedTasks = await Promise.all(userTasks.map(async (task) => {
                return {
                    taskId: task.taskId,
                    text: task.text,
                    coins: task.coins,
                    checkIcon: task.checkIcon,
                    taskType: JSON.parse(task.taskType),
                    type: task.type,
                    completed: task.completed === 1, // Convert 1 to true and 0 to false
                    lastCompletedDate: task.lastCompletedDate,
                    actionBtnTx: task.actionBtnTx,
                    txDescription: task.txDescription,
                    dataSendCheck: task.dataSendCheck,
                    isLoading: task.isLoading === 1, // Convert 1 to true and 0 to false
                    etTx: task.etTx,
                    etaps: task.etaps
                };
            }));

            const energyBoost = user.boosts.find((boost: UserBoost) => boost.boostName === 'energy limit');
            const newMaxEnergy = energyBoost ? 1000 + (energyBoost.level - 1) * 500 : 1000;

            if (user.maxEnergy == 0 || user.maxEnergy == null) {
                console.error("maxEnergy == 0");
                user.maxEnergy = newMaxEnergy;
                const updateMaxEnergySql = `UPDATE users
                                            SET maxEnergy = ?
                                            WHERE userId = ?`;
                await this.db.run(updateMaxEnergySql, [newMaxEnergy, userId]);
            } else {
                user.maxEnergy = Math.max(user.maxEnergy, newMaxEnergy); // Обновляем maxEnergy только если новое значение больше
            }

            return {
                ...user,
                completedTasks: tasks.map(task => task.taskId),
                boosts: user.boosts,
                listUserInvited: invitees,
                tasks: formattedTasks
            };
        }

        return undefined;
    }

    async getUserById(userId: string): Promise<User | undefined> {
        const getUserSql = 'SELECT * FROM users WHERE userId = ?';
        const user = await this.db.get(getUserSql, [userId]);
        return user as User | undefined;
    }

    async updateUser(userId: string, updatedData: Partial<User>): Promise<User | undefined> {
        const {userName, coins, address, referral, currentEnergy, maxEnergy} = updatedData;
        const updateDate = new Date().toISOString();

        const updateUserSql = `
            UPDATE users
            SET userName          = COALESCE(?, userName),
                coins             = COALESCE(?, coins),
                address           = COALESCE(?, address),
                referral          = COALESCE(?, referral),
                dataUpdate        = ?,
                currentEnergy     = COALESCE(?, currentEnergy),
                maxEnergy         = COALESCE(?, maxEnergy),
                lastTapBootUpdate = ?
            WHERE userId = ?
        `;

        try {
            const originalUser = await this.getUserById(userId);
            if (!originalUser) {
                throw new Error('User not found');
            }

            if (updatedData.coins != undefined) {
                if (updatedData.coins - originalUser.coins > 10000) {
                    throw new Error('The user can t get that many coins');
                }
            }

            const originalCoins = originalUser.coins || 0;
            await this.db.run(updateUserSql, [userName, coins, address, referral, updateDate, currentEnergy, maxEnergy, updateDate, userId]);

            const updatedUser = await this.getUserById(userId);
            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }

            // Проверка и обновление монет пригласившего пользователя
            if (updatedUser.referral) {
                const referralSql = `SELECT *
                                     FROM users
                                     WHERE codeToInvite = ?`;
                const inviter = await this.db.get(referralSql, [updatedUser.referral]);

                if (inviter) {
                    const updatedCoins = updatedUser.coins || 0;
                    const originalThousands = Math.floor(originalCoins / 1000);
                    const updatedThousands = Math.floor(updatedCoins / 1000);

                    if (updatedThousands > originalThousands) {
                        const additionalCoins = (updatedThousands - originalThousands) * 100;
                        const updateInviterCoinsSql = `UPDATE users
                                                       SET coins = coins + ?
                                                       WHERE userId = ?`;
                        await this.db.run(updateInviterCoinsSql, [additionalCoins, inviter.userId]);

                        const updateInvitationSql = `
                            INSERT INTO user_invitations (inviter_id, invitee_id, coinsReferral)
                            VALUES (?, ?, ?) ON CONFLICT(inviter_id, invitee_id) DO
                            UPDATE SET
                                coinsReferral = user_invitations.coinsReferral + excluded.coinsReferral
                        `;
                        await this.db.run(updateInvitationSql, [inviter.userId, userId, additionalCoins]);
                    }
                }
            }

            const returneduser = await this.getUserFromId(userId, null)

            return returneduser;
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error(`Failed to update user: ${error}`);
        }
    }

    async processInvitation(inviteCode: string, newUserId: string, newUserName: string): Promise<User> {
        const inviterSql = `SELECT *
                            FROM users
                            WHERE codeToInvite = ?`;
        const inviter = await this.db.get(inviterSql, [inviteCode]);

        if (!inviter) {
            throw new Error('User with the given invite code not found');
        }

        const existingUserSql = `SELECT *
                                 FROM users
                                 WHERE userId = ?`;
        const existingUser = await this.db.get(existingUserSql, [newUserId]);

        if (existingUser) {
            throw new Error('User with this userId already exists');
        }

        const codeToInvite = this.generateUniqueCodeToInvite();
        const createAt = new Date().toISOString();
        const dataUpdate = createAt;

        const newUserSql = `
            INSERT INTO users (userId, userName, coins, codeToInvite, address, referral, createAt, dataUpdate,
                               currentEnergy, maxEnergy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1000, 1000)
        `;
        await this.db.run(newUserSql, [newUserId, newUserName, 0, codeToInvite, '', inviteCode, createAt, dataUpdate]);

        // Добавление записи о приглашении в таблицу user_invitations
        const insertInvitationSql = `
            INSERT INTO user_invitations (inviter_id, invitee_id, coinsReferral)
            VALUES (?, ?, 0)
        `;
        await this.db.run(insertInvitationSql, [inviter.userId, newUserId]);

        // Инициализация бустов для нового пользователя
        const boosts = [
            {boostName: 'multitap', level: 1},
            {boostName: 'energy limit', level: 1},
            {boostName: 'tapBoot', level: 1},
            {boostName: 'turbo', level: 1}
        ];

        const insertUserBoostSql = `INSERT INTO userBoosts (userId, boostName, level)
                                    VALUES (?, ?, ?)`;

        for (const boost of boosts) {
            await this.db.run(insertUserBoostSql, [newUserId, boost.boostName, boost.level]);
        }

        // Инициализация задач для нового пользователя
        const tasksSql = `SELECT id,
                                 text,
                                 coins,
                                 checkIcon,
                                 taskType,
                                 type,
                                 actionBtnTx,
                                 txDescription
                          FROM tasks`;
        const allTasks = await this.db.all(tasksSql);

        const insertUserTaskSql = `
            INSERT INTO userTasks (userId, taskId, text, coins, checkIcon, taskType, type, completed, lastCompletedDate,
                                   actionBtnTx, txDescription)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, null, ?, ?)
        `;
        for (const task of allTasks) {
            await this.db.run(insertUserTaskSql, [newUserId, task.id, task.text, task.coins, task.checkIcon, task.taskType, task.type, task.actionBtnTx, task.txDescription]);
        }

        const user = await this.getUserFromId(newUserId, null);

        if (!user) {
            throw new Error('Failed to retrieve the new user');
        }

        return user;
    }


    async getBoosts(): Promise<Boost[]> {
        const boostsSql = `SELECT *
                           FROM boosts`;
        return this.db.all(boostsSql);
    }

    async updateBoost(userId: string, boostName: string): Promise<{ user: User; boostEndTime?: string } | undefined> {
        try {

            const boostSql = `SELECT *
                              FROM boosts
                              WHERE boostName = ?`;
            const boost = await this.db.get(boostSql, [boostName]);

            if (!boost) {
                throw new Error('Invalid boost name');
            }

            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }


            const userBoostSql = `SELECT *
                                  FROM userBoosts
                                  WHERE userId = ?
                                    AND boostName = ?`;
            let userBoost = await this.db.get(userBoostSql, [userId, boostName]);

            let boostEndTime: string | undefined;

            if (!userBoost) {

                if(userBoost.level == 50) {
                    throw new Error('Max level limits');
                }
                const insertUserBoostSql = `INSERT INTO userBoosts (userId, boostName, level, turboBoostUpgradeCount,
                                                                    lastTurboBoostUpgrade)
                                            VALUES (?, ?, 1, 0, NULL)`;
                await this.db.run(insertUserBoostSql, [userId, boostName]);
                userBoost = {boostName, level: 1, turboBoostUpgradeCount: 0, lastTurboBoostUpgrade: null};
            } else {
                if ((boost.price * userBoost.level) > user.coins) {
                    throw new Error('Your don have enough money');
                }

                if (boostName === 'turbo') {
                    const now = new Date();
                    const today = now.toISOString().split('T')[0];
                    const lastUpgradeDate = userBoost.lastTurboBoostUpgrade ? new Date(userBoost.lastTurboBoostUpgrade).toISOString().split('T')[0] : null;

                    if (lastUpgradeDate === today && userBoost.turboBoostUpgradeCount >= 2) {
                        throw new Error('Turbo boost can only be upgraded twice per day');
                    }

                    if (lastUpgradeDate !== today) {
                        userBoost.turboBoostUpgradeCount = 0; // Reset the count for a new day
                    }

                    userBoost.turboBoostUpgradeCount += 1;
                    userBoost.lastTurboBoostUpgrade = now.toISOString();

                    const boostDuration = 60000; // 60000 milliseconds = 1 minute
                    const endTime = new Date(now.getTime() + boostDuration);
                    boostEndTime = endTime.toISOString();

                    // Активируем буст на одну минуту
                    setTimeout(async () => {
                        await this.db.run(`UPDATE userBoosts
                                           SET level = level - 1
                                           WHERE userId = ?
                                             AND boostName = ?`, [userId, boostName]);
                        userBoost.level -= 1;
                    }, boostDuration);
                } else {
                    const updateUserBoostSql = `UPDATE userBoosts
                                                SET level = level + 1
                                                WHERE userId = ?
                                                  AND boostName = ?`;
                    await this.db.run(updateUserBoostSql, [userId, boostName]);
                    userBoost.level += 1;
                }
            }

            const newCoins = user.coins - (boost.price * userBoost.level)
            if (newCoins < 0) {
                throw new Error('Not enough coins');
            }

            if (boostName === 'energy limit') {
                let newMaxEnergy = user.maxEnergy;
                if (user.maxEnergy === 0) {
                    newMaxEnergy = 1000; // Начальное значение, если maxEnergy = 0
                }
                newMaxEnergy += 500; // Добавляем фиксированное количество энергии за каждый уровень
                await this.updateUser(userId, {maxEnergy: newMaxEnergy});
            }

            await this.updateUser(userId, {coins: newCoins});

            // Возвращаем обновленного пользователя с его бустами и время окончания буста
            const updatedUser = await this.getUserFromId(userId, null);
            if (!updatedUser) {
                throw new Error('Failed to fetch updated user');
            }

            return {user: updatedUser, boostEndTime};
        } catch (error) {
            console.error('Ошибка при обновлении буста:', error);
            throw new Error(`Failed to update boost: ${error}`);
        }
    }


    // tap boot

    async updateCoinsWithTapBoot(userId: string, tapBootLevel: number, lastTapBootUpdate: string) {
        console.log("Запуск tapBoot:");

        const intervalInSeconds = 2; // Интервал в секундах для добавления монет пользователя

        const lastUpdateTime = new Date(lastTapBootUpdate).getTime();
        const currentTime = new Date().getTime();

        // Определяем время работы механизма на основе уровня tapBoot
        const durationInMinutes = 5 + (tapBootLevel - 1) * 2; // Максимальная длительность tapBoot в минутах
        const durationInMilliseconds = durationInMinutes * 60 * 1000; // Максимальная длительность tapBoot в миллисекундах

        let timePassed = currentTime - lastUpdateTime;

        // Ограничиваем время, чтобы не превышало максимальную длительность tapBoot
        if (timePassed > durationInMilliseconds) {
            timePassed = durationInMilliseconds;
        }

        // Вычисляем количество монет для добавления
        const coinsToAdd = Math.floor(timePassed / (intervalInSeconds * 1000));

        console.error('Запуск tap bot: монеты апдейт - coinsToAdd', coinsToAdd);

        // Обновляем монеты и время последнего обновления
        const newCoinsSql = `
            UPDATE users
            SET coins             = coins + ?,
                lastTapBootUpdate = ?
            WHERE userId = ?
        `;
        await this.db.run(newCoinsSql, [coinsToAdd, new Date().toISOString(), userId]);
    }


    // task operation


    async addTaskToAllUsers(text: string, coins: number, checkIcon: string, taskType: TaskType, type: string, actionBtnTx: string | null = null, txDescription: string | null = null): Promise<TaskCardProps> {
        const insertTaskSql = `
            INSERT INTO tasks (text, coins, checkIcon, taskType, type, actionBtnTx, txDescription)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await this.db.run(insertTaskSql, [text, coins, checkIcon, JSON.stringify(taskType), type, actionBtnTx, txDescription]);
        const newTaskId = result.lastID;

        if (newTaskId === undefined) {
            throw new Error('Failed to create new task');
        }

        const allUsersSql = `SELECT userId
                             FROM users`;
        const allUsers = await this.db.all(allUsersSql);

        const insertUserTaskSql = `INSERT INTO userTasks (userId, taskId, completed)
                                   VALUES (?, ?, ?)`;

        for (const user of allUsers) {
            await this.db.run(insertUserTaskSql, [user.userId, newTaskId, false]);
        }

        return {
            id: newTaskId,
            text,
            coins,
            checkIcon,
            completed: false,
            taskType,
            type,
            actionBtnTx,
            txDescription
        };
    }


    async getTasksByType(userId: string): Promise<{ dailyTasks: UserTask[]; challengeTasks: UserTask[] }> {
        const tasksSql = `
            SELECT t.id AS taskId, t.text, t.coins, t.checkIcon, t.taskType, t.type, ut.completed
            FROM tasks t
                     JOIN userTasks ut ON t.id = ut.taskId
            WHERE ut.userId = ?
        `;
        const tasks = await this.db.all(tasksSql, [userId]);

        const dailyTasks = tasks.filter((task: UserTask) => task.type === 'daily');
        const challengeTasks = tasks.filter((task: UserTask) => task.type === 'challenge');

        return {
            dailyTasks,
            challengeTasks
        };
    }

    async getAllTasks(): Promise<TaskCardProps[]> {
        const tasksSql = `
            SELECT id,
                   text,
                   coins,
                   checkIcon,
                   taskType,
                   type,
                   actionBtnTx,
                   txDescription
            FROM tasks
        `;
        const tasks = await this.db.all(tasksSql);

        return tasks.map(task => ({
            id: task.id,
            text: task.text,
            coins: task.coins,
            checkIcon: task.checkIcon,
            taskType: JSON.parse(task.taskType),
            type: task.type,
            completed: false, // Default to false since these are all tasks, not user-specific
            actionBtnTx: task.actionBtnTx,
            txDescription: task.txDescription
        }));
    }


    async updateTask(taskId: number, updatedFields: Partial<TaskCardProps>): Promise<void> {
        // Если taskType присутствует в updatedFields, преобразуем его в JSON строку
        if (updatedFields.taskType) {
            updatedFields.taskType = JSON.stringify(updatedFields.taskType) as unknown as TaskType;
        }

        const fieldsToUpdate = Object.keys(updatedFields).map(field => `${field} = ?`).join(', ');
        const values = Object.values(updatedFields);
        const updateSql = `UPDATE tasks
                           SET ${fieldsToUpdate}
                           WHERE id = ?`;
        await this.db.run(updateSql, [...values, taskId]);

        const userTasksUpdateSql = `
            UPDATE userTasks
            SET ${fieldsToUpdate}
            WHERE taskId = ?;
        `;
        await this.db.run(userTasksUpdateSql, [...values, taskId]);
    }


    async getTaskById(taskId: number): Promise<TaskCardProps | undefined> {
        const taskSql = `SELECT *
                         FROM tasks
                         WHERE id = ?`;
        const task = await this.db.get(taskSql, [taskId]);
        if (task) {
            return {
                id: task.id,
                text: task.text,
                coins: task.coins,
                checkIcon: task.checkIcon,
                taskType: JSON.parse(task.taskType), // Парсинг taskType
                type: task.type,
                completed: task.completed === 1, // Convert 1 to true and 0 to false
                actionBtnTx: task.actionBtnTx,
                txDescription: task.txDescription
            };
        }
        return undefined;
    }


    async updateTaskCompletion(userId: string, taskId: number, completed: boolean): Promise<void> {
        const updateTaskSql = `
            UPDATE userTasks
            SET completed         = ?,
                lastCompletedDate = ?
            WHERE userId = ?
              AND taskId = ?
        `;
        const getTaskSql = `SELECT coins, type
                            FROM tasks
                            WHERE id = ?`;
        const updateUserCoinsSql = `UPDATE users
                                    SET coins = coins + ?
                                    WHERE userId = ?`;

        const today = new Date().toISOString().split('T')[0];
        const completedDate = completed ? today : null;

        try {
            // Get task details
            const task = await this.db.get(getTaskSql, [taskId]);

            if (completed && task.type === 'DailyTask') {
                await this.db.run(updateTaskSql, [1, completedDate, userId, taskId]);
            } else {
                await this.db.run(updateTaskSql, [completed ? 1 : 0, completedDate, userId, taskId]);
            }

            if (completed) {
                // Update user's coins
                await this.db.run(updateUserCoinsSql, [task.coins, userId]);
            }
        } catch (error) {
            console.error('Error updating task completion:', error);
            throw new Error(`Failed to update task completion: ${error}`);
        }
    }

    async deleteTask(taskId: number): Promise<void> {
        const deleteTaskSql = `DELETE
                               FROM tasks
                               WHERE id = ?`;
        await this.db.run(deleteTaskSql, [taskId]);

        const deleteUserTasksSql = `DELETE
                                    FROM userTasks
                                    WHERE taskId = ?`;
        await this.db.run(deleteUserTasksSql, [taskId]);
    }


    async checkSuccessTask(userId: string, taskId: number) {
        const user = await this.getUserFromIdSimply(userId);
        if (user != undefined) {
            if (user.tasks) {
                const userTask = user.tasks.find(task => task.taskId === taskId);
                if (userTask) {
                    if (IsCheckNftTask(userTask.taskType)) {
                        const resultCheck = await this.checkNftItem(user, userTask);
                        if (resultCheck === "Task completion status updated successfully") {
                            const newUserState = await this.getUserFromIdSimply(userId);
                            return newUserState;
                        } else {
                            return resultCheck;
                        }
                    } else if (IsSubscribeToTg(userTask.taskType)) {
                        const resultCheck = await this.checkSubscribeToTg(user, userTask);
                        if (resultCheck === "Task completion status updated successfully") {
                            const newUserState = await this.getUserFromIdSimply(userId);
                            return newUserState;
                        } else {
                            return resultCheck;
                        }
                    } else if (IsStockReg(userTask.taskType)) {
                        try {
                            const resultCheck = await this.checkStockReg(user, userTask);
                            if (resultCheck === "Task completion status updated successfully") {
                                const newUserState = await this.getUserFromIdSimply(userId);
                                return newUserState;
                            } else {
                                return resultCheck;
                            }
                        } catch (error) {
                            return error;
                        }
                    } else if (IsOpenUrl(userTask.taskType)) {
                        try {
                            const resultCheck = await this.checkOpenUrlReg(user, userTask);
                            if (resultCheck === "Task completion status updated successfully") {
                                const newUserState = await this.getUserFromIdSimply(userId);
                                return newUserState;
                            } else {
                                return resultCheck;
                            }
                        } catch (error) {
                            return error;
                        }
                    }
                } else {
                    return "User task not found";
                }
            }
        }
        return "User not found";
    }


    // task checked method

    async checkSubscribeToTg(user: User, selectedTask: UserTask): Promise<string> {
        if (IsSubscribeToTg(selectedTask.taskType)) {
            const num = parseInt(user.userId, 10);
            const isSubscribed = await isUserSubscribed(755050714, selectedTask.taskType.id);

            if (isSubscribed) {
                console.log('User is subscribed to the channel');
                const resultSendTorequest = await this.updateTaskCompletion(user.userId, selectedTask.taskId, true);
                resultSendTorequest
                return "Task completion status updated successfully";
            } else {
                console.log('User is not subscribed to the channel');
                return "User is not subscribed to the channel";
            }
        } else {
            return "User is not subscribed to the channel";
        }
    }


    async checkNftItem(user: User, selectedTask: UserTask) {
        if (IsCheckNftTask(selectedTask.taskType)) {
            const collectionAddress = selectedTask.taskType.checkCollectionsAddress;

            if (user.address != undefined && user.address !== "") {

                try {
                    const checkResult = await sendToCheckUserHaveNftFromCollections(user.address, collectionAddress);
                    if (checkResult.state) {
                        const resultSendTorequest = await this.updateTaskCompletion(user.userId, selectedTask.taskId, true)
                        resultSendTorequest
                        return "Task completion status updated successfully"
                    }
                } catch (error) {
                    console.error('Error checking NFT:', error);
                    console.error('An error occurred while checking the nft');
                    return "An error occurred while checking the nft"
                }
            } else {
                console.error('You don\'t have a ton wallet address linked');
                return "You don t have a ton wallet address linked"
            }
        }
    };

// протестить завтра
    async checkStockReg(user: User, selectedTask: UserTask) {
        if (IsStockReg(selectedTask.taskType)) {
            const currentDate = new Date();

            // Получение данных задачи пользователя
            const userTaskSql = `
                SELECT *
                FROM userTasks
                WHERE userId = ?
                  AND taskId = ?
            `;

            const userTask = await this.db.get(userTaskSql, [user.userId, selectedTask.taskId]);

            if (!userTask) {
                throw new Error('Task not found for the user.');
            }

            let {etaps, dataSendCheck} = userTask;

            // Если etaps или dataSendCheck равны null, считаем, что задача не начата
            if (etaps === null || dataSendCheck === null) {
                etaps = 0;
                dataSendCheck = currentDate.toISOString();
            }

            if (etaps === 0) {
                // Перевод на этап 1 и сохранение текущей даты
                await this.updateUserTask(user.userId, selectedTask.taskId, {
                    etaps: 1,
                    dataSendCheck: currentDate.toISOString(),
                });
                return "Task completion status updated successfully"

            } else if (etaps === 1) {
                // Проверка, прошло ли больше 24 часов с момента сохраненной даты
                const savedDate = new Date(dataSendCheck);
                const nextDay = new Date(savedDate);
                nextDay.setDate(savedDate.getDate() + 1);
                console.error("nextDay - ", nextDay)
                if (currentDate > nextDay) {
                    // Перевод на этап 2
                    console.error("перевод на newDay ")
                    await this.updateUserTask(user.userId, selectedTask.taskId, {etaps: 2});
                    return "Task completion status updated successfully"
                } else {
                    console.error("less than 24 hours have passed since the last update. ")
                    throw new Error('Less than 24 hours have passed since the last update.');
                }

            } else if (etaps === 2) {
                // Перевод на этап 3 и сохранение текущей даты
                await this.updateUserTask(user.userId, selectedTask.taskId, {
                    etaps: 3,
                    dataSendCheck: currentDate.toISOString(),
                });
                return "Task completion status updated successfully"

            } else if (etaps === 3) {
                // Проверка, прошло ли больше 24 суток с момента сохраненной даты
                const savedDate = new Date(dataSendCheck);
                const nextMonth = new Date(savedDate);
                nextMonth.setDate(savedDate.getDate() + 1);
                if (currentDate > nextMonth) {
                    // Завершение задачи и перевод на этап 4
                    await this.updateUserTask(user.userId, selectedTask.taskId, {
                        etaps: 4,
                    });

                    await this.updateTaskCompletion(user.userId, selectedTask.taskId, true)

                    return "Task completion status updated successfully"
                } else {
                    throw new Error('Less than 24 days have passed since the last update.');
                }
            }
        } else {
        }
    }

    async checkOpenUrlReg(user: User, selectedTask: UserTask) {
        if (IsOpenUrl(selectedTask.taskType)) {
            const currentDate = new Date();

            // Получение данных задачи пользователя
            const userTaskSql = `
                SELECT *
                FROM userTasks
                WHERE userId = ?
                  AND taskId = ?
            `;

            const userTask = await this.db.get(userTaskSql, [user.userId, selectedTask.taskId]);

            if (!userTask) {
                throw new Error('Task not found for the user.');
            }

            let {etaps, dataSendCheck} = userTask;

            // Если etaps или dataSendCheck равны null, считаем, что задача не начата
            if (etaps === null || dataSendCheck === null) {
                etaps = 0;
                dataSendCheck = currentDate.toISOString();
            }

            if (etaps === 0) {
                // Перевод на этап 1 и сохранение текущей даты
                await this.updateUserTask(user.userId, selectedTask.taskId, {
                    etaps: 1,
                    dataSendCheck: currentDate.toISOString(),
                });
                return "Task completion status updated successfully"

            } else if (etaps === 1) {
                // Проверка, прошло ли больше 24 часов с момента сохраненной даты
                const savedDate = new Date(dataSendCheck);
                const nextDay = new Date(savedDate);
                nextDay.setDate(savedDate.getDate() + 1);
                console.error("nextDay - ", nextDay)
                if (currentDate > nextDay) {
                    // Завершение задачи и перевод на этап 4
                    await this.updateUserTask(user.userId, selectedTask.taskId, {
                        completed: true,
                        etaps: 4,
                    });
                    return "Task completion status updated successfully"
                } else {
                    throw new Error('Less than 24 days have passed since the last update.');
                }

            }
        }
    }


    async updateUserTask(userId: string, taskId: number, updatedFields: Partial<UserTask>): Promise<void> {
        const fieldsToUpdate = Object.keys(updatedFields).map(field => `${field} = ?`).join(', ');
        const values = Object.values(updatedFields);
        const updateSql = `
            UPDATE userTasks
            SET ${fieldsToUpdate}
            WHERE userId = ?
              AND taskId = ?
        `;
        await this.db.run(updateSql, [...values, userId, taskId]);
    }


    async getUserFromIdSimply(userId: string): Promise<User | undefined> {
        const userSql = `SELECT *
                         FROM users
                         WHERE userId = ?`;
        const user = await this.db.get(userSql, [userId]);

        if (user) {
            const tasksSql = `SELECT taskId
                              FROM completedTasks
                              WHERE userId = ?`;
            const tasks = await this.db.all(tasksSql, [userId]);

            const boostsSql = `
                SELECT b.boostName, ub.level, b.price
                FROM userBoosts ub
                         JOIN boosts b ON ub.boostName = b.boostName
                WHERE ub.userId = ?
            `;
            const boosts = await this.db.all(boostsSql, [userId]);

            user.boosts = boosts.map(boost => ({
                boostName: boost.boostName,
                level: boost.level,
                price: boost.price * Math.pow(2, boost.level - 1) // Цена увеличивается в 2 раза за каждый уровень
            }));

            const tapBoost = user.boosts.find((boost: UserBoost) => boost.boostName === 'tapBoot');
            if (tapBoost) {
                if (!user.lastTapBootUpdate) {
                    // user.lastTapBootUpdate = new Date().toISOString();
                } else {
                    await this.updateCoinsWithTapBoot(userId, tapBoost.level, user.lastTapBootUpdate);
                }
            }

            console.error("tapBoost - ", tapBoost)

            const inviteesSql = `
                SELECT u.userId, u.userName, ui.coinsReferral
                FROM users u
                         JOIN user_invitations ui ON u.userId = ui.invitee_id
                WHERE ui.inviter_id = ?
            `;
            const invitees = await this.db.all(inviteesSql, [userId]);

            const userTasksSql = `
                SELECT t.id AS taskId,
                       t.text,
                       t.coins,
                       t.checkIcon,
                       t.taskType,
                       t.type,
                       ut.completed,
                       ut.lastCompletedDate,
                       ut.actionBtnTx,
                       ut.txDescription,
                       ut.dataSendCheck,
                       ut.isLoading,
                       ut.etTx,
                       ut.etaps
                FROM tasks t
                         JOIN userTasks ut ON t.id = ut.taskId
                WHERE ut.userId = ?
            `;
            let userTasks = await this.db.all(userTasksSql, [userId]);

            const today = new Date().toISOString().split('T')[0];

            userTasks = await Promise.all(userTasks.map(async (task) => {
                if (task.type === 'DailyTask' && task.lastCompletedDate !== today) {
                    await this.db.run(
                        `UPDATE userTasks
                         SET completed         = 0,
                             lastCompletedDate = ?
                         WHERE userId = ?
                           AND taskId = ?`,
                        [today, userId, task.taskId]
                    );
                    task.completed = false;
                    task.lastCompletedDate = today;
                }

                return {
                    taskId: task.taskId,
                    text: task.text,
                    coins: task.coins,
                    checkIcon: task.checkIcon,
                    taskType: JSON.parse(task.taskType),
                    type: task.type,
                    completed: task.completed === 1, // Convert 1 to true and 0 to false
                    lastCompletedDate: task.lastCompletedDate,
                    actionBtnTx: task.actionBtnTx,
                    txDescription: task.txDescription,
                    dataSendCheck: task.dataSendCheck,
                    isLoading: task.isLoading === 1, // Convert 1 to true and 0 to false
                    etTx: task.etTx,
                    etaps: task.etaps
                };
            }));


            // Снова извлечем обновленные задачи
            userTasks = await this.db.all(userTasksSql, [userId]);

            const formattedTasks = await Promise.all(userTasks.map(async (task) => {
                return {
                    taskId: task.taskId,
                    text: task.text,
                    coins: task.coins,
                    checkIcon: task.checkIcon,
                    taskType: JSON.parse(task.taskType),
                    type: task.type,
                    completed: task.completed === 1, // Convert 1 to true and 0 to false
                    lastCompletedDate: task.lastCompletedDate,
                    actionBtnTx: task.actionBtnTx,
                    txDescription: task.txDescription,
                    dataSendCheck: task.dataSendCheck,
                    isLoading: task.isLoading === 1, // Convert 1 to true and 0 to false
                    etTx: task.etTx,
                    etaps: task.etaps
                };
            }));

            const energyBoost = user.boosts.find((boost: UserBoost) => boost.boostName === 'energy limit');
            const newMaxEnergy = energyBoost ? 1000 + (energyBoost.level - 1) * 500 : 1000;

            // Если maxEnergy в базе данных равно 0, обновляем его
            if (user.maxEnergy === 0) {
                user.maxEnergy = newMaxEnergy;
                const updateMaxEnergySql = `UPDATE users
                                            SET maxEnergy = ?
                                            WHERE userId = ?`;
                await this.db.run(updateMaxEnergySql, [newMaxEnergy, userId]);
            } else {
                user.maxEnergy = Math.max(user.maxEnergy, newMaxEnergy); // Обновляем maxEnergy только если новое значение больше
            }

            return {
                ...user,
                completedTasks: tasks.map(task => task.taskId),
                boosts: user.boosts,
                listUserInvited: invitees,
                tasks: formattedTasks
            };
        }

        return undefined;
    }


}

export default UserController;
