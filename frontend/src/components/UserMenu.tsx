"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { User as UserIcon, LogOut, Shield, Building, ChevronDown, LogIn } from "lucide-react";

export const UserMenu: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.push("/login");
  };

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#38B449] hover:bg-[#008638] text-white text-xs font-semibold transition shadow-xs"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span>Sign In</span>
      </button>
    );
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "PLATFORM_ADMIN":
        return "bg-[#FAF5FF] text-[#722F8A] border-[#E9D5FF]";
      case "PARTNER_ADMIN":
        return "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]";
      case "CONSULTANT":
        return "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]";
      case "CUSTOMER_ADMIN":
        return "bg-slate-100 text-slate-800 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-[#F1F3F7] hover:bg-[#E8ECF2] hover:border-[#94A3B8] border border-[#CBD2DE] text-[#172033] text-xs transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1 cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <div className="h-6 w-6 rounded-full bg-[#EEF8F0] border border-[#A8E2B5] flex items-center justify-center text-[#008638] font-bold text-[11px]">
          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden lg:block">
          <div className="font-semibold text-[#172033] truncate max-w-[120px]">{user.full_name || user.email}</div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-[#5B6579]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-[#E2E6EE] shadow-lg py-2 z-50 text-xs">
          {/* User Details */}
          <div className="px-4 py-2 border-b border-[#E2E6EE]">
            <p className="font-bold text-[#172033] truncate">{user.full_name || "Enterprise User"}</p>
            <p className="text-[#5B6579] truncate text-[11px]">{user.email}</p>
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadgeStyle(
                  user.role
                )}`}
              >
                <Shield className="h-3 w-3 mr-1" />
                {user.role}
              </span>
            </div>
          </div>

          {/* Tenant Info */}
          <div className="px-4 py-2 border-b border-[#E2E6EE] text-[11px] text-[#5B6579] flex items-center space-x-2">
            <Building className="h-3.5 w-3.5 text-[#5B6579] shrink-0" />
            <span className="truncate">Tenant: <span className="font-mono text-[#172033]">{user.tenant_id.slice(0, 8)}...</span></span>
          </div>

          {/* Actions */}
          <div className="pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-4 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors duration-150 text-left font-medium cursor-pointer focus:outline-none focus-visible:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
