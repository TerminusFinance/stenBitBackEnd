import axios from "axios";
import {botToken} from "../../config";

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

