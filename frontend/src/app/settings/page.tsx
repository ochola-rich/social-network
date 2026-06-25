// src/app/settings/page.tsx
// The Settings page. Provides a minimalist dashboard for managing account, 
// privacy, and notification preferences.

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { User, Lock, Bell, Shield, HelpCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsCategory = "account" | "privacy" | "notifications" | "help";

const CATEGORIES: { id: SettingsCategory; label: string; icon: React.ElementType }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "privacy", label: "Privacy & Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "help", label: "Help & About", icon: HelpCircle },
];

// Mock Toggle Component for Settings
const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={cn(
      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
      enabled ? "bg-primary-container" : "bg-surface-container-high"
    )}
  >
    <span
      className={cn(
        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
        enabled ? "translate-x-6" : "translate-x-1"
      )}
    />
  </button>
);

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, fetchCurrentUser } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("account");
  
  // Local state for form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  
  // Local state for toggles
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setEmail(user.email);
      setIsProfilePublic(user.is_public);
    }
  }, [user]);

  if (isLoading || !user) return null;

  const renderContent = () => {
    switch (activeCategory) {
      case "account":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="font-headline-sm text-on-surface mb-1">Personal Information</h3>
              <p className="font-body-sm text-on-surface-variant mb-6">Update your name and email address.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="mt-6">
                <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="pt-6 border-t border-outline-variant flex justify-end">
              <Button>Save Changes</Button>
            </div>
          </div>
        );
      
      case "privacy":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="font-headline-sm text-on-surface mb-1">Profile Visibility</h3>
              <p className="font-body-sm text-on-surface-variant mb-6">Control who can see your profile and posts.</p>
              
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex items-center justify-between">
                <div>
                  <p className="font-body-md font-bold text-on-surface">Public Profile</p>
                  <p className="font-body-sm text-on-surface-variant mt-1">Anyone on the platform can view your profile and posts.</p>
                </div>
                <ToggleSwitch enabled={isProfilePublic} onToggle={() => setIsProfilePublic(!isProfilePublic)} />
              </div>
            </div>

            <div>
              <h3 className="font-headline-sm text-on-surface mb-1">Security</h3>
              <p className="font-body-sm text-on-surface-variant mb-6">Manage your password and session security.</p>
              <Button variant="secondary">Change Password</Button>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="font-headline-sm text-on-surface mb-1">Notification Preferences</h3>
              <p className="font-body-sm text-on-surface-variant mb-6">Choose how you want to be notified.</p>
              
              <div className="space-y-4">
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex items-center justify-between">
                  <div>
                    <p className="font-body-md font-bold text-on-surface">Email Notifications</p>
                    <p className="font-body-sm text-on-surface-variant mt-1">Receive daily digests and important updates via email.</p>
                  </div>
                  <ToggleSwitch enabled={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} />
                </div>

                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex items-center justify-between">
                  <div>
                    <p className="font-body-md font-bold text-on-surface">Push Notifications</p>
                    <p className="font-body-sm text-on-surface-variant mt-1">Receive real-time alerts in your browser.</p>
                  </div>
                  <ToggleSwitch enabled={pushNotifs} onToggle={() => setPushNotifs(!pushNotifs)} />
                </div>
              </div>
            </div>
          </div>
        );

      case "help":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="font-headline-sm text-on-surface mb-1">About Editorial Pulse</h3>
              <p className="font-body-sm text-on-surface-variant mb-6">Version 1.0.0 • Built with Next.js & Go</p>
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4">
                <a href="#" className="flex items-center justify-between font-body-md text-on-surface hover:text-primary transition-colors">
                  Terms of Service <ChevronRight size={16} />
                </a>
                <a href="#" className="flex items-center justify-between font-body-md text-on-surface hover:text-primary transition-colors">
                  Privacy Policy <ChevronRight size={16} />
                </a>
                <a href="#" className="flex items-center justify-between font-body-md text-on-surface hover:text-primary transition-colors">
                  Contact Support <ChevronRight size={16} />
                </a>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <MainLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto w-full pb-20">
        <h1 className="font-display-lg text-headline-xl lg:text-display-lg font-bold text-on-surface mb-8">
          Settings
        </h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Navigation */}
          <nav className="w-full md:w-64 flex-shrink-0">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left whitespace-nowrap",
                      isActive 
                        ? "bg-primary/5 text-primary border-l-4 border-primary pl-3 font-bold" 
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    )}
                  >
                    <cat.icon size={18} />
                    <span className="font-body-md text-body-sm">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right Content Area */}
          <main className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 editorial-shadow">
            {renderContent()}
          </main>
        </div>
      </div>
    </MainLayout>
  );
}