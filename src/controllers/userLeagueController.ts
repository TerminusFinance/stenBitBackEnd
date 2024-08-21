import {Connection, FieldPacket, RowDataPacket} from "mysql2/promise";
import {LabeledPrice} from "node-telegram-bot-api";
import AcquisitionsController from "./acquisitionsController";
import {SubscriptionOptions} from "./premiumController";
export interface UserLeague {
    leagueId: number;
    userId: string;
    userName: string;
    imageAvatar: string;
    score: number;
    buyscore: number;
    freescore: number;
    reward: number;
}

class UserLeagueController {
    constructor(private db: Connection) {}


    async getListSubscriptionOptions(): Promise<{ name: string, price: number }[]> {
        const prices = [
            { name: '1500 rating', price: 150 },
            { name: '3500 rating', price: 350 },
            { name: '5500 rating', price: 550 },
            { name: '10000 rating', price: 1000 },
            { name: '25000 rating', price: 2500 }
        ];

        return prices;
    }

    // Получение всех пользователей лиги
    async getAllUserLeagues(): Promise<UserLeague[]> {
        const query = 'SELECT * FROM UserLeague';
        const [rows] = await this.db.execute(query);
        console.log("rows - ", rows)
        return rows as UserLeague[];
    }

    async getUserLeagueById(userId: string): Promise<UserLeague | null> {
        // Проверка существующей записи
        const selectQuery = 'SELECT * FROM UserLeague WHERE userId = ?';
        const [rows] = await this.db.execute(selectQuery, [userId]);
        let userLeague = (rows as UserLeague[])[0];


        if (!userLeague) {
            const insertQuery = `
            INSERT INTO UserLeague (userId, userName, imageAvatar, score, buyscore, freescore)
            SELECT u.userId, u.userName, u.imageAvatar, 0, 0, 0
            FROM users u
            WHERE u.userId = ?
        `;
            await this.db.execute(insertQuery, [userId]);

            // Повторная попытка получить созданную запись
            const [newRows] = await this.db.execute(selectQuery, [userId]);
            userLeague = (newRows as UserLeague[])[0];
        }

        return userLeague || null;
    }


    // Обновление рейтинга пользователя
    async updateUserLeagueScore(userId: string, scoreIncrement: number, source: 'buyscore' | 'freescore'): Promise<void> {
        const userLeague = await this.getUserLeagueById(userId);

        if (!userLeague) {
            throw new Error(`User with ID ${userId} not found in UserLeague`);
        }

        let updatedScore = userLeague.score + scoreIncrement;
        let updatedBuyScore = userLeague.buyscore;
        let updatedFreeScore = userLeague.freescore;

        if (source === 'buyscore') {
            updatedBuyScore += scoreIncrement;
        } else if (source === 'freescore') {
            updatedFreeScore += scoreIncrement;
        }

        const updateQuery = `
            UPDATE UserLeague
            SET score = ?, buyscore = ?, freescore = ?
            WHERE userId = ?
        `;
        await this.db.execute(updateQuery, [updatedScore, updatedBuyScore, updatedFreeScore, userId]);
    }

    async upRatingForBoostStars(userId: string, priceSender: number, idBuying: "upUsLv_150" | "upUsLv_350" |"upUsLv_550"|"upUsLv_1000" |"upUsLv_2500") {
        try {
            // calc added rating
            const valueAfterUnderscore = parseInt(idBuying.split('_')[1], 10);
            const newAddedRating = valueAfterUnderscore * 10;

            await this.updateUserLeagueScore(userId, newAddedRating, 'buyscore');
        } catch (e) {
            console.error('Error updating rating for boost stars:', e);

        }
    }

    async boostUserLevels(chat_id: string, selectedSubscriptionOptions: SubscriptionOptions) {
        let resultAmount: number;

        if (![150, 350, 550, 1000, 2500].includes(selectedSubscriptionOptions.price)) {
            throw new Error('This service does not exist');
        }

        resultAmount = selectedSubscriptionOptions.price;

        const currentLabeledPrice: LabeledPrice[] = [{
            label: `upUsLv_${selectedSubscriptionOptions.name}`,
            amount: selectedSubscriptionOptions.price
        }];

        const title = `Upp user league rating ${selectedSubscriptionOptions.name}`;
        const description = 'Upp clan rating to terminus app';
        const currency = 'XTR';
        const payload = 'Payload info';

        const acquisitionsController = new AcquisitionsController(this.db)
        const resultPayment = await acquisitionsController.sendPayment(chat_id, title, description, payload, currency, currentLabeledPrice, `upUsLv_${selectedSubscriptionOptions.price}`);
        console.log('resultPayment - ', resultPayment);
        return resultPayment;
    }



    public async distributeWeeklyRewards() {

        try {

            // Получаем топ-3 пользователей по очкам
            const [topUsers] = await this.db.execute(`
                SELECT userId, score 
                FROM UserLeague 
                ORDER BY score DESC 
                LIMIT 3
            `);

            if ((topUsers as any[]).length === 0) {
                console.log('No users to distribute rewards to.');
                return;
            }

            // Определяем награды для каждого места
            const rewards = [200, 100, 50]; // Награды для 1-го, 2-го и 3-го мест

            // Начисляем награды и сбрасываем очки
            for (let i = 0; i < (topUsers as any[]).length; i++) {
                const user = (topUsers as any[])[i];
                const reward = rewards[i];

                // Обновляем данные о награде в UserLeague
                await this.db.execute(`
                    UPDATE UserLeague
                    SET reward = reward + ?
                    WHERE userId = ?
                `, [reward, user.userId]);
            }

            // Подтверждаем транзакцию
            console.log('Rewards distributed successfully.');
            return "Success Rewards"
        } catch (error) {
            console.error('Error distributing rewards:', error);
            throw error;
        }
    }


}

export default UserLeagueController;
