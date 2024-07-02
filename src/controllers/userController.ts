import { Database } from 'sqlite';

interface User {
    userId: string;
    userName: string;
    coins: number;
    codeToInvite: string;
    address: string;
    referral: string;
    createAt: string;
    dataUpdate: string;
    listUserInvited: string; // JSON string for list of invited users
    completedTasks: number[];
    currentEnergy: number;
    maxEnergy: number;
    boosts: UserBoost[];
    lastTapBootUpdate?: string;
}

interface Boost {
    boostName: string;
    description: string;
    level: number;
    price: number;
}

interface UserBoost {
    boostName: string;
    level: number;
    price: number;
}

class UserController {
    constructor(private db: Database) {}

    private generateUniqueCodeToInvite(): string {
        return `UNIQUE_CODE_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    async createUser(userId: string, userName: string, coins: number, address: string): Promise<User> {
        // Проверка, существует ли уже пользователь с таким userId
        const existingUser = await this.getUserById(userId);
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
        }

        const newUser = await this.getUserById(userId);
        if (!newUser) {
            throw new Error('Failed to create new user');
        }

        return newUser;
    }



    async getUserById(userId: string): Promise<User | undefined> {
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

            return {
                ...user,
                completedTasks: tasks.map(task => task.taskId),
                boosts: user.boosts
            };
        }

        return undefined;
    }



    async updateUser(userId: string, updatedData: Partial<User>): Promise<User | undefined> {
        const { userName, coins, address, referral, listUserInvited, currentEnergy, maxEnergy } = updatedData;
        const updateDate = new Date().toISOString();

        const updateUserSql = `
        UPDATE users SET 
            userName = COALESCE(?, userName), 
            coins = COALESCE(?, coins), 
            address = COALESCE(?, address), 
            referral = COALESCE(?, referral), 
            dataUpdate = ?, 
            listUserInvited = COALESCE(?, listUserInvited),
            currentEnergy = COALESCE(?, currentEnergy),
            maxEnergy = COALESCE(?, maxEnergy),
            lastTapBootUpdate = ?
        WHERE userId = ?
    `;

        try {
            await this.db.run(updateUserSql, [userName, coins, address, referral, updateDate, listUserInvited, currentEnergy, maxEnergy, updateDate, userId]);
            return this.getUserById(userId);
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error(`Failed to update user: ${error}`);
        }
    }


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

        const listUserInvited = inviter.listUserInvited ? JSON.parse(inviter.listUserInvited) : [];
        listUserInvited.push({ userId: newUserId, userName: newUserName, coinsReferral: 0 });

        const updateInviterSql = `UPDATE users SET listUserInvited = ? WHERE userId = ?`;
        await this.db.run(updateInviterSql, [JSON.stringify(listUserInvited), inviter.userId]);

        const codeToInvite = this.generateUniqueCodeToInvite();
        const createAt = new Date().toISOString();
        const dataUpdate = createAt;

        const newUserSql = `
            INSERT INTO users (userId, userName, coins, codeToInvite, address, referral, createAt, dataUpdate, currentEnergy, maxEnergy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
        `;
        await this.db.run(newUserSql, [newUserId, newUserName, 0, codeToInvite, '', inviteCode, createAt, dataUpdate]);

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

        const newUser = await this.getUserById(newUserId);
        if (!newUser) {
            throw new Error('Failed to create new user');
        }

        return newUser;
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





// tap boot
    async startTapBootMechanism(userId: string, tapBootLevel: number) {
        const intervalInSeconds = 2; // Интервал в секундах для добавления монет пользователя
        console.error('Заупуск интервалас:');
        // Определяем время работы механизма на основе уровня tapBoot
        const durationInMinutes = 5 + (tapBootLevel - 1) * 2;
        const durationInMilliseconds = durationInMinutes * 60 * 1000;

        // Запускаем интервальную функцию для добавления монет каждые intervalInSeconds секунд
        const interval = setInterval(async () => {
            try {
                // Получаем текущее время
                const currentTime = new Date().toISOString();

                // Получаем пользователя из базы данных
                const user = await this.getUserById(userId);

                if (!user) {
                    clearInterval(interval);
                    throw new Error('User not found');
                }

                // Проверяем, определено ли поле lastTapBootUpdate у пользователя
                if (user.lastTapBootUpdate && new Date().getTime() > new Date(user.lastTapBootUpdate).getTime() + durationInMilliseconds) {
                    clearInterval(interval);
                    return; // Выходим из интервальной функции, если прошло достаточно времени
                }

                // Добавляем одну монету к текущему балансу пользователя
                const newCoins = user.coins + 1;

                // Обновляем баланс пользователя в базе данных
                await this.updateUser(userId, { coins: newCoins, lastTapBootUpdate: currentTime });
            } catch (error) {
                console.error('Error in startTapBootMechanism:', error);
                clearInterval(interval);
            }
        }, intervalInSeconds * 1000); // Переводим интервал в миллисекунды
    }


}

export default UserController;
