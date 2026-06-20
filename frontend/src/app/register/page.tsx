// Registration page with two-column layout.
// Captures all required fields per the backend specification.

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";

type RegisterForm = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  date_of_birth: string;
  nickname?: string;
  about_me?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();
  const [serverError, setServerError] = React.useState("");

  const onSubmit = async (data: RegisterForm) => {
    setServerError("");
    try {
      const response = await apiClient.post("/api/auth/register", data);
      // After registration, fetch the full user profile
      const profileRes = await apiClient.get("/api/auth/me");
      setUser(profileRes.data.user);
      router.push("/");
    } catch (err: any) {
      setServerError(
        err.response?.data?.error || "Registration failed. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-surface-container-lowest border border-outline-variant rounded-xl shadow-editorial p-8 lg:p-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Editorial Pulse
          </h1>
          <h2 className="text-2xl font-bold text-on-surface">Create Account</h2>
          <p className="text-sm text-on-surface-variant mt-2">
            Join the curated network.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div className="p-3 rounded-lg bg-error/10 text-error text-sm font-medium">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="First Name"
              placeholder="John"
              {...register("first_name", {
                required: "First name is required",
              })}
              error={errors.first_name?.message}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              {...register("last_name", { required: "Last name is required" })}
              error={errors.last_name?.message}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" },
            })}
            error={errors.email?.message}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            error={errors.password?.message}
          />

          <Input
            label="Date of Birth"
            type="date"
            {...register("date_of_birth", {
              required: "Date of birth is required",
            })}
            error={errors.date_of_birth?.message}
          />

          <Input
            label="Nickname (Optional)"
            placeholder="@username"
            {...register("nickname")}
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              About Me (Optional)
            </label>
            <textarea
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all min-h-[100px]"
              placeholder="Tell us about yourself..."
              {...register("about_me")}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isSubmitting}
          >
            Create Account
          </Button>

          <p className="text-center text-sm text-on-surface-variant">
            Already have an account?{" "}
            <a href="/login" className="font-bold text-primary hover:underline">
              Login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
