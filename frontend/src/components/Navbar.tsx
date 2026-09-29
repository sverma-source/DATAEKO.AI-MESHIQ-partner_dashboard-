"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "../services/api";
import { Activity, Building2, CheckCircle2, ShieldAlert } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  customerName?: string;
  assessmentTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ customerName, assessmentTitle }) => {
  const { user } = useAuth();
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
        {/* Zone 1 (Left): Official meshIQ Logo & Platform Title */}
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
            <span className="text-xs font-bold text-[#172033] block leading-tight tracking-tight">
              Economic Assessment Platform
            </span>
            <span className="text-[10px] text-[#5B6579] block leading-tight font-medium">
              Enterprise Middleware Analytics
            </span>
          </div>
        </div>

        {/* Zone 2 (Center): Workspace Context & Active Session Identifier */}
        <div className="flex-1 max-w-xl mx-2 flex justify-center">
          {user?.role === "CONSULTANT" ? (
            <div
              className="group relative flex items-center space-x-2.5 bg-[#EEF8F0] hover:bg-[#E5F5E8] px-3.5 py-1.5 rounded-lg border border-[#A8E2B5] transition-colors duration-150 shadow-2xs w-full sm:w-auto cursor-default"
              tabIndex={0}
              aria-label="Active workspace: Consultant Workspace, Portfolio and Review"
            >
              <span className="h-2 w-2 rounded-full bg-[#008638] shrink-0" aria-hidden="true" />
              <div className="flex items-baseline space-x-2 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[#008638] truncate">
                  Consultant Workspace
                </span>
                <span className="text-[#A8E2B5] text-xs" aria-hidden="true">•</span>
                <span className="text-[11px] text-[#006B2D] truncate max-w-[220px] font-medium">
                  Portfolio &amp; Review
                </span>
              </div>
              <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Advisory Portfolio • Scoped to Authorized Tenant
              </div>
            </div>
          ) : user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "CUSTOMER_ADMIN" ? (
            <div
              className="group relative flex items-center space-x-2.5 bg-[#FAF5FF] hover:bg-[#F3E8FF] px-3.5 py-1.5 rounded-lg border border-[#E9D5FF] transition-colors duration-150 shadow-2xs w-full sm:w-auto cursor-default"
              tabIndex={0}
              aria-label={`Active workspace: ${user.role === "PLATFORM_ADMIN" ? "Platform Administration" : user.role === "PARTNER_ADMIN" ? "Partner Administration" : "Customer Administration"}, Governance`}
            >
              <span className="h-2 w-2 rounded-full bg-[#722F8A] shrink-0" aria-hidden="true" />
              <div className="flex items-baseline space-x-2 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[#722F8A] truncate">
                  {user.role === "PLATFORM_ADMIN" ? "Platform Administration" : user.role === "PARTNER_ADMIN" ? "Partner Administration" : "Customer Administration"}
                </span>
                <span className="text-[#E9D5FF] text-xs" aria-hidden="true">•</span>
                <span className="text-[11px] text-[#581C87] truncate max-w-[220px] font-medium">
                  Governance
                </span>
              </div>
              <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Governance Console • Tenant &amp; User Administration
              </div>
            </div>
          ) : customerName ? (
            <div
              className="group relative flex items-center space-x-2.5 bg-[#F8FAFC] hover:bg-white px-3.5 py-1.5 rounded-lg border border-[#E2E6EE] hover:border-[#CBD2DE] transition-colors duration-150 shadow-2xs w-full sm:w-auto cursor-default"
              tabIndex={0}
              aria-label={`Active Customer: ${customerName}, Assessment: ${assessmentTitle || "My Assessment"}`}
            >
              <Building2 className="h-4 w-4 text-[#008638] shrink-0" />
              <div className="flex items-baseline space-x-2 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[#172033] truncate">
                  {customerName}
                </span>
                <span className="text-[#CBD2DE] text-xs" aria-hidden="true">•</span>
                <span className="text-[11px] text-[#5B6579] truncate max-w-[200px] font-medium">
                  {assessmentTitle || "My Assessment"}
                </span>
              </div>
              <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Customer Assessment Intake • Autosave Active
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2 text-xs text-[#5B6579]">
              <span className="font-semibold text-[#172033]">IBM MQ Economic Cost &amp; Efficiency Assessment</span>
            </div>
          )}
        </div>

        {/* Zone 3 (Right): Engine Metadata, User Profile & Official DATAEKO Attribution */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 text-xs shrink-0">
          {/* Subtle Technical Engine & Health Cluster */}
          <div className="hidden sm:flex items-center space-x-2 pl-2 text-[11px]">
            {/* Calculation Engine Version Indicator */}
            <div
              className="group relative font-mono text-[10px] text-[#5B6579] bg-[#F1F3F7] hover:bg-[#E8ECF2] px-2 py-0.5 rounded border border-[#E2E6EE] transition-colors duration-150 cursor-help"
              tabIndex={0}
              aria-label={`Calculation Engine version ${engineVersion}, Deterministic Decimal arithmetic`}
            >
              <span>Engine v{engineVersion}</span>
              <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Calculation Engine • Version {engineVersion} • Pure Python Decimal
              </div>
            </div>

            {/* Backend Connectivity Status Indicator */}
            <div
              className={`group relative inline-flex items-center space-x-1.5 font-medium px-2 py-0.5 rounded transition-colors duration-150 cursor-help ${
                backendHealth === "healthy"
                  ? "text-[#008638] bg-[#EEF8F0]/60 hover:bg-[#EEF8F0]"
                  : backendHealth === "checking"
                  ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                  : "text-rose-700 bg-rose-50 hover:bg-rose-100"
              }`}
              tabIndex={0}
              aria-label={`System Status: ${backendHealth === "healthy" ? "API Connected and Calculation Engine Ready" : backendHealth === "checking" ? "Checking backend connectivity" : "Backend service offline"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  backendHealth === "healthy"
                    ? "bg-[#38B449]"
                    : backendHealth === "checking"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-rose-500"
                }`}
                aria-hidden="true"
              />
              <span className="text-[10px] font-semibold">
                {backendHealth === "healthy" ? "Connected" : backendHealth === "checking" ? "Connecting" : "Offline"}
              </span>
              <div className="pointer-events-none absolute -bottom-8 right-0 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                {backendHealth === "healthy" ? "System Status: API Connected • Engine Ready" : "System Status: Connecting to Service..."}
              </div>
            </div>
          </div>

          {/* User Menu */}
          <UserMenu />

          {/* Official DATAEKO Partner Attribution */}
          <div className="flex items-center pl-3 sm:pl-4 border-l border-[#E2E6EE] space-x-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8A94A6] font-semibold hidden xl:inline">
              Powered by
            </span>
            <Image
              src="/dataeko-logo.png"
              alt="Powered by DATAEKO.AI"
              width={638}
              height={106}
              unoptimized
              priority
              className="h-5 sm:h-6 w-auto object-contain shrink-0"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
