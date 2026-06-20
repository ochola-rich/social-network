// Main application layout wrapper.
// Orchestrates the 3-column desktop grid and handles mobile responsiveness.

import React from "react";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { MobileNav } from "./MobileNav";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1440px] mx-auto flex flex-row relative">
        <LeftSidebar />

        <main className="flex-1 min-w-0 bg-background lg:max-w-2xl border-r border-outline-variant pb-20 lg:pb-0">
          {children}
        </main>

        <RightSidebar />
        <MobileNav />
      </div>
    </div>
  );
};
