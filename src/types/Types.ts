/**
 * This user class, here returned from request users
 */
export interface User {
    userId: string;
    userName: string;
    coins: number;
    codeToInvite: string;
    address: string;
    referral: string;
    createAt: string;
    dataUpdate: string;
    currentEnergy: number;
    maxEnergy: number;
    lastTapBootUpdate: string;
    completedTasks?: number[];
    boosts?: UserBoost[];
    listUserInvited?: InvitedUser[];
    tasks?: UserTask[];
    imageAvatar? : string | null;
}

export interface UserBoost {
    boostName: string;
    level: number;
    price: number;
    turboBoostUpgradeCount?: number;
    lastTurboBoostUpgrade?: string;
}

export interface InvitedUser {
    userId: string;
    userName: string;
    coinsReferral: number;
}

export interface UserTask {
    taskId: number;
    text: string;
    coins: number;
    checkIcon: string;
    taskType: TaskType;
    type: string;
    completed: boolean;
    lastCompletedDate?: string | null;
    actionBtnTx?: string | null;
    txDescription?: string | null;
    etaps?: number | null;
    dataSendCheck?: string | null;
}

export interface TaskCardProps {
    id: number;
    text: string;
    coins: number;
    completed: boolean;
    checkIcon: string;
    taskType: TaskType;
    type: string;
    actionBtnTx?: string | null;
    txDescription?: string | null;
}

export interface SampleTask {
    type: 'Sample';
}

export interface OpenUrlTask {
    type: 'OpenUrl';
    url: string;
}

export interface CheckNftTask {
    type: 'CheckNft';
    checkCollectionsAddress: string;
}

export interface StockRegTask {
    type: 'StockReg';
    url: string;
}

export interface CheckFriendsTask {
    type: 'CheckFriends';
    numberOfFriends: number;
}

export interface SubscribeToTgTask {
    type: 'SubscribeToTg';
    url: string;
    id: string;
}

export type TaskType = SampleTask | OpenUrlTask | CheckNftTask | CheckFriendsTask | SubscribeToTgTask | StockRegTask;

export const IsCheckNftTask = (taskType: TaskType): taskType is CheckNftTask => {
    return taskType.type === 'CheckNft';
};

export const IsSubscribeToTg = (taskType: TaskType): taskType is SubscribeToTgTask => {
    return taskType.type === 'SubscribeToTg';
};

export const IsOpenUrl = (taskType: TaskType): taskType is OpenUrlTask => {
    return taskType.type === 'OpenUrl';
};

export const IsStockReg = (taskType: TaskType): taskType is StockRegTask => {
    return taskType.type === 'StockReg';
};

export interface Boost {
    boostName: string;
    description: string;
    level: number;
    price: number;
}