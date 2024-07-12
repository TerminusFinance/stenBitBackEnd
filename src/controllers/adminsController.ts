import {Database} from "sqlite";
import {User} from "./userController";

class AdminsController {
    constructor(private db: Database) {
    }

    async getAllUsers(): Promise<User[]> {
        const usersSql = `SELECT userId, userName, coins, codeToInvite, address, referral, maxEnergy FROM users`;
        const users = await this.db.all(usersSql);

        if (users && users.length > 0) {
            for (const user of users) {
                const boostsSql = `
                SELECT b.boostName, ub.level, b.price
                FROM userBoosts ub
                JOIN boosts b ON ub.boostName = b.boostName
                WHERE ub.userId = ?
            `;
                const boosts = await this.db.all(boostsSql, [user.userId]);
                user.boosts = boosts.map(boost => ({
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
                const invitees = await this.db.all(inviteesSql, [user.userId]);
                user.listUserInvited = invitees.map(invitee => ({
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
                const userTasks = await this.db.all(userTasksSql, [user.userId]);
                user.tasks = userTasks.map(task => ({
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

    async deleteUserById(userId: string): Promise<void> {
        const deleteUserSql = `DELETE FROM users WHERE userId = ?`;
        const deleteCompletedTasksSql = `DELETE FROM completedTasks WHERE userId = ?`;
        const deleteUserBoostsSql = `DELETE FROM userBoosts WHERE userId = ?`;
        const deleteUserInvitationsSql = `DELETE FROM user_invitations WHERE inviter_id = ? OR invitee_id = ?`;
        const deleteUserTasksSql = `DELETE FROM userTasks WHERE userId = ?`;

        await this.db.run(deleteCompletedTasksSql, [userId]);
        await this.db.run(deleteUserBoostsSql, [userId]);
        await this.db.run(deleteUserInvitationsSql, [userId, userId]);
        await this.db.run(deleteUserTasksSql, [userId]);
        await this.db.run(deleteUserSql, [userId]);
    }



}

export default AdminsController;