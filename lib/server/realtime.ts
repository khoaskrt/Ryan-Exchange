import { WALLET_SOCKET_EVENTS, type WalletDepositSocketEvent } from "@/lib/socket/events";

type SocketServerLike = {
  to: (room: string) => {
    emit: (event: string, payload: unknown) => void;
  };
};

function getSocketServer() {
  return (globalThis as { __walletSocketIo?: SocketServerLike }).__walletSocketIo;
}

export function emitWalletDepositUpdateToUser(userId: string, event: WalletDepositSocketEvent) {
  const io = getSocketServer();
  if (!io) return false;

  io.to(`user:${userId}`).emit(WALLET_SOCKET_EVENTS.DEPOSIT_UPDATED, event);
  return true;
}
