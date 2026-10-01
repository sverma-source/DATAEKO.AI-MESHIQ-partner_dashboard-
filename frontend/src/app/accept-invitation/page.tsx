"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { api } from "../../services/api";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("No invitation token found in URL. Please use the exact link sent to your email.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters in length.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.acceptInvitation({
        token,
        new_password: password,
      });
      setSuccessMessage(res.message || "Invitation accepted! Your account is now active.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to accept invitation. The link may be expired or already used.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#0D1322] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center bg-[#172033]/90 px-7 py-3.5 rounded-xl border border-[#1E293B] shadow-lg backdrop-blur-sm">
            <Image
              src="/meshiq-logo.png"
              alt="meshIQ"
              width={708}
              height={135}
              unoptimized
              priority
              className="h-6 sm:h-7 w-auto object-contain shrink-0"
            />
          </div>
          <h1 className="text-sm sm:text-base font-bold text-slate-100 mt-3.5 tracking-tight text-center">
            Economic Assessment Platform
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium text-center">
            Enterprise Middleware Analytics
          </p>
        </div>

        <h2 className="text-center text-xl font-bold tracking-tight text-white">
          Accept Invitation & Set Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Establish your credentials to activate your enterprise dashboard access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-[#172033]/90 py-8 px-6 shadow-2xl rounded-2xl border border-[#1E293B] sm:px-10 backdrop-blur-sm">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-start space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-6 p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-start space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {successMessage}
                <div className="mt-2 text-slate-300">Redirecting to login in 2 seconds...</div>
              </div>
            </div>
          )}

          {!token && !errorMessage ? (
            <div className="text-center py-4 space-y-4">
              <p className="text-sm text-amber-300">
                No invitation token provided. Please check the invitation email and click the link provided.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center text-xs text-[#8CC63E] hover:underline"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="inv_password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="inv_password"
                    type="password"
                    name="password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-[#0D1322] border border-[#1E293B] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#008638] focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inv_confirm_password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="inv_confirm_password"
                    type="password"
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-[#0D1322] border border-[#1E293B] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#008638] focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !!successMessage}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#008638] hover:bg-[#006B2D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008638] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Activating Account...
                    </>
                  ) : (
                    <>
                      <span>Activate & Sign In</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Already have an active account? Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Quiet Enterprise Attribution (Bottom-Right) */}
      <div className="mt-8 sm:mt-0 sm:absolute sm:bottom-6 sm:right-6 flex items-center justify-center sm:justify-end space-x-1.5 text-xs text-slate-400 select-none z-20 pointer-events-auto">
        <span className="text-[10px] text-slate-400 font-normal">Powered by</span>
        <Image
          src="/dataeko-logo.png"
          alt="DATAEKO"
          width={2048}
          height={375}
          unoptimized
          className="w-[66px] sm:w-[78px] h-auto shrink-0"
        />
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D1322] text-slate-200 flex items-center justify-center">Loading...</div>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
