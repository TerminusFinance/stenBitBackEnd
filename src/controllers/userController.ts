import { Database } from 'sqlite';

export interface User {
    userId: string;
    userName: string;
    coins: number;
    codeToInvite: string;
    address: string;
    referral: string;
    createAt: string;
    dataUpdate: string;
    currentEnergy: number;
    maxEnergy: number;
    lastTapBootUpdate: string;
    completedTasks?: number[];
    boosts?: UserBoost[];
    listUserInvited?: InvitedUser[];
    tasks?: UserTask[];
}

export interface UserBoost {
    boostName: string;
    level: number;
    price: number;
}

export interface InvitedUser {
    userId: string;
    userName: string;
    coinsReferral: number;
}

export interface UserTask {
    taskId: number;
    text: string;
    coins: number;
    checkIcon: string;
    taskType: TaskType;
    type: string;
    completed: boolean;
    lastCompletedDate?: string | null;
    actionBtnTx?: string | null;
    txDescription?: string | null;
}

export interface TaskCardProps {
    id: number;
    text: string;
    coins: number;
    completed: boolean;
    checkIcon: string;
    taskType: TaskType;
    type: string;
    actionBtnTx?: string | null;
    txDescription?: string | null;
}


export interface SampleTask {
    type: 'Sample';
}

export interface OpenUrlTask {
    type: 'OpenUrl';
    url: string;
}

export interface CheckNftTask {
    type: 'CheckNft';
    checkCollectionsAddress: string;
}

export interface CheckFriendsTask {
    type: 'CheckFriends';
    numberOfFriends: number;
}

export type TaskType = SampleTask | OpenUrlTask | CheckNftTask | CheckFriendsTask;

interface Boost {
    boostName: string;
    description: string;
    level: number;
    price: number;
}

class UserController {
    constructor(private db: Database) {}

    private generateUniqueCodeToInvite(): string {
        return `UNIQUE_CODE_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    async createUser(userId: string, userName: string, coins: number, address: string): Promise<User> {
        try {
            // Проверка, существует ли уже пользователь с таким userId
            const existingUser = await this.getUserFromId(userId);
            if (existingUser) {
                throw new Error(`User with userId ${userId} already exists`);
            }

            const codeToInvite = this.generateUniqueCodeToInvite();
            const createAt = new Date().toISOString();
            const dataUpdate = createAt;

            const createUserSql = `
            INSERT INTO users (userId, userName, coins, codeToInvite, address, referral, createAt, dataUpdate, currentEnergy, maxEnergy) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
        `;
            await this.db.run(createUserSql, [userId, userName, coins, codeToInvite, address, '', createAt, dataUpdate]);

            // Инициализация бустов для нового пользователя
            const boosts = [
                { boostName: 'multitap', level: 1, price: 2000 },
                { boostName: 'energy limit', level: 1, price: 1500 },
                { boostName: 'tapBoot', level: 1, price: 3500 },
                { boostName: 'turbo', level: 1, price: 5000 }
            ];

            const insertUserBoostSql = `INSERT INTO userBoosts (userId, boostName, level) VALUES (?, ?, ?)`;
            for (const boost of boosts) {
                await this.db.run(insertUserBoostSql, [userId, boost.boostName, boost.level]);
                console.log(`Inserted boost for user ${userId}:`, boost);
            }

            // Инициализация задач для нового пользователя
            const tasksSql = `SELECT * FROM tasks`;
            const allTasks = await this.db.all(tasksSql);

            const insertUserTaskSql = `
            INSERT INTO userTasks (userId, taskId, completed, lastCompletedDate, actionBtnTx, txDescription) 
            VALUES (?, ?, 0, null, ?, ?)
        `;
            for (const task of allTasks) {
                await this.db.run(insertUserTaskSql, [userId, task.id, task.actionBtnTx, task.txDescription]);
            }

            const newUser = await this.getUserFromId(userId);
            if (!newUser) {
                throw new Error('Failed to create new user');
            }

            return newUser;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }



    async getUserFromId(userId: string): Promise<User | undefined> {
        const userSql = `SELECT * FROM users WHERE userId = ?`;
        const user = await this.db.get(userSql, [userId]);

        if (user) {
            const tasksSql = `SELECT taskId FROM completedTasks WHERE userId = ?`;
            const tasks = await this.db.all(tasksSql, [userId]);

            const boostsSql = `
            SELECT b.boostName, ub.level, b.price
            FROM userBoosts ub
            JOIN boosts b ON ub.boostName = b.boostName
            WHERE ub.userId = ?
        `;
            const boosts = await this.db.all(boostsSql, [userId]);
            console.log(`Boosts fetched for user ${userId}:`, boosts);
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

            console.error("tapBoost - ",tapBoost)

            const inviteesSql = `
            SELECT u.userId, u.userName, ui.coinsReferral
            FROM users u
            JOIN user_invitations ui ON u.userId = ui.invitee_id
            WHERE ui.inviter_id = ?
        `;
            const invitees = await this.db.all(inviteesSql, [userId]);

            const userTasksSql = `
            SELECT t.id AS taskId, t.text, t.coins, t.checkIcon, t.taskType, t.type, 
                   ut.completed, ut.lastCompletedDate, ut.actionBtnTx, ut.txDescription
            FROM tasks t
            JOIN userTasks ut ON t.id = ut.taskId
            WHERE ut.userId = ?
        `;
            const userTasks = await this.db.all(userTasksSql, [userId]);

            const today = new Date().toISOString().split('T')[0];

            const formattedTasks = await Promise.all(userTasks.map(async (task) => {
                if (task.type === 'DailyTask' && task.lastCompletedDate !== today) {
                    await this.db.run(
                        `UPDATE userTasks SET completed = 0, lastCompletedDate = ? WHERE userId = ? AND taskId = ?`,
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
                    txDescription: task.txDescription
                };
            }));

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
        const { userName, coins, address, referral, currentEnergy, maxEnergy } = updatedData;
        const updateDate = new Date().toISOString();

        const updateUserSql = `
        UPDATE users SET 
            userName = COALESCE(?, userName), 
            coins = COALESCE(?, coins), 
            address = COALESCE(?, address), 
            referral = COALESCE(?, referral), 
            dataUpdate = ?, 
            currentEnergy = COALESCE(?, currentEnergy),
            maxEnergy = COALESCE(?, maxEnergy),
            lastTapBootUpdate = ?
        WHERE userId = ?
        `;

        try {
            const originalUser = await this.getUserById(userId);
            if (!originalUser) {
                throw new Error('User not found');
            }

            const originalCoins = originalUser.coins || 0;
            await this.db.run(updateUserSql, [userName, coins, address, referral, updateDate, currentEnergy, maxEnergy, updateDate, userId]);

            const updatedUser = await this.getUserById(userId);
            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }

            // Проверка и обновление монет пригласившего пользователя
            if (updatedUser.referral) {
                const referralSql = `SELECT * FROM users WHERE codeToInvite = ?`;
                const inviter = await this.db.get(referralSql, [updatedUser.referral]);

                if (inviter) {
                    const updatedCoins = updatedUser.coins || 0;
                    const originalThousands = Math.floor(originalCoins / 1000);
                    const updatedThousands = Math.floor(updatedCoins / 1000);

                    if (updatedThousands > originalThousands) {
                        const additionalCoins = (updatedThousands - originalThousands) * 100;
                        const updateInviterCoinsSql = `UPDATE users SET coins = coins + ? WHERE userId = ?`;
                        await this.db.run(updateInviterCoinsSql, [additionalCoins, inviter.userId]);

                        const updateInvitationSql = `
                        INSERT INTO user_invitations (inviter_id, invitee_id, coinsReferral)
                        VALUES (?, ?, ?)
                        ON CONFLICT(inviter_id, invitee_id) DO UPDATE SET
                            coinsReferral = user_invitations.coinsReferral + excluded.coinsReferral
                        `;
                        await this.db.run(updateInvitationSql, [inviter.userId, userId, additionalCoins]);
                    }
                }
            }

            const returneduser = await this.getUserFromId(userId)

            return returneduser;
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error(`Failed to update user: ${error}`);
        }
    }



    // async updateUser(userId: string, updatedData: Partial<User>): Promise<User | undefined> {
    //     const { userName, coins, address, referral, listUserInvited, currentEnergy, maxEnergy } = updatedData;
    //     const updateDate = new Date().toISOString();
    //
    //     const updateUserSql = `
    //     UPDATE users SET
    //         userName = COALESCE(?, userName),
    //         coins = COALESCE(?, coins),
    //         address = COALESCE(?, address),
    //         referral = COALESCE(?, referral),
    //         dataUpdate = ?,
    //         listUserInvited = COALESCE(?, listUserInvited),
    //         currentEnergy = COALESCE(?, currentEnergy),
    //         maxEnergy = COALESCE(?, maxEnergy),
    //         lastTapBootUpdate = ?
    //     WHERE userId = ?
    // `;
    //
    //     try {
    //         await this.db.run(updateUserSql, [userName, coins, address, referral, updateDate, listUserInvited, currentEnergy, maxEnergy, updateDate, userId]);
    //         return this.getUserById(userId);
    //     } catch (error) {
    //         console.error('Error updating user:', error);
    //         throw new Error(`Failed to update user: ${error}`);
    //     }
    // }


    async processInvitation(inviteCode: string, newUserId: string, newUserName: string): Promise<User> {
        const inviterSql = `SELECT * FROM users WHERE codeToInvite = ?`;
        const inviter = await this.db.get(inviterSql, [inviteCode]);

        if (!inviter) {
            throw new Error('User with the given invite code not found');
        }

        const existingUserSql = `SELECT * FROM users WHERE userId = ?`;
        const existingUser = await this.db.get(existingUserSql, [newUserId]);

        if (existingUser) {
            throw new Error('User with this userId already exists');
        }

        const codeToInvite = this.generateUniqueCodeToInvite();
        const createAt = new Date().toISOString();
        const dataUpdate = createAt;

        const newUserSql = `
        INSERT INTO users (userId, userName, coins, codeToInvite, address, referral, createAt, dataUpdate, currentEnergy, maxEnergy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
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
            { boostName: 'multitap', level: 1 },
            { boostName: 'energy limit', level: 1 },
            { boostName: 'tapBoot', level: 1 },
            { boostName: 'turbo', level: 1 }
        ];

        const insertUserBoostSql = `INSERT INTO userBoosts (userId, boostName, level) VALUES (?, ?, ?)`;

        for (const boost of boosts) {
            await this.db.run(insertUserBoostSql, [newUserId, boost.boostName, boost.level]);
        }

        // Инициализация задач для нового пользователя
        const tasksSql = `SELECT id FROM tasks`;
        const allTasks = await this.db.all(tasksSql);

        const insertUserTaskSql = `INSERT INTO userTasks (userId, taskId) VALUES (?, ?)`;
        for (const task of allTasks) {
            await this.db.run(insertUserTaskSql, [newUserId, task.id]);
        }

        const user = await this.getUserFromId(newUserId);

        if (!user) {
            throw new Error('Failed to retrieve the new user');
        }

        return user;
    }


    async getBoosts(): Promise<Boost[]> {
        const boostsSql = `SELECT * FROM boosts`;
        return this.db.all(boostsSql);
    }

    async updateBoost(userId: string, boostName: string): Promise<User | undefined> {
        try {
            const boostSql = `SELECT * FROM boosts WHERE boostName = ?`;
            const boost = await this.db.get(boostSql, [boostName]);

            if (!boost) {
                throw new Error('Invalid boost name');
            }

            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const userBoostSql = `SELECT * FROM userBoosts WHERE userId = ? AND boostName = ?`;
            let userBoost = await this.db.get(userBoostSql, [userId, boostName]);

            if (!userBoost) {
                const insertUserBoostSql = `INSERT INTO userBoosts (userId, boostName, level) VALUES (?, ?, 1)`;
                await this.db.run(insertUserBoostSql, [userId, boostName]);
                userBoost = { boostName, level: 1 };
            } else {
                const updateUserBoostSql = `UPDATE userBoosts SET level = level + 1 WHERE userId = ? AND boostName = ?`;
                await this.db.run(updateUserBoostSql, [userId, boostName]);
                userBoost.level += 1;
            }

            const newCoins = user.coins - boost.price * Math.pow(2, userBoost.level - 1);
            if (newCoins < 0) {
                throw new Error('Not enough coins');
            }

            if (boostName === 'energy limit') {
                let newMaxEnergy = user.maxEnergy * userBoost.level;
                if (userBoost.level > 5) {
                    newMaxEnergy = user.maxEnergy * (userBoost.level / 2);
                }
                await this.updateUser(userId, { maxEnergy: newMaxEnergy });
            }

            await this.updateUser(userId, { coins: newCoins });

            // Возвращаем обновленного пользователя с его бустами
            const updatedUser = await this.getUserById(userId);
            if (!updatedUser) {
                console.error("така тема - !updatedUser, ", updatedUser)
                throw new Error('Failed to fetch updated user');
            }
            console.error("не така тема, ", updatedUser)
            return updatedUser;
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

        console.error('Запуск интервалас: монеты апдейт - coinsToAdd', coinsToAdd);

        // Обновляем монеты и время последнего обновления
        const newCoinsSql = `
        UPDATE users SET coins = coins + ?, lastTapBootUpdate = ? WHERE userId = ?
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

        const allUsersSql = `SELECT userId FROM users`;
        const allUsers = await this.db.all(allUsersSql);

        const insertUserTaskSql = `INSERT INTO userTasks (userId, taskId, completed) VALUES (?, ?, ?)`;

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
        SELECT id, text, coins, checkIcon, taskType, type, actionBtnTx, txDescription
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
        const fieldsToUpdate = Object.keys(updatedFields).map(field => `${field} = ?`).join(', ');
        const values = Object.values(updatedFields);
        const updateSql = `UPDATE tasks SET ${fieldsToUpdate} WHERE id = ?`;
        await this.db.run(updateSql, [...values, taskId]);

        const userTasksUpdateSql = `
        UPDATE userTasks SET ${fieldsToUpdate}
        WHERE taskId = ?;
    `;
        await this.db.run(userTasksUpdateSql, [...values, taskId]);
    }


    async getTaskById(taskId: number): Promise<TaskCardProps | undefined> {
        const taskSql = `SELECT * FROM tasks WHERE id = ?`;
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
        SET completed = ?, lastCompletedDate = ?
        WHERE userId = ? AND taskId = ?
    `;
        const getTaskSql = `SELECT coins, type FROM tasks WHERE id = ?`;
        const updateUserCoinsSql = `UPDATE users SET coins = coins + ? WHERE userId = ?`;

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
        const deleteTaskSql = `DELETE FROM tasks WHERE id = ?`;
        await this.db.run(deleteTaskSql, [taskId]);

        const deleteUserTasksSql = `DELETE FROM userTasks WHERE taskId = ?`;
        await this.db.run(deleteUserTasksSql, [taskId]);
    }
}

export default UserController;
