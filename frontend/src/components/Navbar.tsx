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

  const showTechnicalStatus = Boolean(user && user.role !== "CUSTOMER_USER");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E6EE] bg-white text-[#172033] shadow-xs relative">
      {/* meshIQ Brand Accent Hairline */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#008638] via-[#38B449] via-[#8CC63E] 75% to-[#C026D3] 100% pointer-events-none"
      />
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-5 lg:px-6 gap-2 sm:gap-3 lg:gap-4 min-h-[72px] sm:min-h-[76px] py-3 sm:py-3.5">
        {/* Zone 1 (Left): Official meshIQ Logo & Platform Title */}
        <div className="flex items-center space-x-3 sm:space-x-3.5 shrink-0">
          <Image
            src="/meshiq-logo.png"
            alt="meshIQ"
            width={708}
            height={135}
            unoptimized
            priority
            className="h-6.5 sm:h-8 lg:h-8.5 w-auto object-contain shrink-0"
          />
          <div className="hidden 2xl:block border-l border-[#E2E6EE] pl-3 sm:pl-3.5 shrink-0">
            <span className="text-xs sm:text-[13px] font-bold text-[#172033] block leading-tight tracking-tight whitespace-nowrap">
              Economic Assessment Platform
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#5B6579] block leading-tight font-medium mt-0.5 whitespace-nowrap">
              Enterprise Middleware Analytics
            </span>
          </div>
        </div>

        {/* Zone 2 (Center): Workspace Context & Active Session Identifier */}
        <div className="hidden md:flex items-center justify-center shrink-0">
          {user?.role === "CONSULTANT" ? (
            <div
              className="group relative flex items-center space-x-2 bg-[#EEF8F0] hover:bg-[#E5F5E8] px-3.5 sm:px-4 py-2 min-h-[44px] rounded-lg border border-[#A8E2B5] transition-colors duration-150 shadow-2xs cursor-default whitespace-nowrap shrink-0"
              tabIndex={0}
              aria-label="Active workspace: Consultant Workspace, Portfolio and Review"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#008638] shrink-0" aria-hidden="true" />
              <div className="flex items-baseline space-x-1.5 sm:space-x-2">
                <span className="text-xs sm:text-sm font-bold text-[#008638]">
                  Consultant Workspace
                </span>
                <span className="text-[#A8E2B5] text-xs shrink-0 hidden xl:inline" aria-hidden="true">•</span>
                <span className="text-[11px] sm:text-xs text-[#006B2D] font-medium hidden xl:inline">
                  Portfolio &amp; Review
                </span>
              </div>
              <div className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Advisory Portfolio • Scoped to Authorized Tenant
              </div>
            </div>
          ) : user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "CUSTOMER_ADMIN" ? (
            <div
              className="group relative flex items-center space-x-2 bg-[#FAF5FF] hover:bg-[#F3E8FF] px-3.5 sm:px-4 py-2 min-h-[44px] rounded-lg border border-[#E9D5FF] transition-colors duration-150 shadow-2xs cursor-default whitespace-nowrap shrink-0"
              tabIndex={0}
              aria-label={`Active workspace: ${user.role === "PLATFORM_ADMIN" ? "Platform Administration" : user.role === "PARTNER_ADMIN" ? "Partner Administration" : "Customer Administration"}, Governance`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#722F8A] shrink-0" aria-hidden="true" />
              <div className="flex items-baseline space-x-1.5 sm:space-x-2">
                <span className="text-xs sm:text-sm font-bold text-[#722F8A]">
                  {user.role === "PLATFORM_ADMIN" ? "Platform Administration" : user.role === "PARTNER_ADMIN" ? "Partner Administration" : "Customer Administration"}
                </span>
                <span className="text-[#E9D5FF] text-xs shrink-0 hidden xl:inline" aria-hidden="true">•</span>
                <span className="text-[11px] sm:text-xs text-[#581C87] font-medium hidden xl:inline">
                  Governance
                </span>
              </div>
              <div className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Governance Console • Tenant &amp; User Administration
              </div>
            </div>
          ) : customerName ? (
            <div
              className="group relative flex items-center space-x-2 bg-[#F8FAFC] hover:bg-white px-3.5 sm:px-4 py-2 min-h-[44px] rounded-lg border border-[#E2E6EE] hover:border-[#CBD2DE] transition-colors duration-150 shadow-2xs cursor-default whitespace-nowrap shrink-0"
              tabIndex={0}
              aria-label={`Active Customer: ${customerName}, Assessment: ${assessmentTitle || "My Assessment"}`}
            >
              <Building2 className="h-4.5 w-4.5 text-[#008638] shrink-0" />
              <div className="flex items-baseline space-x-1.5 sm:space-x-2">
                <span className="text-xs sm:text-sm font-bold text-[#172033] max-w-[140px] truncate">
                  {customerName}
                </span>
                <span className="text-[#CBD2DE] text-xs shrink-0 hidden xl:inline" aria-hidden="true">•</span>
                <span className="text-[11px] sm:text-xs text-[#5B6579] font-medium hidden xl:inline max-w-[140px] truncate">
                  {assessmentTitle || "My Assessment"}
                </span>
              </div>
              <div className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Customer Assessment Intake • Autosave Active
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2 text-xs text-[#5B6579] min-h-[44px] whitespace-nowrap shrink-0">
              <span className="font-semibold text-[#172033] px-3.5 py-2 min-h-[44px] flex items-center bg-[#F8FAFC] border border-[#E2E6EE] rounded-lg shadow-2xs">
                <span className="hidden xl:inline">IBM MQ Economic Cost &amp; Efficiency Assessment</span>
                <span className="inline xl:hidden">IBM MQ Assessment</span>
              </span>
            </div>
          )}
        </div>

        {/* Zone 3 (Right): Engine Metadata & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs shrink-0">
          {/* Subtle Technical Engine & Health Cluster */}
          {showTechnicalStatus && (
            <div className="hidden lg:flex items-center space-x-1.5 sm:space-x-2 text-[11px] shrink-0">
              {/* Calculation Engine Version Indicator */}
              <div
                className="group relative font-mono text-[10px] sm:text-[11px] text-[#5B6579] bg-[#F1F3F7] hover:bg-[#E8ECF2] px-2 py-0.5 rounded border border-[#E2E6EE] transition-colors duration-150 cursor-help shrink-0"
                tabIndex={0}
                aria-label={`Calculation Engine version ${engineVersion}, Deterministic Decimal arithmetic`}
              >
                <span>Engine v{engineVersion}</span>
                <div className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                  Calculation Engine • Version {engineVersion} • Pure Python Decimal
                </div>
              </div>

              {/* Backend Connectivity Status Indicator */}
              <div
                className={`group relative inline-flex items-center space-x-1.5 font-medium px-2 py-0.5 rounded transition-colors duration-150 cursor-help shrink-0 ${
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
                  className={`h-2 w-2 rounded-full ${
                    backendHealth === "healthy"
                      ? "bg-[#38B449]"
                      : backendHealth === "checking"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-rose-500"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-[10px] sm:text-[11px] font-semibold">
                  {backendHealth === "healthy" ? "Connected" : backendHealth === "checking" ? "Connecting" : "Offline"}
                </span>
                <div className="pointer-events-none absolute -bottom-9 right-0 px-2.5 py-1 bg-[#172033] text-white text-[10px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                  {backendHealth === "healthy" ? "System Status: API Connected • Engine Ready" : "System Status: Connecting to Service..."}
                </div>
              </div>
            </div>
          )}

          {/* User Menu */}
          <div className="shrink-0">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};
