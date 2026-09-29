"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FileText,
  Filter,
  Layers,
  Loader2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Assessment, Customer } from "../types/assessment";
import { Role, User } from "../types/auth";

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
  const [activeTab, setActiveTab] = useState<"customers" | "assessments" | "users" | "audit">("users");

  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter States
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [assessmentSearch, setAssessmentSearch] = useState<string>("");
  const [assessmentStatusFilter, setAssessmentStatusFilter] = useState<"ALL" | "SUBMITTED" | "DRAFT">("ALL");
  const [selectedCustomerIdFilter, setSelectedCustomerIdFilter] = useState<string>("ALL");
  const [auditFilter, setAuditFilter] = useState<string>("ALL");
  const [userSearch, setUserSearch] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modals States
  const [inspectingCustomer, setInspectingCustomer] = useState<Customer | null>(null);
  const [inspectingAssessment, setInspectingAssessment] = useState<Assessment | null>(null);
  
  // Customer Mutation Modals
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    industry: "Financial Services",
    primary_contact_name: "",
    primary_contact_email: "",
    notes: "",
  });
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState<boolean>(false);
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);

  // User Mutation Modals
  const [isProvisionUserOpen, setIsProvisionUserOpen] = useState<boolean>(false);
  const [provisionForm, setProvisionForm] = useState({
    full_name: "",
    email: "",
    role: "CUSTOMER_USER" as Role,
    password: "",
    customer_id: "",
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState<boolean>(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);

  // User Status / Role Confirmation Dialogs
  const [targetUserForStatus, setTargetUserForStatus] = useState<User | null>(null);
  const [targetUserForRole, setTargetUserForRole] = useState<User | null>(null);
  const [proposedRole, setProposedRole] = useState<Role>("CUSTOMER_USER");
  const [isMutatingUserAction, setIsMutatingUserAction] = useState<boolean>(false);

  // Role-Aware Scope Context
  const scopeConfig = useMemo(() => {
    switch (user?.role) {
      case "PLATFORM_ADMIN":
        return {
          title: "Platform Administration",
          badge: "bg-[#FAF5FF] text-[#722F8A] border-[#E9D5FF]",
          scopeLabel: "Global System / Cross-Tenant Scope",
          personaTitle: "Platform Superadmin",
          desc: "Full administrative governance across all authorized partner tenants, user directories, customer organizations, assessment registries, and system audit trails.",
        };
      case "PARTNER_ADMIN":
        return {
          title: "Partner Administration",
          badge: "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]",
          scopeLabel: "Partner Tenant Scope",
          personaTitle: "Partner Administrator",
          desc: "Tenant-level governance over authorized customer accounts, user directory provisioning, assessment registries, and security logs within your partner tenant scope.",
        };
      case "CUSTOMER_ADMIN": {
        const scopedCust = customers.find((c) => c.id === user?.customer_id);
        return {
          title: scopedCust ? `${scopedCust.name} Administration` : "Customer Administration",
          badge: "bg-slate-100 text-slate-800 border-slate-300",
          scopeLabel: scopedCust ? `Org: ${scopedCust.name}` : "Customer Organization Scope",
          personaTitle: "Customer Administrator",
          desc: scopedCust
            ? `Organization-level governance for ${scopedCust.name}. Manage authorized client respondent accounts and review submitted assessment records.`
            : "Organization-level governance for your authorized customer organization, user visibility, and submitted assessment records.",
        };
      }
      default:
        return {
          title: "System Administration",
          badge: "bg-slate-100 text-slate-700 border-slate-200",
          scopeLabel: "Administrative Scope",
          personaTitle: "System Administrator",
          desc: "Administrative governance and platform compliance oversight.",
        };
    }
  }, [user?.role, user?.customer_id, customers]);

  // Authority Checks
  const canProvisionUsers = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "CUSTOMER_ADMIN";
  const canCreateCustomer = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "CONSULTANT";
  const canUpdateCustomer = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "CUSTOMER_ADMIN" || user?.role === "CONSULTANT";
  const canReadAudit = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "CONSULTANT";

  // Allowed roles for provisioning dropdown
  const assignableRoles: Role[] = useMemo(() => {
    if (user?.role === "PLATFORM_ADMIN") {
      return ["PLATFORM_ADMIN", "PARTNER_ADMIN", "CONSULTANT", "CUSTOMER_ADMIN", "CUSTOMER_USER"];
    }
    if (user?.role === "PARTNER_ADMIN") {
      return ["PARTNER_ADMIN", "CONSULTANT", "CUSTOMER_ADMIN", "CUSTOMER_USER"];
    }
    return ["CUSTOMER_USER"];
  }, [user?.role]);

  // Fetch Governance Registry Data
  const fetchGovernanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [custList, assList, uList] = await Promise.all([
        api.listCustomers().catch(() => [] as Customer[]),
        api.listAssessments().catch(() => [] as Assessment[]),
        api.listUsers().catch(() => [] as User[]),
      ]);

      setCustomers(custList || []);
      setAssessments(assList || []);
      setUsersList(uList || []);

      // Fetch audit logs if authorized
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
  }, [canReadAudit]);

  useEffect(() => {
    fetchGovernanceData();
  }, [fetchGovernanceData]);

  // Clear messages timer
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // Assessment Count Helpers
  const submittedAssessmentsCount = assessments.filter(
    (a) => a.status === "SUBMITTED" || a.status === "CALCULATED" || a.status === "COMPLETED"
  ).length;
  const draftAssessmentsCount = assessments.length - submittedAssessmentsCount;

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase().trim();
    const matchesQuery = !q || (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    if (!matchesQuery) return false;

    if (userRoleFilter !== "ALL" && u.role !== userRoleFilter) return false;
    if (userStatusFilter === "ACTIVE" && !u.is_active) return false;
    if (userStatusFilter === "INACTIVE" && u.is_active) return false;

    return true;
  });

  // Filtered Customers
  const filteredCustomers = customers.filter((c) => {
    if (user?.role === "CUSTOMER_ADMIN" && user.customer_id && c.id !== user.customer_id) {
      return false;
    }
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
    if (user?.role === "CUSTOMER_ADMIN" && user.customer_id && a.customer_id !== user.customer_id) {
      return false;
    }
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

  // User Status Toggle Handler
  const handleToggleUserStatus = async () => {
    if (!targetUserForStatus) return;
    if (targetUserForStatus.id === user?.id) {
      setError("You cannot deactivate your own active administrative session.");
      setTargetUserForStatus(null);
      return;
    }

    try {
      setIsMutatingUserAction(true);
      setError(null);
      const newStatus = !targetUserForStatus.is_active;
      await api.updateUser(targetUserForStatus.id, { is_active: newStatus });
      setSuccessMessage(`User ${targetUserForStatus.email} has been ${newStatus ? "activated" : "deactivated"} successfully.`);
      setTargetUserForStatus(null);
      await fetchGovernanceData();
    } catch (err: any) {
      setError(err.message || "Failed to update user status.");
    } finally {
      setIsMutatingUserAction(false);
    }
  };

  // User Role Change Handler
  const handleChangeUserRole = async () => {
    if (!targetUserForRole) return;
    try {
      setIsMutatingUserAction(true);
      setError(null);
      await api.updateUser(targetUserForRole.id, { role: proposedRole });
      setSuccessMessage(`User ${targetUserForRole.email} role updated to ${proposedRole}.`);
      setTargetUserForRole(null);
      await fetchGovernanceData();
    } catch (err: any) {
      setError(err.message || "Failed to change user role.");
    } finally {
      setIsMutatingUserAction(false);
    }
  };

  // Provision User Submit Handler
  const handleProvisionUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);

    if (!provisionForm.full_name.trim()) {
      setUserFormError("Please enter full name.");
      return;
    }
    if (!provisionForm.email.trim() || !provisionForm.email.includes("@")) {
      setUserFormError("Please enter a valid corporate email address.");
      return;
    }
    if (!provisionForm.password || provisionForm.password.length < 8) {
      setUserFormError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsSubmittingUser(true);
      const payload: any = {
        full_name: provisionForm.full_name.trim(),
        email: provisionForm.email.trim(),
        role: user?.role === "CUSTOMER_ADMIN" ? "CUSTOMER_USER" : provisionForm.role,
        password: provisionForm.password,
      };
      if (user?.role === "CUSTOMER_ADMIN") {
        payload.customer_id = user.customer_id;
      } else if (provisionForm.customer_id && (provisionForm.role === "CUSTOMER_ADMIN" || provisionForm.role === "CUSTOMER_USER")) {
        payload.customer_id = provisionForm.customer_id;
      }

      await api.createUser(payload);

      setSuccessMessage(`User account for ${provisionForm.email} provisioned successfully.`);
      setIsProvisionUserOpen(false);
      setProvisionForm({ full_name: "", email: "", role: "CUSTOMER_USER", password: "", customer_id: "" });
      await fetchGovernanceData();
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes("already exists")) {
        setUserFormError("A user with this email address already exists.");
      } else if (err.status === 403) {
        setUserFormError("You do not have permission to provision users with this role.");
      } else {
        setUserFormError(err.message || "Failed to provision user. Please try again.");
      }
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Customer Form Submit Handler (Create or Update)
  const handleCustomerFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerFormError(null);

    if (!customerForm.name.trim()) {
      setCustomerFormError("Organization name is required.");
      return;
    }

    try {
      setIsSubmittingCustomer(true);
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, customerForm);
        setSuccessMessage(`Customer organization '${customerForm.name}' updated successfully.`);
        setEditingCustomer(null);
      } else {
        await api.createCustomer(customerForm);
        setSuccessMessage(`Customer organization '${customerForm.name}' created successfully.`);
        setIsCreateCustomerOpen(false);
      }
      setCustomerForm({ name: "", industry: "Financial Services", primary_contact_name: "", primary_contact_email: "", notes: "" });
      await fetchGovernanceData();
    } catch (err: any) {
      if (err.status === 403) {
        setCustomerFormError("You do not have permission to modify customer organizations.");
      } else {
        setCustomerFormError(err.message || "Failed to save customer organization.");
      }
    } finally {
      setIsSubmittingCustomer(false);
    }
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

      {/* Global Success Banner */}
      {successMessage && (
        <div role="status" className="p-4 bg-[#EEF8F0] border border-[#A8E2B5] rounded-xl text-xs font-semibold text-[#008638] flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-[#008638] hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Global Error Alert */}
      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-700 underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Governance Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
            Authorized Users
          </span>
          <div className="text-2xl font-extrabold text-[#172033]">{usersList.length}</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
            Authorized Customers
          </span>
          <div className="text-2xl font-extrabold text-[#172033]">{customers.length}</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#008638]">
            Assessment Registry
          </span>
          <div className="text-2xl font-extrabold text-[#008638]">{assessments.length}</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Submitted &amp; Finalized
          </span>
          <div className="text-2xl font-extrabold text-amber-700">{submittedAssessmentsCount}</div>
        </div>
      </div>

      {/* Main Governance Content Card */}
      <div className="rounded-2xl bg-white border border-[#E2E6EE] shadow-xs overflow-hidden space-y-0">
        {/* Governance Navigation Tabs Bar */}
        <div className="px-5 py-3.5 border-b border-[#E2E6EE] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-[#CBD2DE] p-0.5 bg-white shadow-2xs">
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
              <span>User Directory ({usersList.length})</span>
            </button>

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
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-[#667085] bg-[#EEF8F0] border border-[#A8E2B5] text-[#008638] px-2.5 py-1 rounded-md">
              Governance Active
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

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#008638] mx-auto" />
            <p className="text-xs font-semibold text-[#667085]">Loading governance records...</p>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 1: USER DIRECTORY & PROVISIONING (BATCH 4B)      */}
        {/* ---------------------------------------------------- */}
        {!isLoading && activeTab === "users" && (
          <div className="space-y-0" data-testid="admin-user-directory">
            {/* Header & Filter Controls */}
            <div className="p-4 sm:p-5 border-b border-[#E2E6EE] bg-white flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg text-xs font-medium text-[#172033] placeholder-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-white border border-[#CBD2DE] rounded-lg text-xs font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                >
                  <option value="ALL">All Roles ({usersList.length})</option>
                  <option value="PLATFORM_ADMIN">Platform Admin</option>
                  <option value="PARTNER_ADMIN">Partner Admin</option>
                  <option value="CONSULTANT">Consultant</option>
                  <option value="CUSTOMER_ADMIN">Customer Admin</option>
                  <option value="CUSTOMER_USER">Customer User</option>
                </select>

                {/* Status Filter */}
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="w-full sm:w-auto px-3 py-2 bg-white border border-[#CBD2DE] rounded-lg text-xs font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Accounts</option>
                  <option value="INACTIVE">Deactivated Accounts</option>
                </select>
              </div>

              {canProvisionUsers && (
                <button
                  type="button"
                  onClick={() => {
                    setUserFormError(null);
                    setProvisionForm({ full_name: "", email: "", role: assignableRoles[0] || "CUSTOMER_USER", password: "", customer_id: user?.customer_id || "" });
                    setIsProvisionUserOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#008638] text-white font-bold text-xs hover:bg-[#006B2D] transition shadow-xs cursor-pointer shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Provision User</span>
                </button>
              )}
            </div>

            {/* Empty State */}
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-[#EEF8F0] text-[#008638] flex items-center justify-center border border-[#A8E2B5]">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-[#172033]">
                    {userSearch ? `No users matching "${userSearch}"` : "No users found in authorized scope."}
                  </h3>
                  <p className="text-xs text-[#667085]">
                    User accounts created for your organization will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E6EE] bg-[#F7F8FA] text-[#667085] uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">Full Name &amp; Identity</th>
                      <th className="py-3.5 px-4">Role Assignment</th>
                      <th className="py-3.5 px-4">Account Status</th>
                      <th className="py-3.5 px-4">Tenant Context</th>
                      <th className="py-3.5 px-4">Created Date</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6EE]">
                    {filteredUsers.map((u) => {
                      const regDate = u.created_at
                        ? new Date(u.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "—";

                      return (
                        <tr key={u.id} className="hover:bg-[#FAFBFD] transition-colors">
                          <td className="py-4 px-4 sm:px-6 font-bold text-[#172033]">
                            <div className="flex items-center space-x-2.5">
                              <div className="h-8 w-8 rounded-lg bg-[#F0F2F6] flex items-center justify-center text-[#5B6579] shrink-0 border border-[#E2E6EE]">
                                <UserCheck className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="block truncate max-w-xs">{u.full_name || "Enterprise User"}</span>
                                <span className="font-mono text-[10px] text-[#667085] block">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                              {u.role}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            {u.is_active ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                <UserX className="h-3 w-3" />
                                <span>Deactivated</span>
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 font-mono text-[10px] text-[#667085]">
                            {u.tenant_id ? `${u.tenant_id.slice(0, 10)}...` : "System"}
                          </td>

                          <td className="py-4 px-4 text-[#667085] font-medium">{regDate}</td>

                          <td className="py-4 px-4 sm:px-6 text-right space-x-1.5">
                            {canProvisionUsers && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetUserForRole(u);
                                    setProposedRole(u.role);
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white border border-[#CBD2DE] text-[#172033] font-semibold text-xs hover:border-[#008638] hover:text-[#008638] transition cursor-pointer"
                                  title="Change Role"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  <span>Role</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setTargetUserForStatus(u)}
                                  disabled={u.id === user?.id}
                                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border font-semibold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                    u.is_active
                                      ? "bg-white border-rose-200 text-rose-700 hover:bg-rose-50"
                                      : "bg-white border-[#A8E2B5] text-[#008638] hover:bg-[#EEF8F0]"
                                  }`}
                                  title={u.is_active ? "Deactivate User" : "Activate User"}
                                >
                                  {u.is_active ? (
                                    <>
                                      <UserX className="h-3 w-3" />
                                      <span>Deactivate</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-3 w-3" />
                                      <span>Activate</span>
                                    </>
                                  )}
                                </button>
                              </>
                            )}
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
        {/* TAB 2: CUSTOMER DIRECTORY (BATCH 4B ENHANCED)        */}
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

              <div className="flex items-center space-x-3">
                <div className="text-xs text-[#667085]">
                  Showing <strong>{filteredCustomers.length}</strong> of <strong>{customers.length}</strong>
                </div>

                {canCreateCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerFormError(null);
                      setEditingCustomer(null);
                      setCustomerForm({ name: "", industry: "Financial Services", primary_contact_name: "", primary_contact_email: "", notes: "" });
                      setIsCreateCustomerOpen(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#008638] text-white font-bold text-xs hover:bg-[#006B2D] transition shadow-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Organization</span>
                  </button>
                )}
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
                      <th className="py-3.5 px-4 sm:px-6 text-right">Governance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6EE]">
                    {filteredCustomers.map((c) => {
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

                          <td className="py-4 px-4 sm:px-6 text-right space-x-1.5">
                            {canUpdateCustomer && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerFormError(null);
                                  setEditingCustomer(c);
                                  setCustomerForm({
                                    name: c.name || "",
                                    industry: c.industry || "Financial Services",
                                    primary_contact_name: c.primary_contact_name || "",
                                    primary_contact_email: c.primary_contact_email || "",
                                    notes: c.notes || "",
                                  });
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#CBD2DE] text-[#172033] font-bold text-xs hover:border-[#008638] hover:text-[#008638] transition cursor-pointer"
                                title="Edit Customer Details"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setInspectingCustomer(c)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#CBD2DE] text-[#172033] font-bold text-xs hover:border-[#008638] hover:text-[#008638] transition cursor-pointer"
                              aria-label={`Inspect ${c.name}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
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
        {/* TAB 3: ASSESSMENT REGISTRY (READ-ONLY)               */}
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
        {/* TAB 4: AUDIT TRAIL & COMPLIANCE (READ-ONLY)          */}
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
                  <option value="AUTH">Authentication &amp; User Events</option>
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
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: PROVISION USER                                */}
      {/* ---------------------------------------------------- */}
      {isProvisionUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E6EE] shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-[#E2E6EE] flex items-center justify-between bg-[#F7F8FA]">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-[#008638]" />
                <h3 className="text-sm font-bold text-[#172033]">Provision New User Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProvisionUserOpen(false)}
                className="p-1 rounded-lg text-[#667085] hover:text-[#172033] hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionUserSubmit} className="p-6 space-y-4 text-xs">
              {userFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={provisionForm.full_name}
                  onChange={(e) => setProvisionForm({ ...provisionForm, full_name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                  Corporate Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={provisionForm.email}
                  onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                  Role Assignment *
                </label>
                {user?.role === "CUSTOMER_ADMIN" ? (
                  <div className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg font-semibold text-[#172033] text-xs">
                    CUSTOMER_USER (Client Respondent)
                  </div>
                ) : (
                  <select
                    value={provisionForm.role}
                    onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Customer Organization Scope Field */}
              {user?.role === "CUSTOMER_ADMIN" ? (
                <div>
                  <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                    Customer Organization Scope
                  </label>
                  <div className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg font-semibold text-[#172033] text-xs">
                    {customers.find((c) => c.id === user.customer_id)?.name || "Current Customer Organization"}
                  </div>
                </div>
              ) : (provisionForm.role === "CUSTOMER_ADMIN" || provisionForm.role === "CUSTOMER_USER") && customers.length > 0 ? (
                <div>
                  <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                    Assigned Customer Organization
                  </label>
                  <select
                    value={provisionForm.customer_id}
                    onChange={(e) => setProvisionForm({ ...provisionForm, customer_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                  >
                    <option value="">-- No Customer Organization --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.industry ? `(${c.industry})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                  Initial Password (Min 8 Characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={provisionForm.password}
                  onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsProvisionUserOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-[#172033] font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 rounded-lg bg-[#008638] text-white font-bold text-xs hover:bg-[#006B2D] transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingUser ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: USER ACTIVATION / DEACTIVATION CONFIRMATION   */}
      {/* ---------------------------------------------------- */}
      {targetUserForStatus && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E6EE] shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl ${targetUserForStatus.is_active ? "bg-rose-50 text-rose-700" : "bg-[#EEF8F0] text-[#008638]"}`}>
                {targetUserForStatus.is_active ? <UserX className="h-6 w-6" /> : <UserCheck className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  {targetUserForStatus.is_active ? "Deactivate User Account?" : "Activate User Account?"}
                </h3>
                <p className="text-[#667085] font-mono text-[11px]">{targetUserForStatus.email}</p>
              </div>
            </div>

            <p className="text-[#4A5568] leading-relaxed">
              {targetUserForStatus.is_active
                ? "Deactivating this account will immediately revoke all active sessions and block further login attempts. Audit history and existing ownership will remain preserved."
                : "Activating this account will permit the user to authenticate and access platform capabilities according to their assigned role."}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetUserForStatus(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-[#172033] font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleUserStatus}
                disabled={isMutatingUserAction}
                className={`px-4 py-2 rounded-lg text-white font-bold text-xs transition flex items-center space-x-1 cursor-pointer disabled:opacity-50 ${
                  targetUserForStatus.is_active ? "bg-rose-700 hover:bg-rose-800" : "bg-[#008638] hover:bg-[#006B2D]"
                }`}
              >
                {isMutatingUserAction && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                <span>{targetUserForStatus.is_active ? "Confirm Deactivation" : "Confirm Activation"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ROLE CHANGE CONFIRMATION                      */}
      {/* ---------------------------------------------------- */}
      {targetUserForRole && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E6EE] shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-[#008638]" />
              <h3 className="text-sm font-bold text-[#172033]">Modify User Role Assignment</h3>
            </div>

            <p className="text-[#4A5568]">
              Select a new role assignment for <strong>{targetUserForRole.email}</strong>. This changes their platform authorization scope immediately upon session refresh.
            </p>

            <div className="p-3 bg-[#F7F8FA] border border-[#E2E6EE] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#667085]">Current Role:</span>
                <span className="font-bold text-[#172033]">{targetUserForRole.role}</span>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#172033] block">Proposed Role:</label>
                <select
                  value={proposedRole}
                  onChange={(e) => setProposedRole(e.target.value as Role)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD2DE] rounded-lg text-xs font-semibold text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                >
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetUserForRole(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-[#172033] font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangeUserRole}
                disabled={isMutatingUserAction || proposedRole === targetUserForRole.role}
                className="px-4 py-2 rounded-lg bg-[#008638] text-white font-bold text-xs hover:bg-[#006B2D] transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                {isMutatingUserAction && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                <span>Save Role Change</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT CUSTOMER ORGANIZATION           */}
      {/* ---------------------------------------------------- */}
      {(isCreateCustomerOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E6EE] shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-[#E2E6EE] flex items-center justify-between bg-[#F7F8FA]">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-[#008638]" />
                <h3 className="text-sm font-bold text-[#172033]">
                  {editingCustomer ? "Edit Customer Organization" : "Create Customer Organization"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateCustomerOpen(false);
                  setEditingCustomer(null);
                }}
                className="p-1 rounded-lg text-[#667085] hover:text-[#172033] hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCustomerFormSubmit} className="p-6 space-y-4 text-xs">
              {customerFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{customerFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                  Organization Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="e.g. Apex Global Financial"
                  className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                    Industry
                  </label>
                  <select
                    value={customerForm.industry}
                    onChange={(e) => setCustomerForm({ ...customerForm, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                  >
                    <option value="Financial Services">Financial Services</option>
                    <option value="Healthcare & Life Sciences">Healthcare &amp; Life Sciences</option>
                    <option value="Retail & E-commerce">Retail &amp; E-commerce</option>
                    <option value="Transportation & Logistics">Transportation &amp; Logistics</option>
                    <option value="Manufacturing & Energy">Manufacturing &amp; Energy</option>
                    <option value="Public Sector & Government">Public Sector</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                    Primary Contact Name
                  </label>
                  <input
                    type="text"
                    value={customerForm.primary_contact_name}
                    onChange={(e) => setCustomerForm({ ...customerForm, primary_contact_name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  value={customerForm.primary_contact_email}
                  onChange={(e) => setCustomerForm({ ...customerForm, primary_contact_email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#172033] uppercase mb-1">
                  Governance Notes
                </label>
                <textarea
                  rows={2}
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  placeholder="Optional context or deployment details..."
                  className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#CBD2DE] rounded-lg font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#008638]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateCustomerOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-[#172033] font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomer}
                  className="px-4 py-2 rounded-lg bg-[#008638] text-white font-bold text-xs hover:bg-[#006B2D] transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCustomer && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  <span>{editingCustomer ? "Update Organization" : "Create Organization"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
