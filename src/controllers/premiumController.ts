import { Connection } from 'mysql2/promise';
import axios from 'axios';
import { botToken } from '../../config';
import ClanController from './clanController';

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
    constructor(private db: Connection) {}

    async getListSubscriptionOptions(): Promise<SubscriptionOptions[]> {
        const prices: SubscriptionOptions[] = [
            { name: '7 days', price: 7 },
            { name: '14 days', price: 12 },
            { name: '1 month', price: 25 }
        ];

        return prices;
    }

    async buyPremium(chat_id: string, selectedSubscriptionOptions: SubscriptionOptions) {
        const course = 0.021;
        let resultAmount: number;

        const directAmounts = [7, 1000, 5000, 10000, 25000, 50000];

        if (![7, 12, 25, 1000, 5000, 10000, 25000, 50000].includes(selectedSubscriptionOptions.price)) {
            throw new Error('This service does not exist');
        }

        if (directAmounts.includes(selectedSubscriptionOptions.price)) {
            resultAmount = selectedSubscriptionOptions.price;
        } else {
            // Рассчитываем значение по курсу для остальных
            resultAmount = Math.round(selectedSubscriptionOptions.price / course);
        }

        const currentLabeledPrice: LabeledPrice[] = [{
            label: `Premium to ${selectedSubscriptionOptions.name}`,
            amount: resultAmount
        }];

        const title = `Premium to ${selectedSubscriptionOptions.name}`;
        const description = 'The premium to terminus app';
        const currency = 'XTR';
        const payload = 'Payload info';

        const resultPayment = await this.sendPayment(chat_id, title, description, payload, currency, currentLabeledPrice);
        console.log('resultPayment - ', resultPayment);
        return resultPayment;
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
            throw error;
        }
    }

    async subscriptionProcessing(providerPaymentChargeId: string, totalAmount: number) {
        const id = providerPaymentChargeId.split('_')[0];

        const clanController = new ClanController(this.db);

        if (totalAmount === 1190) {
            await this.updateSubscription(id, 31, totalAmount);
        } else if (totalAmount === 571) {
            await this.updateSubscription(id, 14, totalAmount);
        } else if ([1000, 5000, 10000, 25000, 50000].includes(totalAmount)) {
            await clanController.increaseClanRating(id, totalAmount);
        } else if (totalAmount === 7) {
            await this.updateSubscription(id, 7, totalAmount);
        }

        return true;
    }

    async updateSubscription(userId: string, days: number, amountSpent: number): Promise<void> {
        const currentDate = new Date();

        const selectEndDateSql = 'SELECT endDateOfWork FROM premium WHERE userId = ?';
        const [existingSubscriptionRows] = await this.db.execute(selectEndDateSql, [userId]);
        const existingSubscription = (existingSubscriptionRows as any[])[0];

        let baseDate: Date;

        if (existingSubscription && existingSubscription.endDateOfWork) {
            const existingEndDate = new Date(existingSubscription.endDateOfWork);
            baseDate = existingEndDate > currentDate ? existingEndDate : currentDate;
        } else {
            baseDate = currentDate;
        }

        const endDate = new Date(baseDate);
        endDate.setDate(baseDate.getDate() + days);
        const endDateOfWork = endDate.toISOString().split('T')[0];

        const updateSubscriptionSql = `
            INSERT INTO premium (userId, amountSpent, endDateOfWork)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                amountSpent = amountSpent + VALUES(amountSpent),
                endDateOfWork = VALUES(endDateOfWork)
        `;
        await this.db.execute(updateSubscriptionSql, [userId, amountSpent, endDateOfWork]);
        console.error('Update Successful');
    }

    async getPremiumUsers(userId: string): Promise<PremiumItem | null> {
        const premiumSql = 'SELECT amountSpent, endDateOfWork FROM premium WHERE userId = ?';
        const [premiumRows] = await this.db.execute(premiumSql, [userId]);
        const premium = (premiumRows as any[])[0];

        if (!premium) {
            return null;
        }

        return premium as PremiumItem;
    }

    async getAllPremiumUsers(): Promise<any[]> {
        try {
            const sql = 'SELECT userId, amountSpent, endDateOfWork FROM premium';
            const [users] = await this.db.execute(sql);
            return users as any[];
        } catch (error) {
            console.error('Failed to get premium users:', error);
            throw error;
        }
    }
}

export default PremiumController;