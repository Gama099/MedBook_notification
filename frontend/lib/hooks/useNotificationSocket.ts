"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuthStore } from "@/lib/store/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: string;
}

export const useNotificationSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const socket = io(`${SOCKET_URL}/notifications`, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[NotificationSocket] Connected, registering user:", user.id);
      socket.emit("register_user", { userId: user.id });
    });

    socket.on("disconnect", () => {
      console.log("[NotificationSocket] Disconnected");
    });

    socket.on("notification", (notification: NotificationPayload) => {
      console.log("[NotificationSocket] Notification received:", notification);
      toast(notification.message, {
        icon: "🔔",
      });
    });

    return () => {
      console.log("[NotificationSocket] Cleaning up socket");
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.close();
      }
      socketRef.current = null;
    };
  }, [user]);
};
