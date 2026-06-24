"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { Heart, UserPlus, MessageSquare, Users } from "lucide-react";

interface Notification {
  id: number;
  user_id: number;
  type: string;
  content: string;
  related_user_id: number;
  related_group_id: number;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

const getIcon = (type: string) => {
  switch (type) {
    case "like":
      return <Heart size={16} className="text-primary fill-primary" />;
    case "follow_request":
    case "follow":
      return <UserPlus size={16} className="text-primary" />;
    case "comment":
      return <MessageSquare size={16} className="text-primary" />;
    case "group_invite":
    case "group_join_request":
    case "event_created":
      return <Users size={16} className="text-primary" />;
    default:
      return null;
  }
};

const groupNotificationsByDate = (notifications: Notification[]) => {
  const today = new Date();
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const groups: {
    today: Notification[];
    thisWeek: Notification[];
    earlier: Notification[];
  } = {
    today: [],
    thisWeek: [],
    earlier: [],
  };

  notifications.forEach((notif) => {
    const notifDate = new Date(notif.created_at);
    if (notifDate.toDateString() === today.toDateString()) {
      groups.today.push(notif);
    } else if (notifDate > thisWeek) {
      groups.thisWeek.push(notif);
    } else {
      groups.earlier.push(notif);
    }
  });

  return groups;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, fetchCurrentUser } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const response = await apiClient.get<NotificationsResponse>("/api/notifications");
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unread_count);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const grouped = groupNotificationsByDate(notifications);

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;

    return (
      <section className="mb-10">
        <h2 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">
          {title}
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex gap-4 items-start pulse-hover transition-all group relative",
              )}
            >
              {item.is_read === false && (
                <div className="absolute top-6 right-6 w-2.5 h-2.5 bg-primary rounded-full" />
              )}
              <div className="relative">
                <Avatar src="" alt="User" size="lg" className="!w-12 !h-12 !rounded-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-container-lowest border border-outline-variant flex items-center justify-center">
                  {getIcon(item.type)}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-on-surface font-body-md">{item.content}</p>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              {item.type === "follow_request" && (
                <div className="flex gap-2">
                  <Button variant="primary" size="sm">
                    Confirm
                  </Button>
                  <Button variant="outline" size="sm">
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <MainLayout>
      <div className="p-6 md:p-10 max-w-2xl mx-auto w-full pb-20">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display-lg text-headline-xl lg:text-display-lg font-bold text-on-surface">
            Notifications
          </h1>
          <button 
            onClick={handleMarkAllAsRead}
            className="text-primary font-label-md text-label-md hover:underline"
          >
            MARK ALL AS READ
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-on-surface-variant font-body-lg mb-2">No notifications yet</p>
            <p className="text-on-surface-variant font-body-sm">
              When you get notifications, they'll appear here.
            </p>
          </div>
        ) : (
          <>
            {renderSection("Today", grouped.today)}
            {renderSection("This Week", grouped.thisWeek)}
            {renderSection("Earlier", grouped.earlier)}
          </>
        )}
      </div>
    </MainLayout>
  );
}