"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Lock, Mail, Loader2, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError("Please enter your corporate email address.");
      return;
    }
    if (!password) {
      setLocalError("Please enter your password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email: email.trim(), password });
      router.push("/");
    } catch (err: any) {
      setLocalError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDevCredentials = (devEmail: string, devPass: string) => {
    setEmail(devEmail);
    setPassword(devPass);
    setLocalError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F8FAFC] text-[#172033] relative">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:20px_20px] opacity-70 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center space-x-3.5 bg-white px-6 py-3.5 rounded-xl border border-[#E2E6EE] shadow-xs">
            <Image
              src="/dataeko-logo.png"
              alt="DATAEKO"
              width={638}
              height={106}
              unoptimized
              priority
              className="h-4.5 sm:h-5 w-auto object-contain shrink-0"
            />
            <span className="text-[#8A94A6] text-sm font-mono select-none">×</span>
            <Image
              src="/meshiq-logo.png"
              alt="meshIQ"
              width={708}
              height={135}
              unoptimized
              priority
              className="h-5.5 sm:h-6 w-auto object-contain shrink-0"
            />
          </div>
          <p className="text-xs text-[#5B6579] mt-3 font-medium text-center">
            Enterprise MQ Economic Assessment Platform
          </p>
        </div>

        <h2 className="text-center text-xl sm:text-2xl font-bold tracking-tight text-[#172033]">
          Sign in to your account
        </h2>
        <p className="mt-1.5 text-center text-xs sm:text-sm text-[#5B6579]">
          Access deterministic assessment discovery, calculation modeling, and reporting
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-[#E2E6EE] sm:px-10">
          {localError && (
            <div
              className="mb-5 flex items-start space-x-2.5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{localError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#172033] mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#8A94A6]" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBD2DE] rounded-lg text-sm text-[#172033] placeholder-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#008638] focus:border-transparent transition-colors duration-150"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-[#172033]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#008638] hover:text-[#006B2D] hover:underline transition-colors duration-150"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#8A94A6]" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBD2DE] rounded-lg text-sm text-[#172033] placeholder-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#008638] focus:border-transparent transition-colors duration-150"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-[#008638] hover:bg-[#006B2D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008638] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Development Quick Credentials Helper (Development Only) */}
          {process.env.NODE_ENV !== "production" && (
            <div className="mt-6 pt-5 border-t border-[#E2E6EE]" data-testid="dev-quick-roles">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6579] flex items-center">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-[#008638]" />
                  Development Quick Roles
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Dev Only
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleFillDevCredentials("client@dataeko.ai", "ClientPass123!")}
                  className="text-left px-2.5 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E6EE] hover:border-[#CBD2DE] text-[#334155] transition-colors duration-150 truncate cursor-pointer group"
                >
                  <div className="font-semibold text-xs text-[#008638] group-hover:text-[#006B2D]">Client</div>
                  <div className="text-[10px] text-[#5B6579] truncate mt-0.5">client@dataeko.ai</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDevCredentials("consultant@dataeko.ai", "Consultant123!")}
                  className="text-left px-2.5 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E6EE] hover:border-[#CBD2DE] text-[#334155] transition-colors duration-150 truncate cursor-pointer group"
                >
                  <div className="font-semibold text-xs text-[#008638] group-hover:text-[#006B2D]">Consultant</div>
                  <div className="text-[10px] text-[#5B6579] truncate mt-0.5">consultant@dataeko.ai</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDevCredentials("admin@dataeko.ai", "AdminPass123!")}
                  className="text-left px-2.5 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E6EE] hover:border-[#CBD2DE] text-[#334155] transition-colors duration-150 truncate cursor-pointer group"
                >
                  <div className="font-semibold text-xs text-[#008638] group-hover:text-[#006B2D]">Platform Admin</div>
                  <div className="text-[10px] text-[#5B6579] truncate mt-0.5">admin@dataeko.ai</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Notice & Attribution */}
        <div className="mt-6 text-center space-y-2.5">
          <p className="text-[11px] text-[#5B6579] leading-relaxed max-w-sm mx-auto">
            Protected by signed JSON Web Tokens (HTTP-only SameSite cookies) and Multi-Tenant RBAC isolation.
          </p>
          <div className="flex items-center justify-center space-x-2 text-xs font-medium text-[#5B6579] tracking-tight pt-1">
            <span className="text-[11px] uppercase tracking-wider text-[#8A94A6]">Powered by</span>
            <Image
              src="/dataeko-logo.png"
              alt="DATAEKO.AI"
              width={638}
              height={106}
              unoptimized
              className="h-5 sm:h-5.5 w-auto object-contain shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
