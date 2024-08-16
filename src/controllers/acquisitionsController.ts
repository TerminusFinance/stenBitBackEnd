import {Connection} from "mysql2/promise";
import {botToken} from "../../config";
import axios from "axios";
import ClanController from "./clanController";
import PremiumController from "./premiumController";
import UserLeagueController from "./userLeagueController";

export interface AcquisitionsResult {
    userId: string;
    totalAmount: number;
    lastPurchase?: string | null;
    selectedPurchase?: string | null;
    selectedAmount: number;
}


export interface LabeledPrice {
    label: string;
    amount: number;
}

const allowedCategories = [
    'prem_7',
    'prem_12',
    'prem_25',

    'upClan_1000',
    'upClan_5000',
    'upClan_10000',
    'upClan_25000',
    'upClan_50000',

    "upUsLv_150",
    "upUsLv_350",
    "upUsLv_550",
    "upUsLv_1000",
    "upUsLv_2500"
];

class AcquisitionsController {
    constructor(private db: Connection) {
    }

    async getAcquisitions(userId: string) {
        const selectQuery = 'SELECT * FROM acquisitions WHERE userId = ?';
        const [rows] = await this.db.execute(selectQuery, [userId]);
        const userLeague = (rows as AcquisitionsResult[])[0];
        return userLeague || null;
    }

    async sendToPaymentAcquisitions(userId: string, price: number, category: string): Promise<AcquisitionsResult | null> {

        // Проверка, входит ли категория в допустимый список
        if (!allowedCategories.includes(category)) {
            throw new Error(`Invalid category: ${category}. Allowed categories are: ${allowedCategories.join(', ')}`);
        }

        try {
            // Проверка существования записи для пользователя

            const checkQuery = `SELECT *
                                FROM acquisitions
                                WHERE userId = ?`;
            const [rows] = await this.db.execute(checkQuery, [userId]);
            console.log("rows is - ", rows)
            if ((rows as any[]).length === 0) {
                // Если запись не существует, создаем новую запись для пользователя
                const insertQuery = `
                    INSERT INTO acquisitions (userId, totalAmount, lastPurchase, selectedPurchase, selectedAmount)
                    VALUES (?, ?, ?, ?, ?)
                `;
                await this.db.execute(insertQuery, [userId, 0, category, category, price]);
            } else {
                // Если запись существует, обновляем её
                const updateQuery = `
                    UPDATE acquisitions
                    SET lastPurchase     = ?,
                        selectedPurchase = ?,
                        selectedAmount   = ?
                    WHERE userId = ?
                `;
                await this.db.execute(updateQuery, [category, category, price, userId]);
            }

            // Получаем обновленную запись
            const [updatedRows] = await this.db.execute(checkQuery, [userId]);
            const updatedRecord = (updatedRows as AcquisitionsResult[])[0];
            console.log("updatedRecord is - ", updatedRecord)
            return updatedRecord || null;
        } catch (error) {
            console.error('Failed to update acquisitions:', error);
            return null;
        }
    }

    async paymentVerification(userId: string, price: number): Promise<string | { error: string }> {
        try {
            // Проверяем существование записи и получаем данные
            const checkQuery = `SELECT *
                                FROM acquisitions
                                WHERE userId = ?`;
            const [rows] = await this.db.execute(checkQuery, [userId]);
            console.log("paymentVerification rows is - ", rows);

            if ((rows as any[]).length === 0) {
                return {error: 'No acquisition record found for the user.'};
            }

            const acquisition = (rows as AcquisitionsResult[])[0];

            if (!acquisition.selectedPurchase) {
                return {error: 'selectedPurchase is null'};
            }

            // Используем дельту для сравнения чисел с плавающей запятой
            const EPSILON = 0.00001;
            if (Math.abs(acquisition.selectedAmount - price) > EPSILON) {
                throw new Error('The price does not match the selected amount.');
            }

            // Обновляем записи
            const updateQuery = `
                UPDATE acquisitions
                SET totalAmount  = totalAmount + ?,
                    lastPurchase = selectedPurchase
                WHERE userId = ?
            `;
            await this.db.execute(updateQuery, [acquisition.selectedAmount, userId]);

            // Возвращаем selectedPurchase, если все прошло успешно
            return acquisition.selectedPurchase;

        } catch (e) {
            console.error('Error during payment verification:', e);
            return {error: 'An error occurred during payment verification.'};
        }
    }


    async sendPayment(chat_id: string, title: string, description: string, payload: string, currency: string, prices: LabeledPrice[], category: string) {

        if (!prices[0].amount) {
            throw new Error("amount in Prices is empty");
        }

        const resultAcquisitions = await this.sendToPaymentAcquisitions(chat_id, prices[0].amount, category)
        if (resultAcquisitions == null) {
            throw new Error("amount in Prices is empty");
        }

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
        const premiumController = new PremiumController(this.db);
        const userLeagueController = new UserLeagueController(this.db);
        const resultPaymentVerification = await this.paymentVerification(id, totalAmount)

        if (typeof resultPaymentVerification == "object") {
            return resultPaymentVerification.error
        }

        switch (resultPaymentVerification) {
            case "prem_7":
                await premiumController.updateSubscription(id, 7, totalAmount, resultPaymentVerification);
                break;
            case "prem_12":
                await premiumController.updateSubscription(id, 14, totalAmount, resultPaymentVerification);
                break;
            case "prem_25":
                await premiumController.updateSubscription(id, 30, totalAmount, resultPaymentVerification);
                break;
            case "upClan_1000":
                await clanController.increaseClanRating(id, totalAmount, resultPaymentVerification);
                break;
            case "upClan_5000":
                await clanController.increaseClanRating(id, totalAmount, resultPaymentVerification);
                break;
            case "upClan_10000":
                await clanController.increaseClanRating(id, totalAmount, resultPaymentVerification);
                break;
            case "upClan_25000":
                await clanController.increaseClanRating(id, totalAmount, resultPaymentVerification);
                break;
            case "upClan_50000":
                await clanController.increaseClanRating(id, totalAmount, resultPaymentVerification);
                break;

            case "upUsLv_150":
                await userLeagueController.upRatingForBoostStars(id, totalAmount, resultPaymentVerification);
                break;

            case "upUsLv_350":
                await userLeagueController.upRatingForBoostStars(id, totalAmount, resultPaymentVerification);
                break;

            case "upUsLv_550":
                await userLeagueController.upRatingForBoostStars(id, totalAmount, resultPaymentVerification);
                break;

            case "upUsLv_1000":
                await userLeagueController.upRatingForBoostStars(id, totalAmount, resultPaymentVerification);
                break;
            case "upUsLv_2500":
                await userLeagueController.upRatingForBoostStars(id, totalAmount, resultPaymentVerification);
                break;
        }

        return true;
    }
}


export default AcquisitionsController;