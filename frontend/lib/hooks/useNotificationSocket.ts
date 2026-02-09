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

const notificationMeta: Record<
  string,
  { label: string; icon: string; iconBg: string }
> = {
  BOOKING_REQUESTED: {
    label: "New Booking Received",
    icon: "📅",
    iconBg: "bg-blue-100 text-blue-600",
  },
  BOOKING_ACCEPTED: {
    label: "Booking Accepted",
    icon: "✅",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  BOOKING_REJECTED: {
    label: "Booking Rejected",
    icon: "❌",
    iconBg: "bg-rose-100 text-rose-600",
  },
  BOOKING_CANCELLED: {
    label: "Booking Cancelled",
    icon: "🛑",
    iconBg: "bg-amber-100 text-amber-600",
  },
};

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
      const meta =
        notificationMeta[notification.type] ?? notificationMeta.BOOKING_REQUESTED;

      toast.custom(
        (t) => (
          <div className="flex w-full max-w-sm gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full ${meta.iconBg}`}
            >
              <span className="text-lg">{meta.icon}</span>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {meta.label}
                  </p>
                  <p className="text-xs text-slate-500">Just now</p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="text-slate-400 transition hover:text-slate-600"
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {notification.title}
                </p>
                <p className="text-sm text-slate-600">{notification.message}</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold uppercase">
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ),
        { id: notification.id, duration: 8000 },
      );
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
