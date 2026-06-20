// Login page with split layout (Illustration left, Form right).
// Uses React Hook Form for validation and Zustand for state management.

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();
  const [serverError, setServerError] = React.useState("");

  const onSubmit = async (data: LoginForm) => {
    setServerError("");
    try {
      const response = await apiClient.post("/api/auth/login", data);
      setUser(response.data.user);
      router.push("/");
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ||
          "Login failed. Please check your credentials.",
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side: Branding/Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-container-low items-center justify-center p-12 border-r border-outline-variant">
        <div className="max-w-md text-center">
          <h1 className="text-5xl font-bold text-primary mb-6">
            Editorial Pulse
          </h1>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Curating the intersection of high fashion, brutalist architecture,
            and digital culture.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-container-lowest">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-on-surface">Welcome Back</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Sign in to continue your curated feed.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
              <div className="p-3 rounded-lg bg-error/10 text-error text-sm font-medium">
                {serverError}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "Invalid email format",
                },
              })}
              error={errors.email?.message}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register("password", { required: "Password is required" })}
              error={errors.password?.message}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-on-surface-variant">
                <input
                  type="checkbox"
                  className="rounded border-outline-variant text-primary focus:ring-primary"
                />
                Remember me
              </label>
              <a href="#" className="font-medium text-primary hover:underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="font-bold text-primary hover:underline"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
