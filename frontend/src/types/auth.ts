export type Role =
  | "PLATFORM_ADMIN"
  | "PARTNER_ADMIN"
  | "CONSULTANT"
  | "CUSTOMER_ADMIN"
  | "CUSTOMER_USER";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: Role;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AuthResponse {
  expires_in_minutes: number;
  user: User;
  permissions: string[];
}

export type TokenResponse = AuthResponse;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
