// Desktop left navigation sidebar.
// Contains main navigation links and the "New Post" CTA.

"use client";

import React from "react";
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
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const LeftSidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="hidden lg:flex flex-col h-screen sticky top-0 w-64 bg-surface-container-lowest border-r border-outline-variant py-10 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary leading-tight">
          Editorial
          <br />
          Pulse
        </h1>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 py-3 px-4 rounded-lg transition-colors",
                isActive
                  ? "text-on-surface font-bold border-l-4 border-primary pl-3 bg-surface-container-low"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low",
              )}
            >
              <item.icon size={20} fill={isActive ? "currentColor" : "none"} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Button className="w-full mt-6 mb-8">New Post</Button>

      <div className="mt-auto flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant">
        <Avatar src={user?.avatar} alt={user?.first_name || "User"} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-on-surface truncate">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-xs text-on-surface-variant truncate">
            @{user?.nickname || "username"}
          </p>
        </div>
        <button
          onClick={logout}
          className="text-on-surface-variant hover:text-primary transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
