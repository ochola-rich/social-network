// src/app/notifications/page.tsx
// Notifications page — displays real-time notifications and pending follow requests.
// Zero hardcoded data. All content fetched from backend.

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";
import {
  Heart,
  MessageCircle,
  Users,
  UserPlus,
  Calendar,
  Bell,
  UserCheck,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface FollowRequest {
  id: number;
  first_name: string;
  last_name: string;
  avatar: string;
  nickname: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, fetchCurrentUser } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchNotifications = async () => {
    try {
      const { data } = await apiClient.get("/api/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const fetchFollowRequests = async () => {
    try {
      const { data } = await apiClient.get("/api/follow/pending");
      setFollowRequests(data.requests || []);
    } catch (err) {
      console.error("Failed to fetch follow requests:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchFollowRequests();
      setIsLoading(false);
    }
  }, [user]);

  const handleAcceptFollow = async (userId: number) => {
    try {
      await apiClient.post(`/api/follow/accept/${userId}`);
      setFollowRequests((prev) => prev.filter((r) => r.id !== userId));
      fetchNotifications();
    } catch (err) {
      console.error("Failed to accept follow request:", err);
    }
  };

  const handleDeclineFollow = async (userId: number) => {
    try {
      await apiClient.post(`/api/follow/decline/${userId}`);
      setFollowRequests((prev) => prev.filter((r) => r.id !== userId));
    } catch (err) {
      console.error("Failed to decline follow request:", err);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await apiClient.post(`/api/notifications/read/${notificationId}`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="text-primary" size={20} fill="currentColor" />;
      case "comment":
        return <MessageCircle className="text-primary" size={20} />;
      case "follow_request":
      case "follow":
        return <UserPlus className="text-primary" size={20} />;
      case "group_invite":
      case "group_join_request":
        return <Users className="text-primary" size={20} />;
      case "event_created":
        return <Calendar className="text-primary" size={20} />;
      default:
        return <Bell className="text-primary" size={20} />;
    }
  };

  const groupNotificationsByDate = (notifs: Notification[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const groups: {
      today: Notification[];
      thisWeek: Notification[];
      earlier: Notification[];
    } = {
      today: [],
      thisWeek: [],
      earlier: [],
    };

    notifs.forEach((notif) => {
      const notifDate = new Date(notif.created_at);
      notifDate.setHours(0, 0, 0, 0);
      if (notifDate.getTime() === today.getTime()) {
        groups.today.push(notif);
      } else if (notifDate >= thisWeekStart) {
        groups.thisWeek.push(notif);
      } else {
        groups.earlier.push(notif);
      }
    });
    return groups;
  };

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  const grouped = groupNotificationsByDate(notifications);

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <section className="mb-8">
        <h2 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider mb-4">
          {title}
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => !item.is_read && handleMarkAsRead(item.id)}
              className={cn(
                "bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex gap-4 items-start transition-all duration-200 group cursor-pointer relative hover:border-primary/20 hover:shadow-sm",
                item.is_read ? "opacity-70" : "opacity-100",
              )}
            >
              {item.is_read === false && (
                <span className="absolute top-5 right-5 w-2 h-2 bg-primary rounded-full" />
              )}
              <div className="relative flex-shrink-0">
                <Avatar
                  src=""
                  alt="User"
                  size="lg"
                  className="w-12 h-12 rounded-xl"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-surface-container-lowest border border-outline-variant flex items-center justify-center">
                  {getNotificationIcon(item.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-on-surface leading-relaxed pr-6">
                  {item.content}
                </p>
                <p className="text-xs font-mono text-on-surface-variant mt-1.5">
                  {new Date(item.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-on-surface">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-mono font-bold text-primary uppercase tracking-wider hover:underline transition-all"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Follow Requests Section (Actionable) */}
          {followRequests.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider mb-4">
                Follow Requests ({followRequests.length})
              </h2>
              <div className="space-y-3">
                {followRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-surface-container-lowest border-2 border-primary/20 rounded-2xl p-5 flex gap-4 items-center"
                  >
                    <Avatar
                      src={request.avatar}
                      alt={`${request.first_name} ${request.last_name}`}
                      size="lg"
                      className="w-12 h-12 rounded-xl"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface">
                        {request.first_name} {request.last_name}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        @{request.nickname || request.first_name.toLowerCase()}{" "}
                        wants to follow you
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl gap-2"
                        onClick={() => handleAcceptFollow(request.id)}
                      >
                        <UserCheck size={14} /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl gap-2"
                        onClick={() => handleDeclineFollow(request.id)}
                      >
                        <UserX size={14} /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Regular Notifications (Informational) */}
          {notifications.length === 0 && followRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-5">
                <Bell className="text-primary/40" size={32} />
              </div>
              <h2 className="text-xl font-bold text-on-surface mb-2">
                No notifications yet
              </h2>
              <p className="text-on-surface-variant text-sm text-center max-w-sm leading-relaxed">
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
      </div>
    </MainLayout>
  );
}
