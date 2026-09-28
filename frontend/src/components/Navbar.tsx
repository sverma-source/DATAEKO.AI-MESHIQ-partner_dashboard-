"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "../services/api";
import { Activity, Building2, CheckCircle2, ShieldAlert } from "lucide-react";
import { UserMenu } from "./UserMenu";

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
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E6EE] bg-white text-[#172033] shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8 gap-3">
        {/* Top-Left: Official meshIQ Logo & Subtitle */}
        <div className="flex items-center space-x-3 shrink-0">
          <Image
            src="/meshiq-logo.png"
            alt="meshIQ"
            width={708}
            height={135}
            unoptimized
            priority
            className="h-6 sm:h-7 w-auto object-contain shrink-0"
          />
          <div className="hidden lg:block border-l border-[#E2E6EE] pl-3">
            <span className="text-xs font-bold text-[#172033] block leading-tight">
              Economic Assessment Platform
            </span>
            <span className="text-[10px] text-[#667085] block leading-tight font-medium">
              Enterprise Middleware Analytics
            </span>
          </div>
        </div>

        {/* Center: Dominant Customer & Workspace Context */}
        <div className="flex-1 max-w-xl mx-2 flex justify-center">
          {customerName ? (
            <div className="flex items-center space-x-2.5 bg-[#F8FAFC] px-3.5 py-1.5 rounded-lg border border-[#E2E6EE] shadow-2xs w-full sm:w-auto">
              <Building2 className="h-4 w-4 text-[#008638] shrink-0" />
              <div className="flex items-baseline space-x-2 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[#172033] truncate">
                  {customerName}
                </span>
                <span className="text-[#CBD2DE] text-xs">•</span>
                <span className="text-[11px] text-[#667085] truncate max-w-[200px] font-medium">
                  {assessmentTitle || "IBM MQ Discovery"}
                </span>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2 text-xs text-[#667085]">
              <span className="font-semibold text-[#172033]">IBM MQ Economic Cost &amp; Efficiency Assessment</span>
            </div>
          )}
        </div>

        {/* Top-Right: Subtle Metadata, User Profile & DATAEKO Logo */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 text-xs shrink-0">
          {/* Subtle Technical Metadata Cluster */}
          <div className="hidden sm:flex items-center space-x-2 pl-2 text-[11px] text-[#667085]">
            <span className="font-mono text-[10px] text-[#667085] bg-[#F1F3F7] px-2 py-0.5 rounded border border-[#E2E6EE]">
              Engine v{engineVersion}
            </span>
            <span
              className={`inline-flex items-center space-x-1 font-medium ${
                backendHealth === "healthy"
                  ? "text-[#008638]"
                  : backendHealth === "checking"
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  backendHealth === "healthy"
                    ? "bg-[#38B449]"
                    : backendHealth === "checking"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-[10px]">
                {backendHealth === "healthy" ? "Connected" : backendHealth === "checking" ? "Connecting" : "Offline"}
              </span>
            </span>
          </div>

          {/* User Menu */}
          <UserMenu />

          {/* Official DATAEKO Partner Logo */}
          <div className="flex items-center pl-3 sm:pl-4 border-l border-[#E2E6EE]">
            <Image
              src="/dataeko-logo.png"
              alt="DATAEKO.AI"
              width={638}
              height={106}
              unoptimized
              priority
              className="h-6 sm:h-7 w-auto object-contain shrink-0"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
