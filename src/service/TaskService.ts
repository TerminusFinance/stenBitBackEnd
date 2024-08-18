import mysql, {Connection} from "mysql2/promise";
import {
    ISCheckFriends,
    IsCheckNftTask, IsCheckStarsSendersTask,
    ISDailyTask, IsInternalChallengeTask,
    IsOpenUrl,
    IsStockReg,
    IsSubscribeToTg, IsTransferToneTask, Task, TaskCardProps, TaskType, User, UserTask,
    UserTaskFormated
} from "../types/Types";
import {CheckTransactions, isUserSubscribed, sendToCheckUserHaveNftFromCollections} from "../tonWork/CheckToNftitem";
import UserService from "./UserService";
import ClanController from "../controllers/clanController";
import {toNano} from "ton-core";
import UserLeagueController from "../controllers/userLeagueController";
import AcquisitionsController from "../controllers/acquisitionsController";


class TaskService {
    private userService!: UserService;

    constructor(private db: Connection) {
    }

    setUserService(userService: UserService) {
        this.userService = userService;
    }

    async checkAndUpdateTasksForUser(userId: string) {
        const userTasksSql = `
            SELECT t.id AS taskId,
                   t.taskType,
                   ut.etaps,
                   ut.lastCompletedDate,
                   ut.completed,
                t.type
            FROM tasks t
                     JOIN userTasks ut ON t.id = ut.taskId
            WHERE ut.userId = ?
        `;
        const [rowUserTasks] = await this.db.execute(userTasksSql, [userId]);
        let userTasks = rowUserTasks as UserTaskFormated[];

        for (const task of userTasks) {

            let parsedTaskType;
            try {
                parsedTaskType = JSON.parse(task.taskType);
            } catch (error) {
                console.error('Error parsing taskType:', error);
                continue;
            }

            const taskWithParsedType = {
                ...task,
                taskType: parsedTaskType
            };
            if (task.etaps == 1 || task.etaps == 3) {
                await this.checkSuccessTask(userId, task.taskId);
            } else if (taskWithParsedType.type == "DailyTask") {
                console.log("parsedTaskType - ", parsedTaskType)
                const lastDateUpdate = taskWithParsedType.lastCompletedDate
                const currentDate = new Date().toISOString().split('T')[0];
                console.log("lastDateUpdate:", lastDateUpdate);
                console.log("currentDate:", currentDate);

                if ((!lastDateUpdate && taskWithParsedType.completed == true) || (lastDateUpdate !== currentDate && taskWithParsedType.completed == true)) {
                    console.log('Обновляем ежедневное задание');
                    taskWithParsedType.completed = false;
                    const updateTaskSql = `
                        UPDATE userTasks
                        SET completed = ?
                        WHERE userId = ?
                          AND taskId = ?
                    `;
                    await this.db.execute(updateTaskSql, [0, userId, task.taskId]);
                } else {
                    console.log("ignor")
                }
            }
        }
    }

    async checkSuccessTask(userId: string, taskId: number) {
        const user = await this.userService.getUserFromIdSimply(userId);
        if (user != undefined) {
            if (user.tasks) {
                const userTask = user.tasks.find(task => task.taskId === taskId);
                if (userTask) {
                    if (IsCheckNftTask(userTask.taskType)) {
                        const resultCheck = await this.checkNftItem(user, userTask);
                        if (resultCheck === "Task completion status updated successfully") {
                            const newUserState = await this.userService.getUserFromIdSimply(userId);
                            return newUserState;
                        } else {
                            return resultCheck;
                        }
                    } else if (IsSubscribeToTg(userTask.taskType)) {
                        const resultCheck = await this.checkSubscribeToTg(user, userTask);
                        if (resultCheck === "Task completion status updated successfully") {
                            const newUserState = await this.userService.getUserFromIdSimply(userId);
                            return newUserState;
                        } else {
                            return resultCheck;
                        }
                    } else if (IsStockReg(userTask.taskType)) {
                        try {
                            const resultCheck = await this.checkStockReg(user, userTask);
                            if (resultCheck === "Task completion status updated successfully") {
                                const newUserState = await this.userService.getUserFromIdSimply(userId);
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
                                const newUserState = await this.userService.getUserFromIdSimply(userId);
                                return newUserState;
                            } else {
                                return resultCheck;
                            }
                        } catch (error) {
                            return error;
                        }
                    } else if (ISCheckFriends(userTask.taskType)) {
                        try {
                            console.error("isCheckFriendsTask voshol")
                            const resultCheck = await this.checkFriendsAction(user, userTask);
                            console.error("isCheckFriendsTask resultCheck -", resultCheck)
                            if (resultCheck === "Task completion status updated successfully") {
                                const newUserState = await this.userService.getUserFromIdSimply(userId);
                                return newUserState;
                            } else {
                                return resultCheck;
                            }
                        } catch (e) {
                            return e;
                        }
                    } else if (ISDailyTask(userTask.taskType)) {
                        try {
                            console.error("isCheckFriendsTask voshol")
                            const resultCheck = await this.checkDailyTaskAction(user, userTask);
                            console.error("isCheckFriendsTask resultCheck -", resultCheck)
                            if (resultCheck === "Task completion status updated successfully") {
                                const newUserState = await this.userService.getUserFromIdSimply(userId);
                                return newUserState;
                            } else {
                                return resultCheck;
                            }
                        } catch (e) {
                            return e;
                        }
                    } else if (IsInternalChallengeTask(userTask.taskType)) {
                        try {
                            console.error("IsInternalChallengeTask voshol")
                            const resultCheck = await this.checkInternalChallenge(user, userTask);
                            console.error("IsInternalChallengeTask resultCheck -", resultCheck)
                            if (resultCheck === "Task completion status updated successfully") {
                                const newUserState = await this.userService.getUserFromIdSimply(userId);
                                return newUserState;
                            } else {
                                return resultCheck;
                            }
                        } catch (e) {
                            return e;
                        }
                    } else if (IsTransferToneTask(userTask.taskType)) {
                        try {
                            console.error("IsInternalChallengeTask voshol")
                            const resultCheck = await this.checkTransOptions(user, userTask);
                            console.error("IsInternalChallengeTask resultCheck -", resultCheck)
                            if (resultCheck === "Task completion status updated successfully") {
                                const newUserState = await this.userService.getUserFromIdSimply(userId);
                                return newUserState;
                            } else {
                                return resultCheck;
                            }
                        } catch (e) {
                            return e;
                        }
                    } else if(IsCheckStarsSendersTask(userTask.taskType)) {
                        try {
                            console.error("IsInternalChallengeTask voshol")
                            const resultCheck = await this.checkStarsSenders(user, userTask);
                            console.error("IsInternalChallengeTask resultCheck -", resultCheck)
                            if (resultCheck === "Task completion status updated successfully") {
                                const newUserState = await this.userService.getUserFromIdSimply(userId);
                                return newUserState;
                            } else {
                                return resultCheck;
                            }
                        } catch (e) {
                            return e;
                        }
                    }
                } else {
                    return "User task not found";
                }
            }
        }
        return "User not found";
    }


    async checkStarsSenders(user: User, selectedTask: UserTask) {
        if(IsCheckStarsSendersTask(selectedTask.taskType)) {
            const acquisitionsController = new AcquisitionsController(this.db)
            const result = await acquisitionsController.getAcquisitions(user.userId)
            console.log("result",result)
            if(result) {
                if(selectedTask.taskType.unnecessaryWaste <=result.totalAmount) {
                    await this.updateTaskCompletion(user.userId, selectedTask.taskId, true);
                    return "Task completion status updated successfully";
                } else {
                    return "Less than the task";
                }
            } else {
                return "Less than the task";
            }
        }
    }


    async checkTransOptions(user: User, selectedTask: UserTask) {
        if (IsTransferToneTask(selectedTask.taskType)) {
            if (user.address != undefined && user.address !== "") {
                try {
                    const resultChecking = await CheckTransactions(user.address, toNano(selectedTask.taskType.price), selectedTask.taskType.addressToTransfer)
                    if (resultChecking == true) {
                        switch (selectedTask.taskType.rewardType) {
                            case "coin":
                                await this.updateTaskCompletion(user.userId, selectedTask.taskId, true);
                                break;
                            case "userLeague":
                                const userLeagueController = new UserLeagueController(this.db)
                                await userLeagueController.updateUserLeagueScore(user.userId, selectedTask.coins, "freescore");
                                await this.updateTaskCompletion(user.userId, selectedTask.taskId, true, false);
                                break;
                        }
                        return "Task completion status updated successfully"
                    } else {
                        return resultChecking
                    }
                } catch (e) {
                    return e
                }
            }
        }
    }

    async checkInternalChallenge(user: User, selectedTask: UserTask) {
        if (IsInternalChallengeTask(selectedTask.taskType)) {

            switch (selectedTask.taskType.nameChallenge) {
                case "walletAddress" :
                    if (user.address != undefined && user.address != "") {
                        await this.updateTaskCompletion(user.userId, selectedTask.taskId, true);
                        return "Task completion status updated successfully";
                    } else {
                        return "You didn't link the address"
                    }
                case "createClan" :
                    const controller = new ClanController(this.db)
                    const userClanResult = await controller.getUserClan(user.userId)
                    if (userClanResult.role != undefined && userClanResult.role == "creator") {
                        await this.updateTaskCompletion(user.userId, selectedTask.taskId, true);
                        return "Task completion status updated successfully";
                    } else {
                        return "You have not created a clan"
                    }
            }
            return "Task named is not supported"
        } else {
            return "Task has any type";
        }
    }


    async checkDailyTaskAction(user: User, selectedTask: UserTask): Promise<string> {
        if (ISDailyTask(selectedTask.taskType)) {
            const lastDateUpdate = selectedTask.lastCompletedDate;
            const currentDate = new Date().toISOString().split('T')[0]; // Форматируем текущую дату до YYYY-MM-DD

            console.log("lastDateUpdate:", lastDateUpdate);
            console.log("currentDate:", currentDate);

            if (!lastDateUpdate || new Date(lastDateUpdate).toISOString().split('T')[0] !== currentDate) {
                console.log("Updating task completion status and date.");

                await this.updateTaskCompletion(user.userId, selectedTask.taskId, true);
                return "Task completion status updated successfully";
            } else {
                return "Task has already been completed today";
            }
        } else {
            return "Task has any type";
        }
    }


    async checkFriendsAction(user: User, selectedTask: UserTask) {
        if (ISCheckFriends(selectedTask.taskType)) {
            if (user.listUserInvited != undefined) {
                console.error("checkFriendsAction ser.listUserInvited-", user.listUserInvited)
                if (user.listUserInvited.length >= selectedTask.taskType.numberOfFriends) {
                    const resultSendTorequest = await this.updateTaskCompletion(user.userId, selectedTask.taskId, true)
                    resultSendTorequest
                    return "Task completion status updated successfully";
                } else {
                    return "An error occurred while have invited friends";
                }
            } else {
                console.error("checkFriendsAction ser.listUserInvited-", user.listUserInvited)
                return "An error occurred while have invited friends";
            }
        }
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

            const [userTaskRows] = await this.db.execute<mysql.RowDataPacket[]>(userTaskSql, [user.userId, selectedTask.taskId]);
            const userTask = userTaskRows[0] as UserTaskFormated | undefined;

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
                return "Task completion status updated successfully";

            } else if (etaps === 1) {
                // Проверка, прошло ли больше 24 часов с момента сохраненной даты
                if (dataSendCheck) {
                    const savedDate = new Date(dataSendCheck);
                    const nextDay = new Date(savedDate);
                    nextDay.setDate(savedDate.getDate() + 1);
                    console.error("nextDay - ", nextDay);
                    if (currentDate > nextDay) {
                        // Перевод на этап 2
                        console.error("перевод на newDay");
                        await this.updateUserTask(user.userId, selectedTask.taskId, {etaps: 2});
                        return "Task completion status updated successfully";
                    } else {
                        console.error("less than 24 hours have passed since the last update.");
                        throw new Error('Less than 24 hours have passed since the last update.');
                    }
                } else {
                    throw new Error('Invalid dataSendCheck value.');
                }

            } else if (etaps === 2) {
                // Перевод на этап 3 и сохранение текущей даты
                await this.updateUserTask(user.userId, selectedTask.taskId, {
                    etaps: 3,
                    dataSendCheck: currentDate.toISOString(),
                });
                return "Task completion status updated successfully";

            } else if (etaps === 3) {
                // Проверка, прошло ли больше 24 дней с момента сохраненной даты
                if (dataSendCheck) {
                    const savedDate = new Date(dataSendCheck);
                    const nextMonth = new Date(savedDate);
                    nextMonth.setDate(savedDate.getDate() + 1);
                    if (currentDate > nextMonth) {
                        // Завершение задачи и перевод на этап 4
                        await this.updateUserTask(user.userId, selectedTask.taskId, {
                            etaps: 4,
                        });

                        await this.updateTaskCompletion(user.userId, selectedTask.taskId, true);

                        return "Task completion status updated successfully";
                    } else {
                        throw new Error('Less than 24 days have passed since the last update.');
                    }
                } else {
                    throw new Error('Invalid dataSendCheck value.');
                }
            }
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

            const [userTaskRows] = await this.db.execute<mysql.RowDataPacket[]>(userTaskSql, [user.userId, selectedTask.taskId]);
            const userTask = userTaskRows[0] as UserTaskFormated | undefined;

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
                return "Task completion status updated successfully";

            } else if (etaps === 1) {
                // Проверка, прошло ли больше 24 часов с момента сохраненной даты
                if (dataSendCheck) {
                    const savedDate = new Date(dataSendCheck);
                    const nextDay = new Date(savedDate);
                    nextDay.setDate(savedDate.getDate() + 1);
                    console.error("nextDay - ", nextDay);
                    if (currentDate > nextDay) {
                        // Завершение задачи и перевод на этап 4
                        await this.updateUserTask(user.userId, selectedTask.taskId, {
                            completed: true,
                            etaps: 4,
                        });
                        return "Task completion status updated successfully";
                    } else {
                        throw new Error('Less than 24 hours have passed since the last update.');
                    }
                } else {
                    throw new Error('Invalid dataSendCheck value.');
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
        await this.db.execute(updateSql, [...values, userId, taskId]);
    }


    async updateTaskCompletion(userId: string, taskId: number, completed: boolean, addedUserCoins: boolean = true): Promise<void> {
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
            const [taskRows] = await this.db.execute<mysql.RowDataPacket[]>(getTaskSql, [taskId]);
            const task = taskRows[0] as Task;

            if (!task) {
                throw new Error('Task not found');
            }

            if (completed && task.type === 'DailyTask') {
                await this.db.execute(updateTaskSql, [1, completedDate, userId, taskId]);
            } else {
                await this.db.execute(updateTaskSql, [completed ? 1 : 0, completedDate, userId, taskId]);
            }

            if (completed) {
                // Update user's coins
                if(addedUserCoins) {
                    await this.db.execute(updateUserCoinsSql, [task.coins, userId]);
                }
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
        await this.db.execute(deleteTaskSql, [taskId]);

        const deleteUserTasksSql = `DELETE
                                    FROM userTasks
                                    WHERE taskId = ?`;
        await this.db.execute(deleteUserTasksSql, [taskId]);
    }


    async getTaskById(taskId: number): Promise<TaskCardProps | undefined> {
        const taskSql = `SELECT *
                         FROM tasks
                         WHERE id = ?`;

        try {
            const [rows] = await this.db.execute<mysql.RowDataPacket[]>(taskSql, [taskId]);
            const task = rows[0];

            if (task) {
                return {
                    id: task.id,
                    text: task.text,
                    coins: task.coins,
                    checkIcon: task.checkIcon,
                    taskType: JSON.parse(task.taskType), // Парсинг taskType
                    type: task.type,
                    completed: false, // В таблице tasks нет поля completed, поэтому задаем значение false
                    actionBtnTx: task.actionBtnTx,
                    txDescription: task.txDescription
                };
            }
        } catch (error) {
            console.error('Error fetching task:', error);
        }

        return undefined;
    }

    async updateTask(taskId: number, updatedFields: Partial<TaskCardProps>): Promise<void> {
        // Если taskType присутствует в updatedFields, преобразуем его в JSON строку
        if (updatedFields.taskType) {
            updatedFields.taskType = JSON.stringify(updatedFields.taskType) as unknown as any; // Предполагаем, что TaskType - это any
        }

        const fieldsToUpdate = Object.keys(updatedFields).map(field => `${field} = ?`).join(', ');
        const values = Object.values(updatedFields);

        const updateTaskSql = `UPDATE tasks
                               SET ${fieldsToUpdate}
                               WHERE id = ?`;

        const updateUserTasksSql = `UPDATE userTasks
                                    SET ${fieldsToUpdate}
                                    WHERE taskId = ?`;

        try {
            await this.db.execute(updateTaskSql, [...values, taskId]);
            await this.db.execute(updateUserTasksSql, [...values, taskId]);
        } catch (error) {
            console.error('Error updating task:', error);
            throw new Error(`Failed to update task: ${error}`);
        }
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

        const [rows] = await this.db.execute<mysql.RowDataPacket[]>(tasksSql);
        const tasks = rows;

        // const tasks = await this.db.all<Task>(tasksSql);

        if (tasks) {
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
        } else {
            return []
        }
    }

    async addTaskToAllUsers(text: string, coins: number, checkIcon: string, taskType: TaskType, type: string, actionBtnTx: string | null = null, txDescription: string | null = null): Promise<TaskCardProps> {
        const insertTaskSql = `
            INSERT INTO tasks (text, coins, checkIcon, taskType, type, actionBtnTx, txDescription)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await this.db.execute<mysql.OkPacket>(insertTaskSql, [text, coins, checkIcon, JSON.stringify(taskType), type, actionBtnTx, txDescription]);
        const newTaskId = result.insertId;

        if (newTaskId === undefined) {
            throw new Error('Failed to create new task');
        }

        const allUsersSql = `SELECT userId
                             FROM users`;
        const [allUsersResult] = await this.db.execute<mysql.RowDataPacket[]>(allUsersSql);
        const allUsers = allUsersResult as { userId: string }[];

        const insertUserTaskSql = `INSERT INTO userTasks (userId, taskId, completed)
                                   VALUES (?, ?, ?)`;

        for (const user of allUsers) {
            await this.db.execute(insertUserTaskSql, [user.userId, newTaskId, false]);
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


}

export default TaskService;