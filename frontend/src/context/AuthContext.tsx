"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthState, LoginCredentials, Role, User } from "../types/auth";
import { api } from "../services/api";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: Role | Role[]) => boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getCurrentUser();
      setUser(data.user);
      setPermissions(data.permissions || []);
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.login(credentials);
      setUser(data.user);
      setPermissions(data.permissions || []);
    } catch (err: any) {
      const msg = err.message || "Invalid email or password.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch {
      // Ignore network/logout failure on client; clean local state regardless
    } finally {
      setUser(null);
      setPermissions([]);
      setIsLoading(false);
    }
  };

  const hasPermission = useCallback(
    (permission: string) => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const hasRole = useCallback(
    (roles: Role | Role[]) => {
      if (!user) return false;
      const targetRoles = Array.isArray(roles) ? roles : [roles];
      return targetRoles.includes(user.role);
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    permissions,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    hasPermission,
    hasRole,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const defaultAuthContext: AuthContextType = {
  user: {
    id: "00000000-0000-0000-0000-000000000005",
    email: "client@acme.com",
    full_name: "Acme Client Lead",
    role: "CUSTOMER_USER",
    tenant_id: "00000000-0000-0000-0000-000000000001",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  permissions: [
    "customer:read",
    "assessment:create",
    "assessment:read",
    "assessment:update",
  ],
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  hasPermission: (permission: string) => true,
  hasRole: (roles: Role | Role[]) => true,
  refreshUser: async () => {},
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};
