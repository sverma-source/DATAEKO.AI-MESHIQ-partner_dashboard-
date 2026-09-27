"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types/auth";
import { ShieldAlert, Lock, Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  fallback,
}) => {
  const { user, isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 p-8">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Verifying enterprise session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
        <p className="text-sm text-slate-600 max-w-md mb-6">
          You must be signed in to access the DATAEKO × meshIQ Partner Assessment platform.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition shadow-sm"
        >
          Sign In to Continue
        </button>
      </div>
    );
  }

  // Role validation
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="h-14 w-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
          <ShieldAlert className="h-6 w-6 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 max-w-md mb-4">
          Your account role (<span className="font-semibold text-slate-800">{user?.role}</span>) does not have authorization to view or execute this resource.
        </p>
        <p className="text-xs text-slate-500">
          Please contact your DATAEKO or meshIQ partner administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  // Permission validation
  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="h-14 w-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
          <ShieldAlert className="h-6 w-6 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Permission Denied</h2>
        <p className="text-sm text-slate-600 max-w-md mb-4">
          Missing required authorization: <code className="bg-slate-100 px-2 py-0.5 rounded text-rose-700 font-mono text-xs">{requiredPermission}</code>
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
