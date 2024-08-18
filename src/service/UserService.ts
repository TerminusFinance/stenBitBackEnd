// services/UserService.ts
import mysql, { Connection } from 'mysql2/promise';
import {
    Boost,
    CompletedTask,
    Invitations,
    InvitedUser,
    Task,
    User,
    UserBoost,
    UserTask,
    UserTaskFormated
} from "../types/Types";
import PremiumController from "../controllers/premiumController";
import TaskService from "./TaskService";
import taskService from "./TaskService";
import clanController from "../controllers/clanController";
import {FieldPacket} from "mysql2";

class UserService {
    private taskService!: TaskService;

    constructor(private db: Connection) {}

    setTaskService(taskService: TaskService) {
        this.taskService = taskService;
    }

    private generateUniqueCodeToInvite(): string {
        return `UC_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
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

            await this.db.execute(createUserSql, [
                userId,
                userName,
                coins,
                codeToInvite,
                address || null,
                '', // assuming referral is always an empty string
                createAt,
                dataUpdate
            ]);

            // Инициализация бустов для нового пользователя
            const boosts = [
                { boostName: 'multitap', level: 1, price: 2000 },
                { boostName: 'energy limit', level: 1, price: 1500 },
                { boostName: 'tapBoot', level: 1, price: 3500 },
                { boostName: 'turbo', level: 1, price: 5000 }
            ];

            const insertUserBoostSql = `INSERT INTO userBoosts (userId, boostName, level)
                                    VALUES (?, ?, ?)`;
            for (const boost of boosts) {
                await this.db.execute(insertUserBoostSql, [userId, boost.boostName, boost.level]);
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
            const [rowsAllTasks] = await this.db.execute(tasksSql);
            const allTasks = rowsAllTasks as Task[]

            const insertUserTaskSql = `
            INSERT INTO userTasks (userId, taskId, text, coins, checkIcon, taskType, type, completed,
                                   lastCompletedDate, actionBtnTx, txDescription)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, null, ?, ?)
        `;
            for (const task of allTasks) {
                await this.db.execute(insertUserTaskSql, [
                    userId,
                    task.id,
                    task.text,
                    task.coins,
                    task.checkIcon || null,
                    task.taskType || null,
                    task.type,
                    task.actionBtnTx || null,
                    task.txDescription || null
                ]);
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



    async addCoinsAndDeductEnergy(userId: string, coins: number): Promise<{ newEnergy: number, coins: number }> {

        if(coins <= 0) {
            throw new Error("Coins must be greater than 0");
        }

        const userSql = `
    SELECT u.*,
           p.endDateOfWork,
           ub.level AS turboLevel,
           ub.lastTurboBoostUpgrade,
           elb.level AS energyLimitLevel
    FROM users u
    LEFT JOIN premium p ON u.userId = p.userId
    LEFT JOIN userBoosts ub ON u.userId = ub.userId AND ub.boostName = 'turbo'
    LEFT JOIN userBoosts elb ON u.userId = elb.userId AND elb.boostName = 'multitap'
    WHERE u.userId = ?
`;
        const [rows] = await this.db.execute(userSql, [userId]);

        const user = (rows as any[])[0];

        if (!user) {
            throw new Error('User not found');
        }

        // Проверка наличия премиум-подписки
        let energyRecoveryRate = 1;
        if (user.endDateOfWork) {
            const endDateOfWork = new Date(user.endDateOfWork);
            const currentDate = new Date();
            if (endDateOfWork >= currentDate) {
                energyRecoveryRate = 2; // Увеличиваем скорость восстановления энергии для премиум-пользователей
            }
        }

        // Calculate energy recovery
        const currentTime = new Date();
        const lastUpdate = user.dataUpdate ? new Date(user.dataUpdate) : new Date();
        const elapsedSeconds = Math.floor((currentTime.getTime() - lastUpdate.getTime()) / 1000);
        const recoveredEnergy = elapsedSeconds * energyRecoveryRate;
        user.currentEnergy = Math.min(user.maxEnergy, user.currentEnergy + recoveredEnergy);

        // Update the user's currentEnergy and dataUpdate in the database
        const updateEnergySql = `UPDATE users
                             SET currentEnergy = ?,
                                 dataUpdate    = ?
                             WHERE userId = ?`;
        await this.db.execute(updateEnergySql, [user.currentEnergy, currentTime.toISOString(), userId]);

        // Проверка на активный турбобуст
        const isTurboBoostActive = user.lastTurboBoostUpgrade &&
            new Date(user.lastTurboBoostUpgrade).getTime() + 60000 > currentTime.getTime();

        console.log("user.energyLimitLevel - ", user.energyLimitLevel)
        const maxCoinsChanged = isTurboBoostActive
            ? 3000 * 2 * user.energyLimitLevel
            : user.currentEnergy * (user.energyLimitLevel || 1);  // Используем energyLimitLevel, если он существует
        console.log("maxCoinsChanged - ", maxCoinsChanged)
        console.log("coin to add - ", coins)
        // Если турбобуст не активен, проверяем и списываем энергию
        if (!isTurboBoostActive) {
            if (coins > maxCoinsChanged) {
                throw new Error('The user cannot get that many coins');
            }
            if (user.currentEnergy < coins) {
                throw new Error('The user cannot get that many coins due to energy limits');
            }

            user.currentEnergy = Math.max(0, user.currentEnergy - coins);
        } else {
            if (coins > maxCoinsChanged) {
                throw new Error('The user cannot get that many coins');
            }
        }

        const newCoins = user.coins + coins;
        const updateUserSql = `UPDATE users
                           SET coins         = ?,
                               currentEnergy = ?
                           WHERE userId = ?`;
        await this.db.execute(updateUserSql, [newCoins, user.currentEnergy, userId]);

        // Обработка реферальной системы
        if (user.referral) {
            const referralSql = `SELECT * FROM users WHERE codeToInvite = ?`;
            const [referralRows] = await this.db.execute(referralSql, [user.referral]);
            const inviter = (referralRows as any[])[0];
            if (inviter) {
                const originalThousands = Math.floor(user.coins / 1000);
                const updatedThousands = Math.floor(newCoins / 1000);
                if (updatedThousands > originalThousands) {
                    const additionalCoins = (updatedThousands - originalThousands) * 100;
                    const updateInviterCoinsSql = `UPDATE users
                                               SET coins = coins + ?
                                               WHERE userId = ?`;
                    await this.db.execute(updateInviterCoinsSql, [additionalCoins, inviter.userId]);

                    const updateInvitationSql = `
                INSERT INTO user_invitations (inviter_id, invitee_id, coinsReferral)
                VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE
                    coinsReferral = coinsReferral + VALUES(coinsReferral)
            `;
                    await this.db.execute(updateInvitationSql, [inviter.userId, userId, additionalCoins]);
                }
            }
        }

        return { newEnergy: user.currentEnergy, coins: newCoins };
    }




    async getUserFromId(userId: string, imageAvatar: string | null): Promise<User | undefined> {
        console.log("вызван getUserFromId")
        const userSql = `SELECT *
                         FROM users
                         WHERE userId = ?`;
        const [rowsUser] = await this.db.execute(userSql, [userId]);

        // Извлечение первого пользователя из массива строк
        const user = (rowsUser as any[])[0];
        const currentTime = new Date();

        if (user) {
            // Check and update imageAvatar if necessary
            if (imageAvatar !== null && imageAvatar !== user.imageAvatar) {
                user.imageAvatar = imageAvatar;
                const updateAvatarSql = `UPDATE users
                                         SET imageAvatar = ?
                                         WHERE userId = ?`;
                await this.db.execute(updateAvatarSql, [imageAvatar, userId]);
            }

            // Fetch user's completed tasks
            const tasksSql = `SELECT taskId
                              FROM completedTasks
                              WHERE userId = ?`;
            const [rowTasks] = await this.db.execute(tasksSql, [userId]);
            const tasks = rowTasks as UserTaskFormated[]


            // Fetch user's boosts
            const boostsSql = `
                SELECT b.boostName, ub.level, b.price
                FROM userBoosts ub
                         JOIN boosts b ON ub.boostName = b.boostName
                WHERE ub.userId = ?
            `;
            const [rowBoosts] = await this.db.execute(boostsSql, [userId]);

            const boosts = rowBoosts as Boost[]

            user.boosts = boosts.map(boost => ({
                boostName: boost.boostName,
                level: boost.boostName === "turbo" ? 1 : boost.level,
                price: boost.boostName === "turbo" ? boost.price : boost.price * Math.pow(2, boost.level - 1)
            }));

            // Handle tapBoost logic
            const tapBoost = user.boosts.find((boost: UserBoost) => boost.boostName === 'tapBoot');
            if (tapBoost) {
                if (!user.lastTapBootUpdate) {
                    user.lastTapBootUpdate = currentTime.toISOString();
                } else {
                    const newCoins = await this.updateCoinsWithTapBoot(userId, tapBoost.level, user.lastTapBootUpdate);
                    user.coins = newCoins;
                }
            }

            // Fetch user's invited users
            const inviteesSql = `
                SELECT u.userId, u.userName, ui.coinsReferral
                FROM users u
                         JOIN user_invitations ui ON u.userId = ui.invitee_id
                WHERE ui.inviter_id = ?
            `;
            const [rowInvitees] = await this.db.execute(inviteesSql, [userId]);
            const invitees = rowInvitees as Invitations[]

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
            let [rowUserTasks] = await this.db.execute(userTasksSql, [userId]);
            let userTasks = rowUserTasks as UserTaskFormated[]

            const today = new Date().toISOString().split('T')[0];
            userTasks = await Promise.all(userTasks.map(async (task) => {
                // if (task.type === 'DailyTask' && task.lastCompletedDate !== today) {
                //     await this.db.execute(
                //         `UPDATE userTasks
                //          SET completed         = 0,
                //              lastCompletedDate = ?
                //          WHERE userId = ?
                //            AND taskId = ?`,
                //         [today, userId, task.taskId]
                //     );
                //     // task.completed = false;
                //     task.lastCompletedDate = today;
                // }

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
            await this.taskService.checkAndUpdateTasksForUser(userId);

            // Снова извлечем обновленные задачи
            let [rowUserTasksUpdate] = await this.db.execute(userTasksSql, [userId]);
            userTasks = rowUserTasksUpdate as UserTaskFormated[]

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
                user.maxEnergy = newMaxEnergy;
                const updateMaxEnergySql = `UPDATE users
                                            SET maxEnergy = ?
                                            WHERE userId = ?`;
                await this.db.execute(updateMaxEnergySql, [newMaxEnergy, userId]);
            } else {
                const newEnergy = newMaxEnergy;
                if (user.maxEnergy != newEnergy) {
                    const updateMaxEnergySql = `UPDATE users
                                                SET maxEnergy = ?
                                                WHERE userId = ?`;
                    await this.db.execute(updateMaxEnergySql, [newEnergy, userId]);
                }
                user.maxEnergy = newEnergy;
            }

            // Fetch user's premium subscription details
            // const premiumSql = `-- SELECT amountSpent, endDateOfWork FROM premium WHERE userId = ?`;
            // const premium = await this.db.get(premiumSql, [userId]);
            const premController = new PremiumController(this.db)
            const premUser = await premController.getPremiumUsers(userId)


            // Проверка наличия премиум-подписки
            let energyRecoveryRate = 1;
            if (premUser?.endDateOfWork != undefined) {
                const endDateOfWork = new Date(premUser.endDateOfWork);
                const currentDate = new Date();
                if (endDateOfWork >= currentDate) {
                    energyRecoveryRate = 2; // Увеличиваем скорость восстановления энергии для премиум-пользователей
                }
            }

            // Calculate energy recovery
            const lastUpdate = user.dataUpdate ? new Date(user.dataUpdate) : new Date();
            const elapsedSeconds = Math.floor((currentTime.getTime() - lastUpdate.getTime()) / 1000);
            const recoveredEnergy = elapsedSeconds * energyRecoveryRate;
            user.currentEnergy = Math.min(user.maxEnergy, user.currentEnergy + recoveredEnergy);
            // Update the user's currentEnergy and dataUpdate in the database
            const updateEnergySql = `UPDATE users
                                     SET currentEnergy = ?,
                                         dataUpdate    = ?
                                     WHERE userId = ?`;
            await this.db.execute(updateEnergySql, [user.currentEnergy, currentTime.toISOString(), userId]);
            console.log("user.dataUpdate - ",user.dataUpdate)
            return {
                ...user,
                completedTasks: tasks.map(task => task.taskId),
                boosts: user.boosts,
                listUserInvited: invitees,
                tasks: formattedTasks,
                premium: premUser ? {
                    amountSpent: premUser.amountSpent,
                    endDateOfWork: premUser.endDateOfWork
                } : null
            };
        }

        return undefined;
    }


    async getUserById(userId: string): Promise<User | undefined> {
        const getUserSql = 'SELECT * FROM users WHERE userId = ?';
        const [rows] = await this.db.execute<mysql.RowDataPacket[]>(getUserSql, [userId]);
        const user = rows[0];
        // const user = await this.db.execute(getUserSql, [userId]);
        return user as User | undefined;
    }

    async updateUser(userId: string, updatedData: Partial<User>): Promise<User | undefined> {
        const { userName, coins, address, referral, currentEnergy, maxEnergy } = updatedData;
        const updateDate = new Date().toISOString();

        // Построение динамического SQL-запроса и массива параметров
        let updateUserSql = `
    UPDATE users
    SET dataUpdate = ?,
        lastTapBootUpdate = ?`;
        const params: (string | number)[] = [updateDate, updateDate];

        if (userName !== undefined) {
            updateUserSql += `, userName = ?`;
            params.push(userName);
        }
        if (coins !== undefined) {
            updateUserSql += `, coins = ?`;
            params.push(coins);
        }
        if (address !== undefined) {
            updateUserSql += `, address = ?`;
            params.push(address);
        }
        if (referral !== undefined) {
            updateUserSql += `, referral = ?`;
            params.push(referral);
        }
        if (currentEnergy !== undefined) {
            updateUserSql += `, currentEnergy = ?`;
            params.push(currentEnergy);
        }
        if (maxEnergy !== undefined) {
            updateUserSql += `, maxEnergy = ?`;
            params.push(maxEnergy);
        }

        updateUserSql += ` WHERE userId = ?`;
        params.push(userId);

        try {
            const originalUser = await this.getUserById(userId);
            if (!originalUser) {
                throw new Error('User not found');
            }

            await this.db.execute(updateUserSql, params);

            const updatedUser = await this.getUserById(userId);
            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }

            // Проверка и обновление монет пригласившего пользователя
            if (updatedUser.referral) {
                const referralSql = `SELECT * FROM users WHERE codeToInvite = ?`;
                const [inviterRows]: [any[], any] = await this.db.execute(referralSql, [updatedUser.referral]);
                const inviter = inviterRows[0];

                if (inviter) {
                    const updatedCoins = updatedUser.coins || 0;
                    const originalThousands = Math.floor((originalUser.coins || 0) / 1000);
                    const updatedThousands = Math.floor(updatedCoins / 1000);

                    if (updatedThousands > originalThousands) {
                        const additionalCoins = (updatedThousands - originalThousands) * 100;
                        const updateInviterCoinsSql = `UPDATE users SET coins = coins + ? WHERE userId = ?`;
                        await this.db.execute(updateInviterCoinsSql, [additionalCoins, inviter.userId]);

                        const updateInvitationSql = `
                    INSERT INTO user_invitations (inviter_id, invitee_id, coinsReferral)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE coinsReferral = coinsReferral + VALUES(coinsReferral)
                `;
                        await this.db.execute(updateInvitationSql, [inviter.userId, userId, additionalCoins]);
                    }
                }
            }

            return updatedUser;
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error(`Failed to update user: ${error}`);
        }
    }



    async updateBoost(userId: string, boostName: string): Promise<{ user: User; boostEndTime?: string } | undefined> {
        try {
            const boostSql = `SELECT * FROM boosts WHERE boostName = ?`;
            const [boostResult] = await this.db.execute(boostSql, [boostName]) as [Boost[], FieldPacket[]];
            const boost = boostResult[0]; // Извлекаем первый элемент из массива

            if (!boost) {
                throw new Error('Invalid boost name');
            }

            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const userBoostSql = `SELECT * FROM userBoosts WHERE userId = ? AND boostName = ?`;
            const [userBoostResult] = await this.db.execute(userBoostSql, [userId, boostName]) as [UserBoost[], FieldPacket[]];
            let userBoost = userBoostResult[0]; // Извлекаем первый элемент из массива

            let boostEndTime: string | undefined;
            const priceSelectedBoost = boostName === "turbo" ? boost.price : boost.price * Math.pow(2, (userBoost?.level || 1) - 1);

            if (!userBoost) {
                const insertUserBoostSql = `INSERT INTO userBoosts (userId, boostName, level, turboBoostUpgradeCount, lastTurboBoostUpgrade)
                                        VALUES (?, ?, 1, 0, NULL)`;
                await this.db.execute(insertUserBoostSql, [userId, boostName]);
                userBoost = { price: boost.price, boostName: boostName, level: 1, turboBoostUpgradeCount: 0, lastTurboBoostUpgrade: null };
            } else {
                if (userBoost.level == 50) {
                    throw new Error('Max level limits');
                }

                if (priceSelectedBoost > user.coins) {
                    throw new Error('You don\'t have enough money');
                }

                if (boostName === 'turbo') {
                    const newCoins = user.coins - priceSelectedBoost;
                    if (newCoins < 0) {
                        throw new Error('Not enough coins');
                    }

                    await this.updateUser(userId, { coins: newCoins });
                    await this.db.execute(
                        `UPDATE userBoosts SET level = level + 1 WHERE userId = ? AND boostName = ?`,
                        [userId, boostName]
                    );
                    const now = new Date();
                    const today = now.toISOString().split('T')[0];
                    const lastUpgradeDate = userBoost.lastTurboBoostUpgrade ? new Date(userBoost.lastTurboBoostUpgrade).toISOString().split('T')[0] : null;

                    const premController = new PremiumController(this.db);
                    const premUser = await premController.getPremiumUsers(userId);

                    let energyRecoveryRate = 2;
                    if (premUser?.endDateOfWork != null) {
                        const endDateOfWork = new Date(premUser.endDateOfWork);
                        const currentDate = new Date();
                        if (endDateOfWork >= currentDate) {
                            energyRecoveryRate = 3;
                        }
                    }

                    if (userBoost.turboBoostUpgradeCount !== undefined) {
                        if (lastUpgradeDate === today && userBoost.turboBoostUpgradeCount >= energyRecoveryRate) {
                            throw new Error('Turbo boost can only be upgraded twice per day');
                        }
                    }

                    if (lastUpgradeDate !== today) {
                        userBoost.turboBoostUpgradeCount = 0;
                    }

                    userBoost.turboBoostUpgradeCount = (userBoost.turboBoostUpgradeCount ?? 0) + 1;
                    userBoost.lastTurboBoostUpgrade = now.toISOString();

                    const boostDuration = 60000; // 1 минута
                    const endTime = new Date(now.getTime() + boostDuration);
                    boostEndTime = endTime.toISOString();

                    await this.db.execute(
                        `UPDATE userBoosts SET turboBoostUpgradeCount = ?, lastTurboBoostUpgrade = ? WHERE userId = ? AND boostName = ?`,
                        [userBoost.turboBoostUpgradeCount, userBoost.lastTurboBoostUpgrade, userId, boostName]
                    );

                    setTimeout(async () => {
                        await this.db.execute(`UPDATE userBoosts SET level = 1 WHERE userId = ? AND boostName = ?`, [userId, boostName]);
                        userBoost.level -= 1;
                    }, boostDuration);

                    const updatedUser = await this.getUserFromId(userId, null);;
                    if (!updatedUser) {
                        throw new Error('Failed to fetch updated user');
                    }

                    return { user: updatedUser, boostEndTime };

                } else {
                    const newCoins = user.coins - priceSelectedBoost;
                    if (newCoins < 0) {
                        throw new Error('Not enough coins');
                    }

                    await this.updateUser(userId, { coins: newCoins });
                    await this.db.execute(
                        `UPDATE userBoosts SET level = level + 1 WHERE userId = ? AND boostName = ?`,
                        [userId, boostName]
                    );
                    userBoost.level += 1;

                    if (boostName === 'energy limit') {
                        let newMaxEnergy = user.maxEnergy || 1000;
                        newMaxEnergy += 500;
                        await this.updateUser(userId, { maxEnergy: newMaxEnergy });
                    }

                    const updatedUser = await this.getUserFromId(userId, null);;
                    if (!updatedUser) {
                        throw new Error('Failed to fetch updated user');
                    }

                    return { user: updatedUser, boostEndTime };
                }
            }

            const updatedUser = await this.getUserFromId(userId, null);;
            if (!updatedUser) {
                throw new Error('Failed to fetch updated user');
            }

            return { user: updatedUser, boostEndTime };

        } catch (error) {
            console.error('Ошибка при обновлении буста:', error);
            throw new Error(`Failed to update boost: ${error}`);
        }
    }



    async getUserFromIdSimply(userId: string): Promise<User | undefined> {
        const userSql = `
            SELECT u.*, p.endDateOfWork
            FROM users u
                     LEFT JOIN premium p ON u.userId = p.userId
            WHERE u.userId = ?
        `;

        const [userRows] = await this.db.execute<mysql.RowDataPacket[]>(userSql, [userId]);
        const user = (userRows as any[])[0];

        if (user) {


            // Проверка наличия премиум-подписки
            let energyRecoveryRate = 1;
            if (user.endDateOfWork) {
                const endDateOfWork = new Date(user.endDateOfWork);
                const currentDate = new Date();
                if (endDateOfWork >= currentDate) {
                    energyRecoveryRate = 2; // Увеличиваем скорость восстановления энергии для премиум-пользователей
                }
            }

            // Calculate energy recovery
            const currentTime = new Date();
            const lastUpdate = user.dataUpdate ? new Date(user.dataUpdate) : new Date();
            const elapsedSeconds = Math.floor((currentTime.getTime() - lastUpdate.getTime()) / 1000);
            const recoveredEnergy = elapsedSeconds * energyRecoveryRate;
            user.currentEnergy = Math.min(user.maxEnergy, user.currentEnergy + recoveredEnergy);

            // Update the user's currentEnergy and dataUpdate in the database
            const updateEnergySql = `UPDATE users
                  SET currentEnergy = ?,
                      dataUpdate    = ?
                  WHERE userId = ?`;
            await this.db.execute(updateEnergySql, [user.currentEnergy, currentTime.toISOString(), userId]);

            const tasksSql = `SELECT taskId FROM completedTasks WHERE userId = ?`;
            const [taskRows] = await this.db.execute<mysql.RowDataPacket[]>(tasksSql, [userId]);
            const tasks = taskRows as CompletedTask[];

            const boostsSql = `
            SELECT b.boostName, ub.level, b.price
            FROM userBoosts ub
            JOIN boosts b ON ub.boostName = b.boostName
            WHERE ub.userId = ?
        `;
            const [boostRows] = await this.db.execute<mysql.RowDataPacket[]>(boostsSql, [userId]);
            const boosts = boostRows as UserBoost[];

            user.boosts = boosts.map(boost => ({
                boostName: boost.boostName,
                level: boost.level,
                price: boost.price * Math.pow(2, boost.level - 1)
            }));

            const inviteesSql = `
            SELECT u.userId, u.userName, ui.coinsReferral
            FROM users u
            JOIN user_invitations ui ON u.userId = ui.invitee_id
            WHERE ui.inviter_id = ?
        `;
            const [inviteeRows] = await this.db.execute<mysql.RowDataPacket[]>(inviteesSql, [userId]);
            const invitees = inviteeRows as InvitedUser[];

            const userTasksSql = `
            SELECT t.id AS taskId, t.text, t.coins, t.checkIcon, t.taskType, t.type, ut.completed, ut.lastCompletedDate,
                   ut.actionBtnTx, ut.txDescription, ut.dataSendCheck, ut.isLoading, ut.etTx, ut.etaps
            FROM tasks t
            JOIN userTasks ut ON t.id = ut.taskId
            WHERE ut.userId = ?
        `;
            let [userTaskRows] = await this.db.execute<mysql.RowDataPacket[]>(userTasksSql, [userId]);
            let userTasks = userTaskRows as UserTaskFormated[];

            const today = new Date().toISOString().split('T')[0];

            const updatedTasks = await Promise.all(userTasks.map(async (task) => {
                // if (task.type === 'DailyTask' && task.lastCompletedDate !== today) {
                //     await this.db.execute(
                //         `UPDATE userTasks SET completed = 0, lastCompletedDate = ? WHERE userId = ? AND taskId = ?`,
                //         [today, userId, task.taskId]
                //     );
                //     task.completed = 0;
                //     task.lastCompletedDate = today;
                // }

                return {
                    taskId: task.taskId,
                    text: task.text,
                    coins: task.coins,
                    checkIcon: task.checkIcon,
                    taskType: JSON.parse(task.taskType),
                    type: task.type,
                    completed: task.completed === 1,
                    lastCompletedDate: task.lastCompletedDate,
                    actionBtnTx: task.actionBtnTx,
                    txDescription: task.txDescription,
                    dataSendCheck: task.dataSendCheck,
                    isLoading: task.isLoading === 1,
                    etTx: task.etTx,
                    etaps: task.etaps
                };
            }));

            // Снова извлечем обновленные задачи
            const [userTasksResult] = await this.db.execute<mysql.RowDataPacket[]>(userTasksSql, [userId]);
            userTasks = userTasksResult as UserTaskFormated[];

            const formattedTasks: UserTask[] = updatedTasks.map((task) => {
                return {
                    taskId: task.taskId,
                    text: task.text,
                    coins: task.coins,
                    checkIcon: task.checkIcon,
                    taskType: task.taskType,
                    type: task.type,
                    completed: task.completed,
                    lastCompletedDate: task.lastCompletedDate,
                    actionBtnTx: task.actionBtnTx,
                    txDescription: task.txDescription,
                    dataSendCheck: task.dataSendCheck,
                    isLoading: task.isLoading,
                    etTx: task.etTx,
                    etaps: task.etaps
                };
            });
            const energyBoost = user.boosts.find((boost: UserBoost) => boost.boostName === 'energy limit');
            const newMaxEnergy = energyBoost ? 1000 + (energyBoost.level - 1) * 500 : 1000;

            // Если maxEnergy в базе данных равно 0, обновляем его
            if (user.maxEnergy === 0) {
                user.maxEnergy = newMaxEnergy;
                const updateMaxEnergySql = `UPDATE users SET maxEnergy = ? WHERE userId = ?`;
                await this.db.execute(updateMaxEnergySql, [newMaxEnergy, userId]);
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

    async updateCoinsWithTapBoot(userId: string, tapBootLevel: number, lastTapBootUpdate: string): Promise<number> {
        console.log("Запуск tapBoot:");

        const intervalInSeconds = 2; // Интервал в секундах для добавления монет пользователя

        const lastUpdateTime = new Date(lastTapBootUpdate).getTime();
        const currentTime = new Date().getTime();

        // Определяем время работы механизма на основе уровня tapBoot
        const durationInMinutes = 5 * tapBootLevel;  // Максимальная длительность tapBoot в минутах
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
        SET coins = coins + ?,
            lastTapBootUpdate = ?
        WHERE userId = ?
    `;
        await this.db.execute(newCoinsSql, [coinsToAdd, new Date().toISOString(), userId]);

        // Получаем обновленное количество монет
        const getCoinsSql = `
        SELECT coins
        FROM users
        WHERE userId = ?
    `;
        const [result] = await this.db.execute<mysql.RowDataPacket[]>(getCoinsSql, [userId]);
        const updatedCoins = result[0]?.coins;

        return updatedCoins;
    }



    async processInvitation(inviteCode: string, newUserId: string, newUserName: string, isPremium: boolean): Promise<User> {
        // Определение типа кода приглашения
        const isClanInvite = inviteCode.startsWith('CL');

        // Проверка наличия приглашающего пользователя по коду приглашения
        const inviterSql = `SELECT * FROM users WHERE codeToInvite = ?`;
        const [inviterRows]: [any[], any] = await this.db.execute(inviterSql, [inviteCode]);
        const inviter = inviterRows[0];

        if (!inviter) {
            throw new Error('User with the given invite code not found');
        }

        // Проверка существования пользователя с данным userId
        const existingUserSql = `SELECT * FROM users WHERE userId = ?`;
        const [existingUserRows]: [any[], any] = await this.db.execute(existingUserSql, [newUserId]);
        const existingUser = existingUserRows[0];

        if (existingUser) {
            if (isClanInvite) {
                // Если код относится к клану и пользователь уже существует, добавляем его в клан
                const controller = new clanController(this.db);
                await controller.addUserToClan(existingUser.userId, inviteCode);
                return existingUser;
            } else {
                throw new Error('User with this userId already exists');
            }
        }

        // Создание нового пользователя
        const codeToInvite = this.generateUniqueCodeToInvite();
        const createAt = new Date().toISOString();
        const dataUpdate = createAt;

        const newUserSql = `
        INSERT INTO users (userId, userName, coins, codeToInvite, address, referral, createAt, dataUpdate, currentEnergy, maxEnergy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1000, 1000)
    `;
        await this.db.execute(newUserSql, [newUserId, newUserName, 0, codeToInvite, '', inviteCode, createAt, dataUpdate]);

        // Если это приглашение для клана, добавляем нового пользователя в клан
        if (isClanInvite) {
            const controller = new clanController(this.db);
            await controller.addUserToClan(newUserId, inviteCode); // Здесь используем newUserId, а не existingUser.userId
        } else {
            // Если это обычное приглашение пользователя, добавляем запись в user_invitations
            const insertInvitationSql = `
            INSERT INTO user_invitations (inviter_id, invitee_id, coinsReferral)
            VALUES (?, ?, 0)
        `;
            await this.db.execute(insertInvitationSql, [inviter.userId, newUserId]);

                const additionalCoins = isPremium ? 2500 : 500;
                const updateInviterCoinsSql = `UPDATE users
                                                   SET coins = coins + ?
                                                   WHERE userId = ?`;
                await this.db.execute(updateInviterCoinsSql, [additionalCoins, inviter.userId]);
                const updateInvitationSql = `
                        INSERT INTO user_invitations (inviter_id, invitee_id, coinsReferral)
                        VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE
                            coinsReferral = coinsReferral + VALUES(coinsReferral)
                    `;
                await this.db.execute(updateInvitationSql, [inviter.userId, newUserId, additionalCoins]);

        }

        // Инициализация бустов для нового пользователя
        const boosts = [
            { boostName: 'multitap', level: 1 },
            { boostName: 'energy limit', level: 1 },
            { boostName: 'tapBoot', level: 1 },
            { boostName: 'turbo', level: 1 }
        ];

        const insertUserBoostSql = `INSERT INTO userBoosts (userId, boostName, level) VALUES (?, ?, ?)`;

        for (const boost of boosts) {
            await this.db.execute(insertUserBoostSql, [newUserId, boost.boostName, boost.level]);
        }

        // Инициализация задач для нового пользователя
        const tasksSql = `SELECT id, text, coins, checkIcon, taskType, type, actionBtnTx, txDescription FROM tasks`;
        const [allTasks]: [any[], any] = await this.db.query(tasksSql);

        const insertUserTaskSql = `
        INSERT INTO userTasks (userId, taskId, text, coins, checkIcon, taskType, type, completed, lastCompletedDate, actionBtnTx, txDescription)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, null, ?, ?)
    `;
        for (const task of allTasks) {
            await this.db.execute(insertUserTaskSql, [newUserId, task.id, task.text, task.coins, task.checkIcon, task.taskType, task.type, task.actionBtnTx, task.txDescription]);
        }

        const user = await this.getUserFromId(newUserId, null);

        if (!user) {
            throw new Error('Failed to retrieve the new user');
        }

        return user;
    }

}

export default UserService;
