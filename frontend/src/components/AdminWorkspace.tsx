"use client";

import React from "react";
import {
  Activity,
  Building2,
  FileSpreadsheet,
  Globe,
  KeyRound,
  Layers,
  Lock,
  ScrollText,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const AdminWorkspace: React.FC = () => {
  const { user } = useAuth();

  const getAdminScopeLabel = () => {
    switch (user?.role) {
      case "PLATFORM_ADMIN":
        return {
          title: "Platform Superadmin",
          badge: "bg-[#FAF5FF] text-[#722F8A] border-[#E9D5FF]",
          scope: "Global System / Cross-Tenant Scope",
          desc: "Full administrative governance across all tenants, customer organizations, user accounts, and system-wide audit records.",
        };
      case "PARTNER_ADMIN":
        return {
          title: "Partner Administrator",
          badge: "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]",
          scope: "Partner Tenant Scope",
          desc: "Tenant-level governance of partner consultants, assigned customer accounts, assessments, and security logs.",
        };
      case "CUSTOMER_ADMIN":
        return {
          title: "Customer Administrator",
          badge: "bg-slate-100 text-slate-800 border-slate-300",
          scope: "Customer Organization Scope",
          desc: "Organization-level administration of customer respondents and assessment discovery records.",
        };
      default:
        return {
          title: "System Administrator",
          badge: "bg-slate-100 text-slate-700 border-slate-200",
          scope: "Administrative Scope",
          desc: "Administrative governance and platform compliance controls.",
        };
    }
  };

  const scopeInfo = getAdminScopeLabel();

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Admin Workspace Header */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#E2E6EE] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${scopeInfo.badge}`}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              {scopeInfo.title}
            </span>
            <span className="text-xs text-[#667085] font-medium">
              Governance &amp; Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
            Administration &amp; Governance Workspace
          </h1>
          <p className="text-sm text-[#667085] max-w-3xl leading-relaxed">
            {scopeInfo.desc}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-xl bg-[#F8FAFC] p-3.5 border border-[#E2E6EE] text-right">
            <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              {scopeInfo.scope}
            </div>
            <div className="text-xs font-bold text-[#172033] font-mono mt-0.5">
              {user?.tenant_id ? `${user.tenant_id.slice(0, 16)}...` : "System Scope"}
            </div>
          </div>
        </div>
      </div>

      {/* Governance Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-xl bg-white p-5 border border-[#E2E6EE] shadow-2xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">User Management</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Provision and oversee user identities, role assignments, and active account statuses within scope.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 border border-[#E2E6EE] shadow-2xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <Building2 className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">Customer Directory</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Maintain verified enterprise customer organizations, primary contacts, and industry classification metadata.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 border border-[#E2E6EE] shadow-2xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">Assessment Registry</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Monitor assessment lifecycle progression, completion status, and calculation snapshot provenance.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 border border-[#E2E6EE] shadow-2xs space-y-3">
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <ScrollText className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">Audit Trail &amp; Compliance</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Inspect immutable append-only audit trail logs for authentication, submission, and calculation events.
          </p>
        </div>
      </div>

      {/* Administration Shell Placeholder for Batch 4 */}
      <div className="rounded-2xl bg-white border border-[#E2E6EE] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E6EE] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center space-x-2.5">
            <Shield className="h-4 w-4 text-[#722F8A]" />
            <h2 className="text-sm font-bold text-[#172033]">Administrative Controls</h2>
          </div>
          <span className="text-xs text-[#667085] font-medium">
            Management &amp; Audit Tools — Integrated in Batch 4
          </span>
        </div>

        <div className="p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#FAF5FF] text-[#722F8A] flex items-center justify-center border border-[#E9D5FF]">
            <Globe className="h-6 w-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-[#172033]">
              Administrative Workspace Initialized
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              The role-aware landing architecture is active. In Batch 4, this workspace will provide user provisioning, customer entity management, assessment registry oversight, and audit log inspection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
