"use client";

import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Activity, Building2, CheckCircle2, ShieldAlert } from "lucide-react";

interface NavbarProps {
  customerName?: string;
  assessmentTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ customerName, assessmentTitle }) => {
  const [backendHealth, setBackendHealth] = useState<"checking" | "healthy" | "disconnected">("checking");
  const [engineVersion, setEngineVersion] = useState<string>("1.0.0");

  useEffect(() => {
    let isMounted = true;
    api.checkHealth()
      .then((data) => {
        if (isMounted) {
          setBackendHealth(data.status === "healthy" ? "healthy" : "disconnected");
          if (data.calculation_engine_version) {
            setEngineVersion(data.calculation_engine_version);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendHealth("disconnected");
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-slate-900 text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand & Platform */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-inner">
            DQ
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold tracking-tight text-white text-base">DATAEKO</span>
              <span className="text-slate-400 text-xs font-mono">×</span>
              <span className="font-semibold tracking-tight text-blue-400 text-base">meshIQ</span>
            </div>
            <p className="text-[11px] text-slate-400">IBM MQ Economic Cost & Efficiency Assessment</p>
          </div>
        </div>

        {/* Active Context */}
        {(customerName || assessmentTitle) && (
          <div className="hidden md:flex items-center space-x-3 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700 text-xs">
            <Building2 className="h-4 w-4 text-blue-400" />
            <div className="flex items-center space-x-2">
              <span className="font-medium text-slate-200">{customerName || "Customer Intake"}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 truncate max-w-[200px]">{assessmentTitle || "Discovery Session"}</span>
            </div>
          </div>
        )}

        {/* Engine & Health Status */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            <span className="text-slate-400">Engine:</span>
            <span className="font-mono text-blue-300 font-semibold">v{engineVersion}</span>
          </div>

          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              backendHealth === "healthy"
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                : backendHealth === "checking"
                ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                : "bg-rose-950/80 text-rose-300 border border-rose-800/60"
            }`}
          >
            {backendHealth === "healthy" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Backend Connected</span>
              </>
            ) : backendHealth === "checking" ? (
              <>
                <Activity className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                <span>Offline Mode</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
