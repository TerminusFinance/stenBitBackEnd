import axios from "axios";
import {botToken} from "../../config";
import {Address} from "ton-core";

export interface ResultCheckNftItem {
    state: boolean;
}

interface NftOwner {
    address: string;
    is_scam: boolean;
    is_wallet: boolean;
}

interface NftCollection {
    address: string;
    name: string;
    description: string;
}

interface NftMetadata {
    image: string;
    attributes: { trait_type: string; value: string }[];
    content_url: string;
    description: string;
    content_type: string;
    name: string;
}

interface NftPreview {
    resolution: string;
    url: string;
}

interface NftItem {
    address: string;
    index: number;
    owner: NftOwner;
    collection: NftCollection;
    verified: boolean;
    metadata: NftMetadata;
    previews: NftPreview[];
    trust: string;
}

interface ApiResponse {
    nft_items: NftItem[];
    error?: string;
}


export const sendToCheckUserHaveNftFromCollections = async (
    userAddress: string,
    collectionAddress: string
): Promise<ResultCheckNftItem> => {
    try {

        const url = `https://tonapi.io/v2/accounts/${userAddress}/nfts`;
        const params = {
            collection: collectionAddress,
            limit: 1000,
            offset: 0,
            indirect_ownership: false
        };

        const response = await axios.get<ApiResponse>(url, {params});

        if (response.data.error) {
            console.error('API Error:', response.data.error);
            return {state: false};
        }

        return {state: response.data.nft_items.length > 0};
    } catch (error) {
        console.error('Error fetching NFTs:', error);
        return {state: false};
    }
};


export async function isUserSubscribed(userId: number, channelId: string): Promise<boolean> {
    try {
        try {
            const response = await axios.get(`https://api.telegram.org/bot${botToken}/getChatMember`, {
                params: {
                    chat_id: channelId,
                    user_id: userId
                }
            });

            const {status} = response.data.result;

            if (status === 'member' || status === 'administrator' || status === 'creator') {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error checking subscription:', error);
            return false;
        }
        console.error('Error checking user subscription:');
        return false
    } catch (error) {
        console.error('Error checking user subscription:', error);
        return false;
    }
}


interface Account {
    address: string;
    is_scam: boolean;
    is_wallet: boolean;
}

interface Jetton {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image: string;
    verification: string;
}

interface JettonTransferAction {
    sender: Account;
    recipient: Account;
    senders_wallet: string;
    recipients_wallet: string;
    amount: string;
    jetton: Jetton;
}

interface TonTransferAction {
    sender: Account;
    recipient: Account;
    amount: bigint;
    comment: string;
}

interface SimplePreview {
    name: string;
    description: string;
    value: string;
    value_image?: string;
    accounts: Account[];
}

interface Action {
    type: string;  // "JettonTransfer" | "TonTransfer" и т.д.
    status: string;  // "ok" и другие возможные статусы
    JettonTransfer?: JettonTransferAction;
    TonTransfer?: TonTransferAction;
    simple_preview: SimplePreview;
    base_transactions: string[];
}

interface Event {
    event_id: string;
    account: Account;
    timestamp: number;
    actions: Action[];
    is_scam: boolean;
    lt: number;
    in_progress: boolean;
    extra: number;
}

interface EventsResponse {
    events: Event[];
    next_from: number;
}

function getUnixTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

export async function CheckTransactions(userId: string,wallet: string, amount: bigint, walletReceiver: string): Promise<boolean | string> {
    try {
        try {
            const currentDate = new Date();
            const endDate = getUnixTimestamp(currentDate); // текущая дата
            const startDate = getUnixTimestamp(new Date(currentDate.getTime() - 30 * 60 * 1000));
            console.log("endDate - ",endDate)
            console.log("startDate - ",startDate)
            const parsetAddress = Address.parse(walletReceiver)
            // const response = await axios.get<EventsResponse>(`https://testnet.tonapi.io/v2/accounts/${wallet}/events?limit=50&end_date=${endDate}&start_date=${startDate}&subject_only=true`)
            const response = await axios.get<EventsResponse>(`https://tonapi.io/v2/accounts/${wallet}/events?limit=50&end_date=${endDate}&start_date=${startDate}&subject_only=true`)
            const parsedResponse = response.data
            console.log("parsetAddress - ",parsetAddress.toRawString())
            console.log("parsedResponse - ",parsedResponse)
            const filteredEvents = parsedResponse.events.filter(event =>
                event.actions.some(action =>
                    action.type === 'TonTransfer' &&
                    action.status === 'ok' &&
                    action.TonTransfer?.amount == amount &&
                    action.TonTransfer?.comment == userId
                )
            );

            if(filteredEvents.length == 0) {
                return "the transaction was not perfect"
            } else {
                return true
            }

        } catch (error) {
            console.error('Error checking subscription:', error);
            return false;
        }

    } catch (error) {
        console.error('Error checking user subscription:', error);
        return false;
    }
}

