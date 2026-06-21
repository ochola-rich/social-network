// Bottom navigation bar for mobile and tablet views.

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/create", label: "Create", icon: PlusCircle, isCenter: true },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 w-full z-50 flex justify-around items-center h-16 bg-surface/90 backdrop-blur-xl border-t border-outline-variant shadow-lg pb-safe">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center transition-all active:scale-90 duration-200",
              item.isCenter
                ? "text-primary"
                : isActive
                  ? "text-primary"
                  : "text-on-surface-variant",
            )}
          >
            <item.icon
              size={item.isCenter ? 32 : 24}
              fill={isActive ? "currentColor" : "none"}
            />
            <span className="text-[10px] font-semibold mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
