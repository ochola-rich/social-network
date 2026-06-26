// src/components/layout/LeftSidebar.tsx
// Real-time notification badge with 30s polling.
// Zero hardcoded data. All content fetched from backend.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Users,
  Mail,
  Bell,
  User,
  Settings,
  LogOut,
  Plus,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/messages", label: "Messages", icon: Mail },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    hasBadge: true,
  },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const LeftSidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const { data } = await apiClient.get("/api/notifications");
        setUnreadCount(data.unread_count || 0);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <aside className="hidden lg:flex flex-col h-screen sticky top-0 w-64 bg-surface-container-lowest border-r border-outline-variant py-10 px-5">
      {/* Logo */}
      <div className="mb-10 px-2">
        <h1 className="text-2xl font-bold text-primary leading-tight tracking-tight">
          Editorial
          <br />
          Pulse
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200",
                isActive
                  ? "text-on-surface font-bold bg-surface-container-low border-l-4 border-primary pl-3"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low/50",
              )}
            >
              <div className="flex items-center gap-3.5">
                <item.icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "text-primary" : ""}
                />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.hasBadge && unreadCount > 0 && (
                <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* New Post Button */}
      <Button className="w-full mt-6 mb-8 rounded-xl gap-2 font-bold">
        <Plus size={18} strokeWidth={2.5} />
        New Post
      </Button>

      {/* User Card */}
      <div className="mt-auto flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant">
        <Avatar
          src={user?.avatar}
          alt={user?.first_name || "User"}
          size="md"
          className="rounded-xl"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-on-surface truncate">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-xs font-mono text-on-surface-variant truncate">
            @{user?.nickname || "username"}
          </p>
        </div>
        <button
          onClick={logout}
          className="p-1.5 text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-container-high"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
