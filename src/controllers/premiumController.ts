import {Database} from "sqlite";
import axios from "axios";
import {botToken} from "../../config";

/**
 *  types
 */
interface LabeledPrice {
    label: string;
    amount: number;
}

interface SubscriptionOptions {
    name: string;
    price: number;
}

export interface PremiumItem {
    amountSpent: number;
    endDateOfWork?: string | null;
}

class PremiumController {
    constructor(private db: Database) {
    }
    async getListSubscriptionOptions(): Promise<SubscriptionOptions[]> {
        const prices: SubscriptionOptions[] = [
            {name: '7 days', price: 7},
            {name: '14 days', price: 12},
            {name: '1 month', price: 25}
        ];

        return prices;
    }

    async buyPremium(chat_id: string, selectedSubscriptionOptions: SubscriptionOptions) {
        let resultAmount = 0
        const course = 0.021
        if(selectedSubscriptionOptions.price == 7) {
            resultAmount = Math.round(selectedSubscriptionOptions.price / course);
        } else if (selectedSubscriptionOptions.price == 12){
            resultAmount = Math.round(selectedSubscriptionOptions.price / course);
        } else if (selectedSubscriptionOptions.price == 25) {
            resultAmount = Math.round(selectedSubscriptionOptions.price / course);
        } else {
            throw new Error("This service does not exist")
        }
        const currentLabeledPrice: LabeledPrice[] = [{
            label: `Premium to ${selectedSubscriptionOptions.name}`,
            amount: resultAmount
        }];

        const title = `Premium to ${selectedSubscriptionOptions.name}`;
        const description = "The premium to terminus app";
        const currency = 'XTR';
        const payload = "Payload info";

        // Отправляем запрос на оплату
        const resultPayment = await this.sendPayment(chat_id, title, description, payload, currency, currentLabeledPrice);
        console.log("resultPayment - ", resultPayment);
        return resultPayment
    }

    async sendPayment(chat_id: string, title: string, description: string, payload: string, currency: string, prices: LabeledPrice[]) {
        const url = `https://api.telegram.org/bot${botToken}/createInvoiceLink`;




        const data = {
            chat_id: chat_id,
            title: title,
            description: description,
            payload: payload,
            currency: currency,
            prices: prices
        };

        try {
            const response = await axios.post(url, data);
            return response.data;
        } catch (error) {
            console.error('Error:', error);
            throw error; // Можно выбросить ошибку для обработки в вызывающем коде
        }
    }

    async subscriptionProcessing(providerPaymentChargeId: string, totalAmount: number) {
        const dayPrem = totalAmount * 0.021
        if(totalAmount == 1190) {
            const id = providerPaymentChargeId.split('_')[0];
            await this.updateSubscription(id, 31, totalAmount)
        } else if(totalAmount == 571) {
            const id = providerPaymentChargeId.split('_')[0];
            await this.updateSubscription(id, 14, totalAmount)
        } else {
            const id = providerPaymentChargeId.split('_')[0];
            await this.updateSubscription(id, 1, totalAmount)
        }
        return true
    }

    async updateSubscription(userId: string, days: number, amountSpent: number): Promise<void> {
        // Получаем текущую дату
        const currentDate = new Date();

        // Получаем существующую дату окончания подписки, если она есть
        const selectEndDateSql = `SELECT endDateOfWork FROM premium WHERE userId = ?`;
        const existingSubscription = await this.db.get(selectEndDateSql, [userId]);

        let baseDate: Date;

        if (existingSubscription && existingSubscription.endDateOfWork) {
            const existingEndDate = new Date(existingSubscription.endDateOfWork);
            baseDate = existingEndDate > currentDate ? existingEndDate : currentDate;
        } else {
            baseDate = currentDate;
        }

        // Добавляем дни к базовой дате
        const endDate = new Date(baseDate);
        endDate.setDate(baseDate.getDate() + days);
        const endDateOfWork = endDate.toISOString().split('T')[0]; // Форматируем дату в YYYY-MM-DD

        // Обновляем поля endDateOfWork и amountSpent для конкретного пользователя
        const updateSubscriptionSql = `
        INSERT INTO premium (userId, amountSpent, endDateOfWork)
        VALUES (?, ?, ?)
        ON CONFLICT(userId) DO UPDATE SET
            amountSpent = amountSpent + excluded.amountSpent,
            endDateOfWork = excluded.endDateOfWork;
    `;
        await this.db.run(updateSubscriptionSql, [userId, amountSpent, endDateOfWork]);
        console.error("Update Successful");
    }


    async getPremiumUsers(userId: string): Promise<PremiumItem | null> {
        const premiumSql = `SELECT amountSpent, endDateOfWork
                        FROM premium
                        WHERE userId = ?`;
        const premium = await this.db.get(premiumSql, [userId]);

        if (!premium) {
            // Если запись не найдена, возвращаем null или другое значение по умолчанию
            return null;
        }

        return premium;
    }

    async getAllPremiumUsers(): Promise<any[]> {

        try {
            const sql = `
                SELECT userId, amountSpent, endDateOfWork
                FROM premium
            `;
            const users = await this.db.all(sql);
            return users;
        } catch (error) {
            console.error("Failed to get premium users:", error);
            throw error;
        }
    }


}

export default PremiumController;