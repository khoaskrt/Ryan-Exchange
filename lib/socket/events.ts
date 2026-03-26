export const WALLET_SOCKET_EVENTS = {
  CONNECTED: "wallet:connected",
  DEPOSIT_UPDATED: "wallet:deposit-updated",
} as const;

export type DepositStatus = "PENDING" | "COMPLETED" | "FAILED";

export type WalletDepositSocketEvent = {
  txId: string;
  assetCode: string;
  networkCode: string;
  amount: number;
  status: DepositStatus;
  txHash?: string;
  occurredAt: string;
};
