"use client";

import React, { useState } from "react";
import { Building2, FileText, Loader2, Plus, X } from "lucide-react";
import { Customer } from "../types/assessment";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomerAndAssessment: (customerId: string, assessmentTitle: string) => Promise<void>;
  onCreateCustomer: (data: { name: string; industry: string; primary_contact_email?: string }) => Promise<Customer>;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSelectCustomerAndAssessment,
  onCreateCustomer,
}) => {
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || "");
  const [assessmentTitle, setAssessmentTitle] = useState<string>("IBM MQ Economic Discovery Assessment");
  
  // New Customer State
  const [newCustName, setNewCustName] = useState<string>("");
  const [newCustIndustry, setNewCustIndustry] = useState<string>("Financial Services & Banking");
  const [newCustEmail, setNewCustEmail] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let targetCustId = selectedCustomerId;

      if (mode === "create") {
        if (!newCustName.trim()) {
          setError("Customer Name is required.");
          setIsLoading(false);
          return;
        }
        const created = await onCreateCustomer({
          name: newCustName.trim(),
          industry: newCustIndustry,
          primary_contact_email: newCustEmail.trim() || undefined,
        });
        targetCustId = created.id;
      }

      if (!targetCustId) {
        setError("Please select or create a customer.");
        setIsLoading(false);
        return;
      }

      await onSelectCustomerAndAssessment(targetCustId, assessmentTitle.trim() || "IBM MQ Assessment");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to initialize assessment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1322]/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E6EE] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-[#38B449]" />
            <h3 className="text-lg font-bold text-[#172033]">
              Start Assessment Discovery Session
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#667085] hover:text-[#172033] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-medium">
              {error}
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-[#F1F3F7] p-1 text-xs font-semibold border border-[#E2E6EE]">
            <button
              type="button"
              onClick={() => setMode("select")}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mode === "select"
                  ? "bg-white text-[#172033] shadow-xs border border-[#CBD2DE]"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              Existing Customer ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mode === "create"
                  ? "bg-white text-[#172033] shadow-xs border border-[#CBD2DE]"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              + Create New Customer
            </button>
          </div>

          {mode === "select" ? (
            <div>
              <label htmlFor="customer-select" className="block text-xs font-semibold text-[#172033] mb-1">
                Select Customer Account
              </label>
              <select
                id="customer-select"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-lg border border-[#CBD2DE] bg-white px-3 py-2 text-sm text-[#172033] shadow-xs focus:border-[#38B449] focus:outline-none focus:ring-2 focus:ring-[#38B449]/20"
              >
                {customers.length === 0 && <option value="">No customers found — create one</option>}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.industry ? `(${c.industry})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="company-name" className="block text-xs font-semibold text-[#172033] mb-1">
                  Company / Organization Name *
                </label>
                <input
                  id="company-name"
                  type="text"
                  required
                  placeholder="e.g. Global Freight Logistics Corp"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD2DE] bg-white px-3 py-2 text-sm text-[#172033] placeholder-[#667085]/60 shadow-xs focus:border-[#38B449] focus:outline-none focus:ring-2 focus:ring-[#38B449]/20"
                />
              </div>

              <div>
                <label htmlFor="industry-select" className="block text-xs font-semibold text-[#172033] mb-1">
                  Industry Sector
                </label>
                <select
                  id="industry-select"
                  value={newCustIndustry}
                  onChange={(e) => setNewCustIndustry(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD2DE] bg-white px-3 py-2 text-sm text-[#172033] shadow-xs focus:border-[#38B449] focus:outline-none focus:ring-2 focus:ring-[#38B449]/20"
                >
                  <option value="Financial Services & Banking">Financial Services & Banking</option>
                  <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                  <option value="Insurance & Payments">Insurance & Payments</option>
                  <option value="Transportation & Logistics">Transportation & Logistics</option>
                  <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                  <option value="Telecommunications">Telecommunications</option>
                  <option value="Energy & Utilities">Energy & Utilities</option>
                  <option value="Public Sector & Government">Public Sector & Government</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs font-semibold text-[#172033] mb-1">
                  Primary Contact Email (Optional)
                </label>
                <input
                  id="contact-email"
                  type="email"
                  placeholder="middleware-lead@company.example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD2DE] bg-white px-3 py-2 text-sm text-[#172033] placeholder-[#667085]/60 shadow-xs focus:border-[#38B449] focus:outline-none focus:ring-2 focus:ring-[#38B449]/20"
                />
              </div>
            </div>
          )}

          {/* Assessment Title */}
          <div className="pt-2 border-t border-[#E2E6EE]">
            <label htmlFor="assessment-title" className="block text-xs font-semibold text-[#172033] mb-1">
              Assessment Session Title
            </label>
            <div className="relative flex items-center">
              <input
                id="assessment-title"
                type="text"
                required
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                className="w-full rounded-lg border border-[#CBD2DE] bg-white px-3 py-2 text-sm text-[#172033] shadow-xs focus:border-[#38B449] focus:outline-none focus:ring-2 focus:ring-[#38B449]/20"
              />
              <FileText className="absolute right-3 h-4 w-4 text-[#667085] pointer-events-none" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E2E6EE]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#667085] hover:text-[#172033] rounded-lg hover:bg-[#F1F3F7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center space-x-2 rounded-lg bg-[#38B449] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#008638] focus:outline-none focus:ring-2 focus:ring-[#38B449] transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : (
                <span>Launch Intake Wizard</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
