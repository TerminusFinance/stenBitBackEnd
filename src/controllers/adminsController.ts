import mysql, { Connection, RowDataPacket, FieldPacket } from 'mysql2/promise';
import {Partners, User} from "../types/Types";
import UserController from "./userController";
import {OkPacket} from "mysql";

class AdminsController {
    constructor(private db: Connection) {}


    async getUserCount(): Promise<number> {
        const countUsersSql = `SELECT COUNT(*) AS total FROM users`;
        const [rows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(countUsersSql);
        const totalUsers = rows[0].total;
        return totalUsers;
    }

    async getUserCountWithMoreThan10Coins(): Promise<number> {
        const countUsersWithCoinsSql = `SELECT COUNT(*) AS total FROM users WHERE coins > 10`;
        const [rows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(countUsersWithCoinsSql);
        const totalUsersWithMoreThan10Coins = rows[0].total;
        return totalUsersWithMoreThan10Coins;
    }

    async getUserStatistics() {
        try {
            // Получаем общее количество пользователей
            const allUsers = await this.getUserCount();

            // Получаем количество пользователей с монетами больше 10
            const allSortedUsers = await this.getUserCountWithMoreThan10Coins();

            // Формируем объект для возврата
            const statistics = {
                allUsers: allUsers,
                usersWithMoreThan10Coins: allSortedUsers,
            };

            // Возвращаем объект в формате JSON
            return statistics;
        } catch (error) {
            console.error('Error fetching user statistics:', error);
            throw new Error('Failed to fetch user statistics');
        }
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
            await this.db.execute(updateUserSql, params);
            const userController = new UserController(this.db)
            const updatedUser = await userController.getUserFromIdSimply(userId);
            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }

            return updatedUser;
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error(`Failed to update user: ${error}`);
        }
    }

    async getAllUsers(): Promise<User[]> {
        const usersSql = `SELECT userId, userName, coins, address, referral, maxEnergy FROM users`;

        const [rows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(usersSql);
        console.error("rows -", rows )
        const users = rows as User[];

        if (users.length > 0) {
            for (const user of users) {
                const boostsSql = `
                    SELECT b.boostName, ub.level, b.price
                    FROM userBoosts ub
                    JOIN boosts b ON ub.boostName = b.boostName
                    WHERE ub.userId = ?
                `;
                const [boosts]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(boostsSql, [user.userId]);
                user['boosts'] = (boosts as any[]).map(boost => ({
                    boostName: boost.boostName,
                    level: boost.level,
                    price: boost.price * Math.pow(2, boost.level - 1) // Цена увеличивается в 2 раза за каждый уровень
                }));

                const inviteesSql = `
                    SELECT u.userId, u.userName, ui.coinsReferral
                    FROM users u
                    JOIN user_invitations ui ON u.userId = ui.invitee_id
                    WHERE ui.inviter_id = ?
                `;
                const [invitees]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(inviteesSql, [user.userId]);
                user['listUserInvited'] = (invitees as any[]).map(invitee => ({
                    userId: invitee.userId,
                    userName: invitee.userName,
                    coinsReferral: invitee.coinsReferral
                }));

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
                const [userTasks]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(userTasksSql, [user.userId]);
                user['tasks'] = (userTasks as any[]).map(task => ({
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
                }));
            }
            return users;
        }
        return [];
    }

    async deleteUserById(userId: string): Promise<string> {
        const deleteUserSql = `DELETE FROM users WHERE userId = ?`;
        const deleteCompletedTasksSql = `DELETE FROM completedTasks WHERE userId = ?`;
        const deleteUserBoostsSql = `DELETE FROM userBoosts WHERE userId = ?`;
        const deleteUserInvitationsSql = `DELETE FROM user_invitations WHERE inviter_id = ? OR invitee_id = ?`;
        const deleteUserTasksSql = `DELETE FROM userTasks WHERE userId = ?`;
        const deleteUserUserLeagueTable = `DELETE FROM UserLeague WHERE userId = ?`;
        const deleteUserFromAcquisitions = `DELETE FROM acquisitions WHERE userId = ?`;

        try {
            // Удаление из всех зависимых таблиц перед удалением из users
            await this.db.execute(deleteCompletedTasksSql, [userId]);
            await this.db.execute(deleteUserBoostsSql, [userId]);
            await this.db.execute(deleteUserInvitationsSql, [userId, userId]);
            await this.db.execute(deleteUserTasksSql, [userId]);
            await this.db.execute(deleteUserUserLeagueTable, [userId]); // Перемещено перед удалением из users
            await this.db.execute(deleteUserFromAcquisitions, [userId]);

            // Теперь удаляем из таблицы users
            await this.db.execute(deleteUserSql, [userId]);

            return "Success delete";
        } catch (error) {
            throw new Error(`Failed to delete user: ${error}`);
        }
    }



    async createPartner(name: string, token: string) {
        try {
            const query = 'INSERT INTO partners (name, token) VALUES (?, ?)';
            const [result]: [mysql.OkPacket, mysql.FieldPacket[]] = await this.db.execute(query, [name, token]);

            const insertedId = result.insertId;
            const selectQuery = 'SELECT * FROM partners WHERE id = ?';
            const [rows]: [RowDataPacket[], FieldPacket[]] = await this.db.execute(selectQuery, [insertedId]);

            if (rows.length > 0) {
                return rows[0] as Partners;
            } else {
                throw new Error('Ошибка при создании партнера.');
            }
        } catch (err) {
            throw new Error(`Failed to create partner: ${err}`);
        }
    }

    // Функция для чтения всех записей из таблицы `partners`
    async getAllPartners() {
        try {
            const query = 'SELECT * FROM partners';
            const [rows] = await this.db.execute(query);
            return (rows as any[]);
        } catch (err) {
            throw new Error(`Failed to retrieve partners: ${err}`);
        }
    }

    // Функция для удаления записи из таблицы `partners` по `id` и возврата сообщения
    async deletePartnerById(id: number) {
        try {
            const query = 'DELETE FROM partners WHERE id = ?';
            await this.db.execute(query, [id]);

                return 'Удаление успешно завершено.';
        } catch (err) {
            throw new Error(`Failed to delete partner: ${err}`);
        }
    }


}

export default AdminsController;
