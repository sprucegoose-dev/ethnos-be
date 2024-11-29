export interface IUndoApprovalController  {

}

export interface IUndoApprovalStatic {

}

export interface IUndoApproval  {

}

export interface IUndoApproval {
    id: number;
    gameId: number;
    playerId: number;
    undoRequestId: number;
    state: UndoRequestState;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUndoApprovalOption {
    label: string;
    value: UndoRequestState;
}

export enum UndoRequestState {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export interface IUndoRequestResponse {
    description: string;
    options: IUndoApprovalOption[];
    canRequestUndo: boolean;
    playerId: number;
    requiredApprovals: IUndoApproval[];
    state: UndoRequestState;
    undoRequestId: number;
}

export interface ICanRequestUndo {
    canRequest: boolean;
    error: string;
}
