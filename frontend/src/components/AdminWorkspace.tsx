"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderOpen,
  Globe,
  Hash,
  Info,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Assessment, Customer } from "../types/assessment";

interface AuditEventItem {
  id: string;
  tenant_id: string;
  user_id?: string;
  event_type: string;
  resource_type?: string;
  resource_id?: string;
  status: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export const AdminWorkspace: React.FC = () => {
  const { user, permissions } = useAuth();

  // Active Governance Tab
  const [activeTab, setActiveTab] = useState<"customers" | "assessments" | "audit" | "users">("customers");

  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [assessmentSearch, setAssessmentSearch] = useState<string>("");
  const [assessmentStatusFilter, setAssessmentStatusFilter] = useState<"ALL" | "SUBMITTED" | "DRAFT">("ALL");
  const [selectedCustomerIdFilter, setSelectedCustomerIdFilter] = useState<string>("ALL");
  const [auditFilter, setAuditFilter] = useState<string>("ALL");

  // Read-Only Detail Inspection Modals
  const [inspectingCustomer, setInspectingCustomer] = useState<Customer | null>(null);
  const [inspectingAssessment, setInspectingAssessment] = useState<Assessment | null>(null);

  // Role-Aware Scope Context
  const scopeConfig = useMemo(() => {
    switch (user?.role) {
      case "PLATFORM_ADMIN":
        return {
          title: "Platform Administration",
          badge: "bg-[#FAF5FF] text-[#722F8A] border-[#E9D5FF]",
          scopeLabel: "Global System / Cross-Tenant Scope",
          personaTitle: "Platform Superadmin",
          desc: "Full read-only administrative governance across all authorized partner tenants, customer organizations, assessment registries, and system audit trails.",
        };
      case "PARTNER_ADMIN":
        return {
          title: "Partner Administration",
          badge: "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]",
          scopeLabel: "Partner Tenant Scope",
          personaTitle: "Partner Administrator",
          desc: "Tenant-level governance over authorized customer accounts, assessment registries, and security logs within your partner tenant scope.",
        };
      case "CUSTOMER_ADMIN":
        return {
          title: "Customer Administration",
          badge: "bg-slate-100 text-slate-800 border-slate-300",
          scopeLabel: "Customer Organization Scope",
          personaTitle: "Customer Administrator",
          desc: "Organization-level governance and read-only visibility for your authorized customer organization and submitted assessment records.",
        };
      default:
        return {
          title: "System Administration",
          badge: "bg-slate-100 text-slate-700 border-slate-200",
          scopeLabel: "Administrative Scope",
          personaTitle: "System Administrator",
          desc: "Administrative governance and platform compliance oversight.",
        };
    }
  }, [user?.role]);

  // Fetch Governance Registry Data
  const fetchGovernanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [custList, assList] = await Promise.all([
        api.listCustomers().catch(() => [] as Customer[]),
        api.listAssessments().catch(() => [] as Assessment[]),
      ]);

      setCustomers(custList || []);
      setAssessments(assList || []);

      // Fetch audit logs if authorized
      const canReadAudit = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "CONSULTANT";
      if (canReadAudit) {
        try {
          const logs = await api.listAuditEvents({ limit: 50 });
          setAuditEvents(logs || []);
        } catch {
          setAuditEvents([]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load governance registry data.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchGovernanceData();
  }, [fetchGovernanceData]);

  // Assessment Count Helpers
  const submittedAssessmentsCount = assessments.filter(
    (a) => a.status === "SUBMITTED" || a.status === "CALCULATED" || a.status === "COMPLETED"
  ).length;
  const draftAssessmentsCount = assessments.length - submittedAssessmentsCount;

  // Filtered Customers
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.primary_contact_name || "").toLowerCase().includes(q) ||
      (c.id || "").toLowerCase().includes(q)
    );
  });

  // Filtered Assessments
  const filteredAssessments = assessments.filter((a) => {
    const q = assessmentSearch.toLowerCase().trim();
    const matchesQuery =
      !q ||
      (a.title || "").toLowerCase().includes(q) ||
      (a.id || "").toLowerCase().includes(q) ||
      (a.customer?.name || "").toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (selectedCustomerIdFilter !== "ALL" && a.customer_id !== selectedCustomerIdFilter) {
      return false;
    }

    if (assessmentStatusFilter === "SUBMITTED") {
      return a.status === "SUBMITTED" || a.status === "CALCULATED" || a.status === "COMPLETED";
    }
    if (assessmentStatusFilter === "DRAFT") {
      return a.status === "DRAFT" || a.status === "IN_PROGRESS";
    }

    return true;
  });

  // Filtered Audit Logs
  const filteredAuditEvents = auditEvents.filter((e) => {
    if (auditFilter === "ALL") return true;
    if (auditFilter === "AUTH") return e.event_type.startsWith("USER_");
    if (auditFilter === "CUSTOMER") return e.event_type.startsWith("CUSTOMER_");
    if (auditFilter === "ASSESSMENT") return e.event_type.startsWith("ASSESSMENT_") || e.event_type.startsWith("CALCULATION_");
    return true;
  });

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    const isSubmitted = status === "SUBMITTED" || status === "CALCULATED" || status === "COMPLETED";
    if (isSubmitted) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
          <CheckCircle2 className="h-3 w-3" />
          <span>Submitted</span>
        </span>
      );
    }
    if (status === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="h-3 w-3" />
          <span>In Progress</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <span>Draft</span>
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4" data-testid="admin-workspace">
      {/* Workspace Header Banner */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#E2E6EE] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${scopeConfig.badge}`}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              {scopeConfig.title}
            </span>
            <span className="text-xs text-[#667085] font-medium">
              {scopeConfig.personaTitle}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
            Administration &amp; Governance Workspace
          </h1>
          <p className="text-sm text-[#667085] max-w-3xl leading-relaxed">
            {scopeConfig.desc}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-xl bg-[#F8FAFC] p-3.5 border border-[#E2E6EE] text-right">
            <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              {scopeConfig.scopeLabel}
            </div>
            <div className="text-xs font-bold text-[#172033] font-mono mt-0.5">
              {user?.tenant_id ? `${user.tenant_id.slice(0, 16)}...` : "System Scope"}
            </div>
          </div>
        </div>
      </div>

      {/* Governance Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
            Authorized Customers
          </span>
          <div className="text-2xl font-extrabold text-[#172033]">{customers.length}</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
            Assessment Registry
          </span>
          <div className="text-2xl font-extrabold text-[#172033]">{assessments.length}</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#008638]">
            Submitted &amp; Finalized
          </span>
          <div className="text-2xl font-extrabold text-[#008638]">{submittedAssessmentsCount}</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Draft / In Progress
          </span>
          <div className="text-2xl font-extrabold text-amber-700">{draftAssessmentsCount}</div>
        </div>
      </div>

      {/* Main Governance Content Card */}
      <div className="rounded-2xl bg-white border border-[#E2E6EE] shadow-xs overflow-hidden space-y-0">
        {/* Governance Navigation Tabs Bar */}
        <div className="px-5 py-3.5 border-b border-[#E2E6EE] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-[#CBD2DE] p-0.5 bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("customers")}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                activeTab === "customers"
                  ? "bg-[#008638] text-white"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Customer Directory ({customers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("assessments")}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                activeTab === "assessments"
                  ? "bg-[#008638] text-white"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Assessment Registry ({assessments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                activeTab === "audit"
                  ? "bg-[#008638] text-white"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              <ScrollText className="h-3.5 w-3.5" />
              <span>Audit Trail &amp; Compliance</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                activeTab === "users"
                  ? "bg-[#008638] text-white"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>User Visibility &amp; Identity</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-[#667085] bg-[#EEF8F0] border border-[#A8E2B5] text-[#008638] px-2.5 py-1 rounded-md">
              Read-Only Governance
            </span>
            <button
              type="button"
              onClick={fetchGovernanceData}
              disabled={isLoading}
              title="Refresh Governance Data"
              className="p-1.5 rounded-lg border border-[#CBD2DE] bg-white text-[#667085] hover:text-[#172033] transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div role="alert" className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchGovernanceData}
              className="text-xs font-bold text-rose-700 underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#008638] mx-auto" />
            <p className="text-xs font-semibold text-[#667085]">Loading governance registry...</p>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 1: CUSTOMER DIRECTORY (READ-ONLY)                */}
        {/* ---------------------------------------------------- */}
        {!isLoading && activeTab === "customers" && (
          <div className="space-y-0" data-testid="admin-customer-directory">
            {/* Search Header */}
            <div className="p-4 sm:p-5 border-b border-[#E2E6EE] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                <input
                  type="text"
                  placeholder="Search customer organizations..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg text-xs font-medium text-[#172033] placeholder-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                />
              </div>

              <div className="text-xs text-[#667085]">
                Showing <strong>{filteredCustomers.length}</strong> of <strong>{customers.length}</strong> customer records
              </div>
            </div>

            {/* Empty Customers State */}
            {filteredCustomers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-[#EEF8F0] text-[#008638] flex items-center justify-center border border-[#A8E2B5]">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-[#172033]">
                    {customerSearch ? `No customer organizations matching "${customerSearch}"` : "No customer records in authorized scope."}
                  </h3>
                  <p className="text-xs text-[#667085]">
                    Customer records assigned to your administrative tenant scope will be listed here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E6EE] bg-[#F7F8FA] text-[#667085] uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">Customer Organization</th>
                      <th className="py-3.5 px-4">Industry Classification</th>
                      <th className="py-3.5 px-4">Primary Contact</th>
                      <th className="py-3.5 px-4">Registered Date</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Registry Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6EE]">
                    {filteredCustomers.map((c) => {
                      const customerAssessments = assessments.filter((a) => a.customer_id === c.id);
                      const regDate = c.created_at
                        ? new Date(c.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "—";

                      return (
                        <tr key={c.id} className="hover:bg-[#FAFBFD] transition-colors">
                          <td className="py-4 px-4 sm:px-6 font-bold text-[#172033]">
                            <div className="flex items-center space-x-2.5">
                              <div className="h-8 w-8 rounded-lg bg-[#F0F2F6] flex items-center justify-center text-[#5B6579] shrink-0 border border-[#E2E6EE]">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="block truncate max-w-xs">{c.name}</span>
                                <span className="font-mono text-[10px] text-[#8A94A6] block">ID: {c.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-[#4A5568]">
                            <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                              {c.industry || "Enterprise"}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-[#4A5568]">
                            {c.primary_contact_name ? (
                              <div className="space-y-0.5">
                                <div className="font-medium text-[#172033]">{c.primary_contact_name}</div>
                                {c.primary_contact_email && (
                                  <div className="text-[11px] text-[#667085] font-mono">{c.primary_contact_email}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#8A94A6]">—</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-[#667085] font-medium">{regDate}</td>

                          <td className="py-4 px-4 sm:px-6 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectingCustomer(c)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#CBD2DE] text-[#172033] font-bold text-xs hover:border-[#008638] hover:text-[#008638] transition-colors shadow-2xs cursor-pointer"
                              aria-label={`Inspect ${c.name}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: ASSESSMENT REGISTRY (READ-ONLY)               */}
        {/* ---------------------------------------------------- */}
        {!isLoading && activeTab === "assessments" && (
          <div className="space-y-0" data-testid="admin-assessment-registry">
            {/* Search & Filter Controls */}
            <div className="p-4 sm:p-5 border-b border-[#E2E6EE] bg-white flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                  <input
                    type="text"
                    placeholder="Search assessment registry..."
                    value={assessmentSearch}
                    onChange={(e) => setAssessmentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg text-xs font-medium text-[#172033] placeholder-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                  />
                </div>

                {/* Customer Filter Dropdown */}
                {customers.length > 1 && (
                  <select
                    value={selectedCustomerIdFilter}
                    onChange={(e) => setSelectedCustomerIdFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-white border border-[#CBD2DE] rounded-lg text-xs font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                  >
                    <option value="ALL">All Customers ({customers.length})</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center space-x-2 self-start md:self-auto">
                <div className="inline-flex rounded-lg border border-[#CBD2DE] p-0.5 bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setAssessmentStatusFilter("ALL")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      assessmentStatusFilter === "ALL" ? "bg-[#008638] text-white" : "text-[#667085] hover:text-[#172033]"
                    }`}
                  >
                    All ({assessments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentStatusFilter("SUBMITTED")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      assessmentStatusFilter === "SUBMITTED" ? "bg-[#008638] text-white" : "text-[#667085] hover:text-[#172033]"
                    }`}
                  >
                    Submitted ({submittedAssessmentsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentStatusFilter("DRAFT")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      assessmentStatusFilter === "DRAFT" ? "bg-[#008638] text-white" : "text-[#667085] hover:text-[#172033]"
                    }`}
                  >
                    Draft ({draftAssessmentsCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Empty Assessments State */}
            {filteredAssessments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-[#EEF8F0] text-[#008638] flex items-center justify-center border border-[#A8E2B5]">
                  <Layers className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-[#172033]">
                    {assessmentSearch ? `No assessments matching "${assessmentSearch}"` : "No assessment registry records found."}
                  </h3>
                  <p className="text-xs text-[#667085]">
                    Assessment records associated with your authorized governance scope will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E6EE] bg-[#F7F8FA] text-[#667085] uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">Customer Organization</th>
                      <th className="py-3.5 px-4">Assessment Title &amp; ID</th>
                      <th className="py-3.5 px-4">Lifecycle Status</th>
                      <th className="py-3.5 px-4">Version</th>
                      <th className="py-3.5 px-4">Updated Date</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Registry Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6EE]">
                    {filteredAssessments.map((a) => {
                      const customerName = a.customer?.name || customers.find((c) => c.id === a.customer_id)?.name || "Enterprise Customer";
                      const formattedDate = a.updated_at
                        ? new Date(a.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "—";

                      return (
                        <tr key={a.id} className="hover:bg-[#FAFBFD] transition-colors">
                          <td className="py-4 px-4 sm:px-6 font-bold text-[#172033]">
                            <div className="flex items-center space-x-2.5">
                              <div className="h-8 w-8 rounded-lg bg-[#F0F2F6] flex items-center justify-center text-[#5B6579] shrink-0 border border-[#E2E6EE]">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <span className="truncate max-w-xs">{customerName}</span>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-[#172033] truncate max-w-xs">
                                {a.title || "Enterprise IBM MQ Assessment"}
                              </div>
                              <div className="font-mono text-[10px] text-[#8A94A6] truncate">ID: {a.id}</div>
                            </div>
                          </td>

                          <td className="py-4 px-4">{renderStatusBadge(a.status)}</td>

                          <td className="py-4 px-4 font-mono text-[11px] text-[#4A5568]">
                            v{a.assessment_version || "1.0.0"}
                          </td>

                          <td className="py-4 px-4 text-[#667085] font-medium">{formattedDate}</td>

                          <td className="py-4 px-4 sm:px-6 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectingAssessment(a)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#CBD2DE] text-[#172033] font-bold text-xs hover:border-[#008638] hover:text-[#008638] transition-colors shadow-2xs cursor-pointer"
                              aria-label={`Inspect assessment ${a.id}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View Record</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: AUDIT TRAIL & COMPLIANCE (READ-ONLY)          */}
        {/* ---------------------------------------------------- */}
        {!isLoading && activeTab === "audit" && (
          <div className="space-y-0" data-testid="admin-audit-trail">
            {/* Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-[#E2E6EE] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#172033]">Filter by Category:</span>
                <select
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg text-xs font-medium text-[#172033]"
                >
                  <option value="ALL">All Event Types ({auditEvents.length})</option>
                  <option value="AUTH">Authentication &amp; Session</option>
                  <option value="CUSTOMER">Customer Directory Events</option>
                  <option value="ASSESSMENT">Assessment &amp; Calculation Events</option>
                </select>
              </div>

              <div className="text-xs text-[#667085]">
                Immutable Append-Only Audit Trail (Recent 50 Entries)
              </div>
            </div>

            {filteredAuditEvents.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                  <ScrollText className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-[#172033]">No audit logs recorded for this category.</h3>
                  <p className="text-xs text-[#667085]">
                    System security events, user logins, and assessment intake milestones will be logged here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E6EE] bg-[#F7F8FA] text-[#667085] uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">Timestamp (UTC)</th>
                      <th className="py-3.5 px-4">Event Type</th>
                      <th className="py-3.5 px-4">Resource Target</th>
                      <th className="py-3.5 px-4">Actor / User</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6EE] font-mono text-[11px]">
                    {filteredAuditEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-[#FAFBFD]">
                        <td className="py-3 px-4 sm:px-6 text-[#667085] font-sans">
                          {new Date(evt.created_at).toLocaleString("en-US", { timeZone: "UTC" })}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#172033]">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                            {evt.event_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#4A5568]">
                          {evt.resource_type ? `${evt.resource_type} (${evt.resource_id ? evt.resource_id.slice(0, 8) + "..." : "Global"})` : "—"}
                        </td>
                        <td className="py-3 px-4 text-[#667085]">
                          {evt.user_id ? evt.user_id.slice(0, 12) + "..." : "System / Anonymous"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              evt.status === "SUCCESS"
                                ? "bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {evt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: USER VISIBILITY & IDENTITY (READ-ONLY)        */}
        {/* ---------------------------------------------------- */}
        {!isLoading && activeTab === "users" && (
          <div className="p-6 sm:p-8 space-y-6" data-testid="admin-user-visibility">
            <div className="rounded-xl bg-[#F7F8FA] border border-[#E2E6EE] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E6EE] pb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-[#008638] text-white flex items-center justify-center font-bold text-sm">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#172033]">
                      {user?.full_name || "Authenticated Administrator"}
                    </h3>
                    <p className="text-xs text-[#667085] font-mono">{user?.email}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${scopeConfig.badge}`}>
                  {user?.role}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-white border border-[#E2E6EE] space-y-1">
                  <span className="text-[10px] font-semibold text-[#667085] uppercase">User Identifier</span>
                  <div className="font-mono text-[11px] font-semibold text-[#172033] truncate">
                    {user?.id || "admin-session"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#E2E6EE] space-y-1">
                  <span className="text-[10px] font-semibold text-[#667085] uppercase">Tenant Membership</span>
                  <div className="font-mono text-[11px] font-semibold text-[#172033] truncate">
                    {user?.tenant_id || "Global Scope"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#E2E6EE] space-y-1">
                  <span className="text-[10px] font-semibold text-[#667085] uppercase">Account State</span>
                  <div className="font-bold text-[#008638] flex items-center space-x-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Active &amp; Authenticated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Informative Batch 4B Notice Card */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-2 text-xs text-slate-700">
              <div className="flex items-center space-x-2 font-bold text-slate-900">
                <Shield className="h-4 w-4 text-[#008638]" />
                <span>User Directory &amp; Access Governance Notice</span>
              </div>
              <p className="leading-relaxed text-slate-600">
                User authentication, role assignments, and session scopes are strictly enforced server-side. Multi-user tenant directory provisioning, credential rotation, and user lifecycle administration endpoints are governed under administrative batch 4B.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: READ-ONLY CUSTOMER INSPECTION                 */}
      {/* ---------------------------------------------------- */}
      {inspectingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E6EE] shadow-xl max-w-lg w-full overflow-hidden space-y-0">
            <div className="p-5 border-b border-[#E2E6EE] flex items-center justify-between bg-[#F7F8FA]">
              <div className="flex items-center space-x-2.5">
                <Building2 className="h-5 w-5 text-[#008638]" />
                <h3 className="text-sm font-bold text-[#172033]">Customer Organization Detail</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingCustomer(null)}
                className="p-1 rounded-lg text-[#667085] hover:text-[#172033] hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[#667085] tracking-wider">Organization Name</span>
                <h4 className="text-base font-extrabold text-[#172033]">{inspectingCustomer.name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE] space-y-0.5">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Industry</span>
                  <div className="font-bold text-[#172033]">{inspectingCustomer.industry || "Enterprise"}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE] space-y-0.5">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Customer ID</span>
                  <div className="font-mono text-[10px] text-[#172033] font-bold truncate">{inspectingCustomer.id}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE] space-y-0.5">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Primary Contact</span>
                  <div className="font-bold text-[#172033]">{inspectingCustomer.primary_contact_name || "—"}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE] space-y-0.5">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Contact Email</span>
                  <div className="font-mono text-[10px] text-[#172033] font-bold truncate">
                    {inspectingCustomer.primary_contact_email || "—"}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2E6EE] flex items-center justify-between text-[#667085] text-[11px]">
                <span>Tenant: {inspectingCustomer.tenant_id ? `${inspectingCustomer.tenant_id.slice(0, 16)}...` : "System"}</span>
                <span>Registered: {inspectingCustomer.created_at ? new Date(inspectingCustomer.created_at).toLocaleDateString() : "—"}</span>
              </div>
            </div>

            <div className="p-4 bg-[#F7F8FA] border-t border-[#E2E6EE] text-right">
              <button
                type="button"
                onClick={() => setInspectingCustomer(null)}
                className="px-4 py-1.5 rounded-lg bg-[#008638] text-white font-bold text-xs hover:bg-[#006B2D] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: READ-ONLY ASSESSMENT INSPECTION               */}
      {/* ---------------------------------------------------- */}
      {inspectingAssessment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E6EE] shadow-xl max-w-lg w-full overflow-hidden space-y-0">
            <div className="p-5 border-b border-[#E2E6EE] flex items-center justify-between bg-[#F7F8FA]">
              <div className="flex items-center space-x-2.5">
                <Layers className="h-5 w-5 text-[#008638]" />
                <h3 className="text-sm font-bold text-[#172033]">Assessment Registry Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingAssessment(null)}
                className="p-1 rounded-lg text-[#667085] hover:text-[#172033] hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-semibold text-[#667085] tracking-wider">Assessment Title</span>
                  {renderStatusBadge(inspectingAssessment.status)}
                </div>
                <h4 className="text-base font-extrabold text-[#172033]">
                  {inspectingAssessment.title || "Enterprise IBM MQ Assessment"}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE] space-y-0.5">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Customer Organization</span>
                  <div className="font-bold text-[#172033] truncate">
                    {inspectingAssessment.customer?.name || customers.find((c) => c.id === inspectingAssessment.customer_id)?.name || "Enterprise Customer"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE] space-y-0.5">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Assessment ID</span>
                  <div className="font-mono text-[10px] text-[#172033] font-bold truncate">{inspectingAssessment.id}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE] space-y-0.5">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Version Specification</span>
                  <div className="font-mono font-bold text-[#172033]">v{inspectingAssessment.assessment_version || "1.0.0"}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE] space-y-0.5">
                  <span className="text-[10px] text-[#667085] uppercase font-semibold">Snapshot ID</span>
                  <div className="font-mono text-[10px] text-[#172033] font-bold truncate">
                    {inspectingAssessment.latest_snapshot?.id ? `${inspectingAssessment.latest_snapshot.id.slice(0, 10)}...` : "Unfinalized"}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2E6EE] flex items-center justify-between text-[#667085] text-[11px]">
                <span>Created: {inspectingAssessment.created_at ? new Date(inspectingAssessment.created_at).toLocaleDateString() : "—"}</span>
                <span>Updated: {inspectingAssessment.updated_at ? new Date(inspectingAssessment.updated_at).toLocaleDateString() : "—"}</span>
              </div>
            </div>

            <div className="p-4 bg-[#F7F8FA] border-t border-[#E2E6EE] text-right">
              <button
                type="button"
                onClick={() => setInspectingAssessment(null)}
                className="px-4 py-1.5 rounded-lg bg-[#008638] text-white font-bold text-xs hover:bg-[#006B2D] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
