"use client";

import React from "react";
import {
  Building2,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Shield,
  Sliders,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const ConsultantWorkspace: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Workspace Header Banner */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#E2E6EE] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
              <Shield className="h-3.5 w-3.5 mr-1" />
              Advisory &amp; Review Workspace
            </span>
            <span className="text-xs text-[#667085] font-medium">
              Consultant Persona
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
            Customer &amp; Assessment Portfolio
          </h1>
          <p className="text-sm text-[#667085] max-w-3xl leading-relaxed">
            Welcome to the Consultant Engagement Workspace. Review client-submitted Q01–Q22 discovery responses, inspect authoritative 12-section economic summaries, analyze ROI projections on the Executive Dashboard, model efficiency scenarios, and generate customer deliverables.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-xl bg-[#F8FAFC] p-3.5 border border-[#E2E6EE] text-right">
            <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Active Tenant Scope</div>
            <div className="text-xs font-bold text-[#172033] font-mono mt-0.5">
              {user?.tenant_id ? `${user.tenant_id.slice(0, 13)}...` : "Partner Scope"}
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Workflow Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl bg-white p-5 border border-[#E2E6EE] shadow-2xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-[#EEF8F0] text-[#008638] flex items-center justify-center border border-[#A8E2B5]">
            <FolderOpen className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">1. Portfolio Review</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Track authorized client assessments across draft, in-progress, and submitted statuses within your partner tenant.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 border border-[#E2E6EE] shadow-2xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-[#EEF8F0] text-[#008638] flex items-center justify-center border border-[#A8E2B5]">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">2. 12-Section Economic Summary</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Inspect customer environment baselines, operational staffing, troubleshooting friction, and authoritative calculation metrics.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 border border-[#E2E6EE] shadow-2xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-[#EEF8F0] text-[#008638] flex items-center justify-center border border-[#A8E2B5]">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">3. Dashboard, Scenarios &amp; Reports</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Present the Executive Dashboard, explore 10% &amp; 25% efficiency scenarios, and download branded PDF/CSV reports.
          </p>
        </div>
      </div>

      {/* Structured Portfolio Shell Placeholder for Batch 3 */}
      <div className="rounded-2xl bg-white border border-[#E2E6EE] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E6EE] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center space-x-2.5">
            <Building2 className="h-4 w-4 text-[#008638]" />
            <h2 className="text-sm font-bold text-[#172033]">Client Assessment Portfolio</h2>
          </div>
          <span className="text-xs text-[#667085] font-medium">
            Full Portfolio Data &amp; Filter Controls — Integrated in Batch 3
          </span>
        </div>

        <div className="p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#EEF8F0] text-[#008638] flex items-center justify-center border border-[#A8E2B5]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-[#172033]">
              Consultant Workspace Foundation Initialized
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              The role-aware landing architecture is active. In Batch 3, this workspace will display the full customer portfolio table, submitted assessment selector, and the structured 12-category economic summary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
