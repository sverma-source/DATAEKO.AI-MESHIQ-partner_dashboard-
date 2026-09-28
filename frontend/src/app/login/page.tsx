"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#0D1322] text-slate-100">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center space-x-3.5 bg-[#172033]/90 px-6 py-3.5 rounded-xl border border-[#1E293B] shadow-lg backdrop-blur-sm">
            <Image
              src="/dataeko-logo.png"
              alt="DATAEKO"
              width={638}
              height={106}
              unoptimized
              priority
              className="h-4.5 sm:h-5 w-auto object-contain shrink-0"
            />
            <span className="text-slate-400 text-sm font-mono select-none">×</span>
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
          <p className="text-xs text-slate-400 mt-3 font-medium text-center">
            Enterprise MQ Economic Assessment Platform
          </p>
        </div>

        <h2 className="text-center text-xl font-bold tracking-tight text-white">
          Sign in to your account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Access deterministic assessment discovery, calculation modeling, and reporting
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-[#172033]/90 py-8 px-6 shadow-2xl rounded-2xl border border-[#1E293B] sm:px-10 backdrop-blur-sm">
          {localError && (
            <div
              className="mb-5 flex items-start space-x-2.5 rounded-lg bg-rose-950/80 border border-rose-800/60 p-3 text-xs text-rose-200"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{localError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
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
                  className="block w-full pl-9 pr-3 py-2.5 bg-[#0D1322] border border-[#1E293B] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#008638] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
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
                  className="block w-full pl-9 pr-3 py-2.5 bg-[#0D1322] border border-[#1E293B] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#008638] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#008638] hover:bg-[#006B2D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008638] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            <div className="mt-6 pt-6 border-t border-[#1E293B]" data-testid="dev-quick-roles">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-[#008638]" />
                Development Quick Roles
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleFillDevCredentials("consultant@dataeko.ai", "Consultant123!")}
                  className="text-left px-2.5 py-1.5 rounded bg-[#0D1322] hover:bg-[#0D1322]/80 border border-[#1E293B] text-slate-300 hover:text-white transition truncate cursor-pointer"
                >
                  <div className="font-medium text-[#8CC63E]">Consultant</div>
                  <div className="text-[10px] text-slate-500 truncate">consultant@dataeko.ai</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDevCredentials("admin@dataeko.ai", "AdminPass123!")}
                  className="text-left px-2.5 py-1.5 rounded bg-[#0D1322] hover:bg-[#0D1322]/80 border border-[#1E293B] text-slate-300 hover:text-white transition truncate cursor-pointer"
                >
                  <div className="font-medium text-[#8CC63E]">Platform Admin</div>
                  <div className="text-[10px] text-slate-500 truncate">admin@dataeko.ai</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Notice & Attribution */}
        <div className="mt-4 text-center space-y-2">
          <p className="text-[11px] text-slate-500">
            Protected by signed JSON Web Tokens (HTTP-only SameSite cookies) and Multi-Tenant RBAC isolation.
          </p>
          <p className="text-[11px] font-semibold text-slate-400 tracking-tight">
            Powered by DATAEKO.AI
          </p>
        </div>
      </div>
    </div>
  );
}
