import { Database } from 'sqlite';

export interface LeagueLevel {
    level: string;
    maxEnergy: number;
    minCoins: number;
    maxCoins: number;
}

class LeagueController {
    constructor(private db: Database) {}

    async getAllLeagueLevels(): Promise<LeagueLevel[]> {
        const leagueLevelsSql = `SELECT * FROM leagueLevels`;
        const leagueLevels = await this.db.all(leagueLevelsSql);
        return leagueLevels;
    }
}

export default LeagueController;
