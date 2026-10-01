"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Mail, ShieldAlert } from "lucide-react";
import { api } from "../../services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your corporate email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.forgotPassword({ email: email.trim() });
      setSuccessMessage(res.message || "If the account exists, password reset instructions have been sent.");
    } catch (err: any) {
      // In case of network error, show error or generic message
      setErrorMessage(err.message || "Unable to submit request. Please try again later.");
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
          Reset Your Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Enter your email to receive a secure, single-use password reset link
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

          {successMessage ? (
            <div
              role="status"
              className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex flex-col space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
              </div>
              <div className="pt-2 border-t border-emerald-800/40 text-slate-300">
                Please check your inbox (and spam folder) for instructions. The reset link is valid for 1 hour.
              </div>
              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs font-semibold text-[#8CC63E] hover:underline"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="forgot_email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="forgot_email"
                    type="email"
                    name="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-[#0D1322] border border-[#1E293B] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#008638] focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#008638] hover:bg-[#006B2D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008638] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Instructions...
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
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
                  Remember your password? Sign In
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
