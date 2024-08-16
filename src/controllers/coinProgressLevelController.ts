import { Connection } from "mysql2/promise";
import premiumController from "./premiumController";
import {LabeledPrice} from "node-telegram-bot-api";

// Типы для уровней и прогресса пользователя
interface CoinProgressLevel {
    levelId: number;
    levelName: string;
    description: string;
    price: number;
}

interface UserCoinsProgressLevel {
    userId: string;
    levelId: number;
    levelName: string;
    description: string;
    price: number;
}

class CoinProgressLevelController {
    constructor(private db: Connection) {}



    async createCoinsProgressLevel(levelName: string, description: string, price: number) {
        const insertQuery = `
        INSERT INTO CoinsProgressLevel (levelName, description, price)
        VALUES (?, ?, ?);
    `;

        try {
            await this.db.execute(insertQuery, [levelName, description, price]);
            console.log('New CoinsProgressLevel entry created successfully.');
            return "Success created"
        } catch (error) {
            console.error('Failed to create new CoinsProgressLevel entry:', error);
            throw error;
        }
    }


    async getAllCoinProgressLevels(): Promise<CoinProgressLevel[]> {
        const query = `SELECT * FROM CoinsProgressLevel`;
        const [rows] = await this.db.execute(query);
        if(!rows) {
            return [];
        }
        return rows as CoinProgressLevel[];
    }

    async getUserCoinsProgressLevel(userId: string): Promise<UserCoinsProgressLevel | null> {
        // Запрос для получения текущего уровня пользователя
        const selectQuery = `
        SELECT u.userId, c.levelId, c.levelName, c.description, c.price
        FROM UserCoinsProgressLevel u
        JOIN CoinsProgressLevel c ON u.levelId = c.levelId
        WHERE u.userId = ?
    `;

        // Выполняем запрос
        const [rows] = await this.db.execute(selectQuery, [userId]);
        const result = (rows as any[])[0];

        // Если запись не найдена, создаем новую запись с первым уровнем
        if (!result) {
            const insertQuery = `
            INSERT INTO UserCoinsProgressLevel (userId, levelId)
            VALUES (?, 1)
        `;

            try {
                await this.db.execute(insertQuery, [userId]);
                console.log(`User with userId ${userId} has been assigned to level 1.`);

                // После создания новой записи, снова выполняем запрос для получения данных
                const [newRows] = await this.db.execute(selectQuery, [userId]);
                return (newRows as any[])[0] as UserCoinsProgressLevel;
            } catch (error) {
                console.error('Failed to create new UserCoinsProgressLevel entry:', error);
                return null;
            }
        }

        // Возвращаем результат, если запись существует
        return result as UserCoinsProgressLevel;
    }


    async updateUserCoinsProgressLevel(userId: string, levelId: number): Promise<void> {
        // Сначала проверяем, существует ли запись для этого пользователя
        const selectQuery = `
        SELECT COUNT(*) as count FROM UserCoinsProgressLevel WHERE userId = ?
    `;
        const [rows] = await this.db.execute(selectQuery, [userId]);
        const { count } = (rows as { count: number }[])[0];

        if (count > 0) {
            // Если запись существует, обновляем уровень
            const updateQuery = `
            UPDATE UserCoinsProgressLevel 
            SET levelId = ? 
            WHERE userId = ?
        `;
            await this.db.execute(updateQuery, [levelId, userId]);
        } else {
            const insertQuery = `
            INSERT INTO UserCoinsProgressLevel (userId, levelId)
            VALUES (?, ?)
        `;
            await this.db.execute(insertQuery, [userId, levelId]);
        }
    }

    async uprateLevelUserCoins(userId: string) {
        // Получаем текущий уровень пользователя
        const currentLevel = await this.getUserCoinsProgressLevel(userId);
        if (typeof currentLevel === 'object' && currentLevel !== null) {
            const currentLevelId = currentLevel.levelId;

            // Получаем все доступные уровни
            const allLevels = await this.getAllCoinProgressLevels();

            // Находим следующий уровень по порядку
            const currentLevelIndex = allLevels.findIndex(level => level.levelId === currentLevelId);

            // Проверяем, есть ли следующий уровень
            if (currentLevelIndex !== -1 && currentLevelIndex < allLevels.length - 1) {
                const nextLevel = allLevels[currentLevelIndex + 1];

                // Обновляем уровень пользователя
                // await this.updateUserCoinsProgressLevel(userId, nextLevel.levelId);
                const premController = new premiumController(this.db)

                const currentLabeledPrice: LabeledPrice[] = [{
                    label: `Upgrate coin level`,
                    amount: nextLevel.price
                }];

                const title = `Upgrade coin level to ${nextLevel.levelName}`;
                const description = `${nextLevel.description}`;
                const currency = 'XTR';
                const payload = 'Payload info';

                // const resultPayment = await premController.sendPayment(userId, title, description, payload, currency, currentLabeledPrice);
                // console.log(`User ${userId} upgraded to level ${nextLevel.levelName} (ID: ${nextLevel.levelId})`);
                // console.log('resultPayment - ', resultPayment);
                // return resultPayment;
            } else {
                // Если следующего уровня нет, выбрасываем ошибку
                throw new Error('No higher levels available. The user is already at the maximum level.');
            }
        } else {
            // Если текущий уровень не найден, выбрасываем ошибку
            throw new Error(`User with ID ${userId} not found.`);
        }
    }



}

export default CoinProgressLevelController;
