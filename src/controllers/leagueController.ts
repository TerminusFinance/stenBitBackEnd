import {Database} from 'sqlite';
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
    constructor(private db: Database) {
    }

    async getAllLeagueLevels(): Promise<LeagueLevel[]> {
        const leagueLevelsSql = `SELECT *
                                 FROM leagueLevels`;
        const leagueLevels = await this.db.all(leagueLevelsSql);
        return leagueLevels;
    }

    async getUsersByLeagueLevels(levels: Level[]) {
        const allUsersSql = `
            SELECT userName, coins, imageAvatar
            FROM users
        `;
        const allUsers: UserLeague[] = await this.db.all(allUsersSql);

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
