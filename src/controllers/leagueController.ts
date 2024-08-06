import mysql, {Connection} from 'mysql2/promise';
import {User} from "../types/Types";

export interface LeagueLevel {
    level: string;
    maxEnergy: number;
    minCoins: number;
    maxCoins: number;
}

interface Level {
    minProgress: number;
    maxProgress: number;
}

interface UserLeague {
    userName: string;
    coins: number;
    imageAvatar?: string | null;
}

class LeagueController {
    constructor(private db: Connection) {
    }

    async getAllLeagueLevels(): Promise<LeagueLevel[]> {
        const leagueLevelsSql = `SELECT * FROM leagueLevels`;
        const [rows] = await this.db.execute(leagueLevelsSql);
        return rows as LeagueLevel[];
    }

    async getUsersByLeagueLevels(levels: Level[]): Promise<UserLeague[][]> {
        const allUsersSql = `SELECT userName, coins, imageAvatar FROM users`;
        const [rows] = await this.db.execute<mysql.RowDataPacket[]>(allUsersSql);
        const allUsers =  rows as UserLeague[];
        const usersByLevels: UserLeague[][] = levels.map(() => []);

        allUsers.forEach(user => {
            levels.forEach((level: Level, index: number) => {
                if (user.coins >= level.minProgress && user.coins < level.maxProgress) {
                    usersByLevels[index].push(user);
                }
            });
        });

        return usersByLevels;
    }
}

export default LeagueController;