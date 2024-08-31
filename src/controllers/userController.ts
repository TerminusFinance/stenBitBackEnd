import mysql, { Connection } from 'mysql2/promise';

import {
    TaskCardProps,
    TaskType,
    User,
    UserTask,
} from "../types/Types";
import UserService from "../service/UserService";
import TaskService from "../service/TaskService";


class UserController {

    private readonly userService: UserService;
    private readonly taskService: TaskService;

    constructor(private db: Connection) {
        this.userService = new UserService(db);
        this.taskService = new TaskService(db);

        this.userService.setTaskService(this.taskService);
        this.taskService.setUserService(this.userService);
    }

    private generateUniqueCodeToInvite(): string {
        return `UC_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    async createUser(userId: string, userName: string, coins: number, address: string): Promise<User> {
        return this.userService.createUser(userId, userName, coins, address);
    }

    async addCoinsAndDeductEnergy(userId: string, coins: number): Promise<{ newEnergy: number, coins: number }> {
        return this.userService.addCoinsAndDeductEnergy(userId, coins);
    }



    async getUserFromId(userId: string, imageAvatar: string | null): Promise<User | undefined> {
        return this.userService.getUserFromId(userId, imageAvatar);
    }


    async updateUser(userId: string, updatedData: Partial<User>): Promise<User | undefined> {
        return this.userService.updateUser(userId, updatedData);
    }

    async processInvitation(inviteCode: string, newUserId: string, newUserName: string, isPremium: boolean): Promise<User> {
        return this.userService.processInvitation(inviteCode, newUserId, newUserName, isPremium);
    }

    async updateBoost(userId: string, boostName: string): Promise<{ user: User; boostEndTime?: string } | undefined> {
        return this.userService.updateBoost(userId, boostName);
    }

    // task operation

    async addTaskToAllUsers(text: string, coins: number, checkIcon: string, taskType: TaskType, type: string,sortLocal?: string | null, actionBtnTx: string | null = null, txDescription: string | null = null): Promise<TaskCardProps> {
        return this.taskService.addTaskToAllUsers(text, coins, checkIcon, taskType, type, sortLocal, actionBtnTx, txDescription);
    }


    async getAllTasks(): Promise<TaskCardProps[]> {
        return this.taskService.getAllTasks();
    }


    async updateTask(taskId: number, updatedFields: Partial<TaskCardProps>): Promise<void> {
        return this.taskService.updateTask(taskId, updatedFields);
    }



    async getTaskById(taskId: number): Promise<TaskCardProps | undefined> {
        return this.taskService.getTaskById(taskId)
    }


    async updateTaskCompletion(userId: string, taskId: number, completed: boolean): Promise<void> {
       return this.taskService.updateTaskCompletion(userId, taskId, completed);
    }


    async deleteTask(taskId: number): Promise<void> {
        return this.taskService.deleteTask(taskId);
    }


    async checkSuccessTask(userId: string, taskId: number) {
        return this.taskService.checkSuccessTask(userId, taskId)
    }


    async updateUserTask(userId: string, taskId: number, updatedFields: Partial<UserTask>): Promise<void> {
        return this.taskService.updateUserTask(userId, taskId, updatedFields);
    }

    async getUserFromIdSimply(userId: string): Promise<User | undefined> {
         return this.userService.getUserFromIdSimply(userId);
    }
}

export default UserController;