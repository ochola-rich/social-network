// Desktop right sidebar containing search, trending topics, and suggested users.

"use client";

import React from "react";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export const RightSidebar: React.FC = () => {
  return (
    <aside className="hidden xl:flex flex-col py-10 px-8 gap-8 h-screen sticky top-0 w-80 bg-surface-container-lowest border-l border-outline-variant overflow-y-auto hide-scrollbar">
      {/* Search */}
      <div className="relative group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors"
          size={18}
        />
        <input
          className="w-full bg-surface-container-low border border-outline-variant rounded-full py-3 pl-12 pr-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm transition-all"
          placeholder="Search Pulse..."
          type="text"
        />
      </div>

      {/* Trending Topics */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-on-surface">Trending Topics</h2>
        <div className="space-y-4">
          <div className="group cursor-pointer">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              FASHION • TRENDING
            </p>
            <p className="font-bold text-on-surface group-hover:text-primary transition-colors">
              #CrimsonRevival
            </p>
            <p className="text-xs text-on-surface-variant">12.4K Posts</p>
          </div>
          <div className="group cursor-pointer">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              DESIGN • TRENDING
            </p>
            <p className="font-bold text-on-surface group-hover:text-primary transition-colors">
              Bento Layouts
            </p>
            <p className="text-xs text-on-surface-variant">8.2K Posts</p>
          </div>
          <div className="group cursor-pointer">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              EDITORIAL • TRENDING
            </p>
            <p className="font-bold text-on-surface group-hover:text-primary transition-colors">
              Modern Typography
            </p>
            <p className="text-xs text-on-surface-variant">15.1K Posts</p>
          </div>
        </div>
        <button className="text-primary text-xs font-bold hover:underline">
          SHOW MORE
        </button>
      </section>

      {/* Curated Voices */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-on-surface">Curated Voices</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Avatar alt="Modern_M" size="md" />
              <div>
                <p className="font-bold text-sm text-on-surface">Modern_M</p>
                <p className="text-xs text-on-surface-variant">
                  @modern.minimalist
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Follow
            </Button>
          </div>
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Avatar alt="Visionary" size="md" />
              <div>
                <p className="font-bold text-sm text-on-surface">Visionary</p>
                <p className="text-xs text-on-surface-variant">@vision.lab</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Follow
            </Button>
          </div>
        </div>
        <button className="text-primary text-xs font-bold hover:underline">
          VIEW ALL
        </button>
      </section>

      {/* Footer Links */}
      <footer className="mt-4 px-2 space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant font-semibold uppercase tracking-wider">
          <a className="hover:text-primary" href="#">
            About
          </a>
          <a className="hover:text-primary" href="#">
            Terms
          </a>
          <a className="hover:text-primary" href="#">
            Privacy
          </a>
        </div>
        <p className="text-[10px] text-outline-variant font-semibold uppercase tracking-widest">
          © 2026 Editorial Pulse Inc.
        </p>
      </footer>
    </aside>
  );
};
