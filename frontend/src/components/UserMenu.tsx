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
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition shadow-sm"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span>Sign In</span>
      </button>
    );
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "PLATFORM_ADMIN":
        return "bg-purple-950/80 text-purple-300 border-purple-800/60";
      case "PARTNER_ADMIN":
        return "bg-indigo-950/80 text-indigo-300 border-indigo-800/60";
      case "CONSULTANT":
        return "bg-blue-950/80 text-blue-300 border-blue-800/60";
      case "CUSTOMER_ADMIN":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-800/60";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs transition"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="h-6 w-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 font-semibold text-[11px]">
          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden lg:block">
          <div className="font-medium text-slate-200 truncate max-w-[120px]">{user.full_name || user.email}</div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-xl py-2 z-50 text-xs">
          {/* User Details */}
          <div className="px-4 py-2 border-b border-slate-800">
            <p className="font-semibold text-white truncate">{user.full_name || "Enterprise User"}</p>
            <p className="text-slate-400 truncate text-[11px]">{user.email}</p>
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getRoleBadgeStyle(
                  user.role
                )}`}
              >
                <Shield className="h-3 w-3 mr-1" />
                {user.role}
              </span>
            </div>
          </div>

          {/* Tenant Info */}
          <div className="px-4 py-2 border-b border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
            <Building className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="truncate">Tenant: <span className="font-mono text-slate-300">{user.tenant_id.slice(0, 8)}...</span></span>
          </div>

          {/* Actions */}
          <div className="pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-4 py-2 text-rose-300 hover:bg-rose-950/40 transition text-left"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
