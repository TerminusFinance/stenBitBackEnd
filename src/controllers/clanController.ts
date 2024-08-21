import { Connection, RowDataPacket, FieldPacket } from 'mysql2/promise';
import AcquisitionsController from "./acquisitionsController";
import {LabeledPrice} from "node-telegram-bot-api";
import {SubscriptionOptions} from "./premiumController";

interface Level {
    minProgress: number;
    maxProgress: number;
}

interface Clan {
    clanId: string;
    clanName: string;
    description: string;
    rating: number;
    createAt: string;
    Urlchanel: string | null;
}

class ClanController {
    constructor(private db: Connection) {}

    private generateUniqueCodeToCreateClan(): string {
        return `CL_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    async getListSubscriptionOptions(): Promise<{ name: string, price: number }[]> {
        const prices = [
            { name: '1000 rating', price: 1000 },
            { name: '5000 rating', price: 5000 },
            { name: '10000 rating', price: 10000 },
            { name: '25000 rating', price: 25000 },
            { name: '50000 rating', price: 50000 }
        ];

        return prices;
    }

    async getUserClan(userId: string): Promise<{ message: string, clan?: Clan, role?: string, contributedRating?: number }> {
        const userClanSql = `
            SELECT c.clanId, c.clanName, c.description, c.rating, c.createAt, c.Urlchanel, uc.role, uc.contributedRating
            FROM userClans uc
            JOIN clans c ON uc.clanId = c.clanId
            WHERE uc.userId = ?
        `;

        const [rows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(userClanSql, [userId]);
        const userClan = rows[0] as any; // Cast as needed

        if (userClan) {
            const { clanId, clanName, description, rating, createAt, Urlchanel, role, contributedRating } = userClan;
            const clan: Clan = { clanId, clanName, description, rating, createAt, Urlchanel };
            return { message: 'User is in a clan', clan, role, contributedRating };
        } else {
            return { message: 'User is not in a clan' };
        }
    }

    formatDateToMySQL(dateString: string): string {
        return dateString.replace('T', ' ').substring(0, 19);
    }

    async createClan(clanName: string, description: string, userId: string, urlChannel?: string): Promise<string> {
        const clanCreationCost = 250000;
        try {
            // Проверка, есть ли пользователь уже в клане
            const userClanCheckSql = `SELECT clanId FROM userClans WHERE userId = ?`;
            const [existingUserClanRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(userClanCheckSql, [userId]);

            if (existingUserClanRows.length > 0) {
                throw new Error(`User with userId ${userId} is already in a clan and cannot create a new one.`);
            }

            // Проверка баланса пользователя
            const userBalanceCheckSql = `SELECT coins FROM users WHERE userId = ?`;
            const [userBalanceRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(userBalanceCheckSql, [userId]);

            if (userBalanceRows.length === 0 || userBalanceRows[0].coins < clanCreationCost) {
                throw new Error('Not enough coins');
            }

            // Обновление баланса пользователя
            const updateUserCoinsSql = `UPDATE users SET coins = coins - ? WHERE userId = ?`;
            await this.db.execute(updateUserCoinsSql, [clanCreationCost, userId]);

            // Создание клана
            const createAt = new Date().toISOString();
            const formattedCreateAt = this.formatDateToMySQL(createAt);
            const clanId = this.generateUniqueCodeToCreateClan();

            // Вставка данных клана с учетом наличия urlChannel
            const createClanSql = `
            INSERT INTO clans (clanId, clanName, description, rating, createAt, Urlchanel)
            VALUES (?, ?, ?, 0, ?, ?)
        `;
            await this.db.execute(createClanSql, [clanId, clanName, description, formattedCreateAt, urlChannel || null]);

            // Добавление пользователя в клан как создателя
            const addUserToClanSql = `
            INSERT INTO userClans (userId, clanId, role, joinDate)
            VALUES (?, ?, 'creator', ?)
        `;
            await this.db.execute(addUserToClanSql, [userId, clanId, formattedCreateAt]);

            return "Clan created successfully";
        } catch (error) {
            console.error('Error creating clan:', error);
            throw error;
        }
    }


    async getClanWithUsers(clanId: string): Promise<{ clan: Clan; users: { userId: string, userName: string, role: string, joinDate: string }[] }> {
        try {
            // Обновляем SQL-запрос для получения клана с учетом поля Urlchanel
            const clanSql = `
            SELECT clanId, clanName, description, rating, createAt, Urlchanel
            FROM clans
            WHERE clanId = ?
        `;
            const [clanRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(clanSql, [clanId]);
            const clan = clanRows[0] as Clan;

            if (!clan) {
                throw new Error(`Clan with clanId ${clanId} not found`);
            }

            // Запрос на получение пользователей клана
            const usersSql = `
            SELECT uc.userId, u.userName, uc.role, uc.joinDate
            FROM userClans uc
            JOIN users u ON uc.userId = u.userId
            WHERE uc.clanId = ?
        `;
            const [userRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(usersSql, [clanId]);

            const users = userRows.map((user: any) => ({
                userId: user.userId,
                userName: user.userName,
                role: user.role,
                joinDate: user.joinDate
            }));

            // Возвращаем данные клана и пользователей
            return { clan, users };
        } catch (error) {
            console.error('Error getting clan with users:', error);
            throw error;
        }
    }


    async addUserToClan(userId: string, clanId: string, role: string = 'simple'): Promise<string> {
        try {
            const userSql = `SELECT userId FROM users WHERE userId = ?`;
            const [userRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(userSql, [userId]);

            if (userRows.length === 0) {
                throw new Error(`User with userId ${userId} not found`);
            }

            const clanSql = `SELECT clanId FROM clans WHERE clanId = ?`;
            const [clanRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(clanSql, [clanId]);

            if (clanRows.length === 0) {
                throw new Error(`Clan with clanId ${clanId} not found`);
            }

            const userClanSql = `SELECT userId FROM userClans WHERE userId = ? AND clanId = ?`;
            const [userClanRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(userClanSql, [userId, clanId]);

            if (userClanRows.length > 0) {
                throw new Error(`You are already a member of the clan`);
            }

            const createAt = new Date().toISOString();
            const joinDate = this.formatDateToMySQL(createAt);
            const addUserToClanSql = `
            INSERT INTO userClans (userId, clanId, role, joinDate)
            VALUES (?, ?, ?, ?)
        `;

            await this.db.execute(addUserToClanSql, [userId, clanId, role, joinDate]);
            return "Success added";
        } catch (error) {
            console.error('Error adding user to clan:', error);
            throw error;
        }
    }


    async getAllClans(): Promise<{ clanId: string, clanName: string, rating: number }[]> {
        try {
            const clansSql = `
                SELECT clanId, clanName, rating
                FROM clans
            `;
            const [clansRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(clansSql);

            return clansRows.map((clan: any) => ({
                clanId: clan.clanId,
                clanName: clan.clanName,
                rating: clan.rating
            }));
        } catch (error) {
            console.error('Error getting all clans:', error);
            throw error;
        }
    }

    async increaseClanRating(userId: string, ratingIncrease: number, idBuying: "upClan_1000" | "upClan_5000" |"upClan_10000"|"upClan_25000" |"upClan_50000"): Promise<void> {
        try {

            const valueAfterUnderscore = parseInt(idBuying.split('_')[1], 10);
            const newAddedRating = valueAfterUnderscore;

            const userClanSql = `SELECT clanId, contributedRating FROM userClans WHERE userId = ?`;
            const [userClanRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(userClanSql, [userId]);
            const userClan = userClanRows[0] as any;

            if (!userClan) {
                throw new Error(`User with userId ${userId} is not in any clan`);
            }

            const { clanId, contributedRating } = userClan;

            const updateClanRatingSql = `UPDATE clans SET rating = rating + ? WHERE clanId = ?`;
            await this.db.execute(updateClanRatingSql, [newAddedRating, clanId]);

            const newContributedRating = contributedRating + newAddedRating;
            const updateUserClanSql = `UPDATE userClans SET contributedRating = ? WHERE userId = ? AND clanId = ?`;
            await this.db.execute(updateUserClanSql, [newContributedRating, userId, clanId]);
        } catch (error) {
            console.error('Error increasing clan rating:', error);
            throw error;
        }
    }

    async getClansByLeagueLevels(levels: Level[]): Promise<Clan[][]> {
        try {
            const allClansSql = `
                SELECT clanId, clanName, description, rating, createAt, Urlchanel
                FROM clans
            `;
            const [allClansRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(allClansSql);

            // Convert RowDataPacket to Clan
            const allClans: Clan[] = allClansRows.map((row: any) => ({
                clanId: row.clanId,
                clanName: row.clanName,
                description: row.description,
                rating: row.rating,
                createAt: row.createAt,
                Urlchanel: row.Urlchanel
            }));

            const clansByLevels: Clan[][] = levels.map(() => []);

            allClans.forEach((clan: Clan) => {
                levels.forEach((level: Level, index: number) => {
                    if (clan.rating >= level.minProgress && clan.rating < level.maxProgress) {
                        clansByLevels[index].push(clan);
                    }
                });
            });

            return clansByLevels;
        } catch (error) {
            console.error('Error getting clans by league levels:', error);
            throw error;
        }
    }

    async leaveClan(userId: string): Promise<string> {
        try {
            const userClanSql = `
            SELECT uc.clanId, uc.role
            FROM userClans uc
            WHERE uc.userId = ?
        `;
            const [userClanRows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(userClanSql, [userId]);
            const userClan = userClanRows[0] as any;

            if (!userClan) {
                throw new Error(`User with userId ${userId} is not in any clan`);
            }

            const { clanId, role } = userClan;

            if (role === 'creator') {
                // Сначала удаляем всех пользователей из клана
                const deleteUserClansSql = `DELETE FROM userClans WHERE clanId = ?`;
                await this.db.execute(deleteUserClansSql, [clanId]);

                // Затем удаляем сам клан
                const deleteClanSql = `DELETE FROM clans WHERE clanId = ?`;
                await this.db.execute(deleteClanSql, [clanId]);

                console.log(`Clan with clanId ${clanId} has been deleted along with all its users.`);
            } else {
                // Удаляем только запись пользователя из userClans
                const deleteUserClanSql = `DELETE FROM userClans WHERE userId = ? AND clanId = ?`;
                await this.db.execute(deleteUserClanSql, [userId, clanId]);

                console.log(`User with userId ${userId} has left the clan with clanId ${clanId}.`);
            }
            return "success leave";
        } catch (error) {
            console.error('Error leaving clan:', error);
            throw error;
        }
    }


    async boostClan(chat_id: string, selectedSubscriptionOptions: SubscriptionOptions) {
        let resultAmount: number;

        // if (![1000, 5000, 10000, 25000, 50000].includes(selectedSubscriptionOptions.price)) {
        //     throw new Error('This service does not exist');
        // }

        resultAmount = selectedSubscriptionOptions.price;

        const currentLabeledPrice: LabeledPrice[] = [{
            label: `upClan_${selectedSubscriptionOptions.name}`,
            amount: resultAmount
        }];

        const title = `Upp clan rating ${selectedSubscriptionOptions.name}`;
        const description = 'Upp clan rating to terminus app';
        const currency = 'XTR';
        const payload = 'Payload info';

        const acquisitionsController = new AcquisitionsController(this.db)
        const resultPayment = await acquisitionsController.sendPayment(chat_id, title, description, payload, currency, currentLabeledPrice, `upClan_${selectedSubscriptionOptions.price}`);
        console.log('resultPayment - ', resultPayment);
        return resultPayment;
    }

}

export default ClanController;
