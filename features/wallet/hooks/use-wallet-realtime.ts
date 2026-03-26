"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import {
  WALLET_SOCKET_EVENTS,
  type WalletDepositSocketEvent,
} from "@/lib/socket/events";

type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type UseWalletRealtimeOptions = {
  onDepositUpdated: (event: WalletDepositSocketEvent) => void;
};

export function useWalletRealtime({
  onDepositUpdated,
}: UseWalletRealtimeOptions) {
  const [connectionStatus, setConnectionStatus] =
    useState<RealtimeConnectionStatus>("connecting");

  useEffect(() => {
    const socket = io({
      path: "/socket.io",
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      setConnectionStatus("connected");
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setConnectionStatus("error");
    });

    socket.on(WALLET_SOCKET_EVENTS.CONNECTED, () => {
      setConnectionStatus("connected");
    });

    socket.on(WALLET_SOCKET_EVENTS.DEPOSIT_UPDATED, onDepositUpdated);

    return () => {
      socket.off(WALLET_SOCKET_EVENTS.DEPOSIT_UPDATED, onDepositUpdated);
      socket.close();
    };
  }, [onDepositUpdated]);

  return { connectionStatus };
}
