# PHASE 8.1 IMPLEMENTATION PLAN — AUTHENTICATION, RBAC & MULTI-TENANT FRONTEND INTEGRATION

**Document Version**: 1.0  
**Phase**: Phase 8.1  
**Project**: DATAEKO × meshIQ Partner Dashboard  
**Date**: September 27, 2026  
**Status**: DRAFT FOR INSPECTION & APPROVAL  

---

## 1. CURRENT AUTHENTICATION ARCHITECTURE (BACKEND)

The backend authentication layer was implemented in Phase 8 and consists of:
* **Endpoints**:
  * `POST /api/v1/auth/login`: Accepts `LoginRequest` (`email`, `password`), verifies password with Bcrypt, generates signed JWT (`HS256`), sets HTTP-only `access_token` cookie, and logs `USER_LOGIN_SUCCESS` / `USER_LOGIN_FAILED` audit events. Returns `TokenResponse` with user metadata and assigned permissions.
  * `GET /api/v1/auth/me`: Validates session from cookie or Authorization Bearer header; returns `TokenResponse` with `user: UserResponse` (`id`, `email`, `full_name`, `role`, `tenant_id`, `is_active`) and `permissions: List[str]`.
  * `POST /api/v1/auth/logout`: Clears the HTTP-only cookie and logs `USER_LOGOUT` audit event.
* **RBAC & Multi-Tenant Dependency Boundary**:
  * `get_current_user`: Strict dependency validating token and active user account.
  * `get_current_tenant_id`: Binds queries strictly to `current_user.tenant_id`.
  * `require_permission` / `require_role`: Enforces server-side authorization on sensitive endpoints.
* **Pre-Seeded Accounts**:
  * `consultant@dataeko.ai` / `Consultant123!` (Role: `CONSULTANT`)
  * `admin@dataeko.ai` / `AdminPass123!` (Role: `PLATFORM_ADMIN`)

---

## 2. CURRENT FRONTEND ARCHITECTURE

* **Framework**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4.
* **Entry Point**: `frontend/src/app/page.tsx` renders `AssessmentWizardPage` which combines `Navbar`, `WizardHeader`, `SectionNavigation`, `QuestionCard`, `ReviewSummary`, `CalculationStatusView`, and `ExecutiveDashboard`.
* **API Client**: `frontend/src/services/api.ts` makes `fetch` calls to `http://localhost:8000/api/v1` with a static default `X-Tenant-ID`.
* **Current Auth State**: The frontend currently operates without checking session status (`/api/v1/auth/me`) or presenting a login screen; it directly renders the assessment wizard.

---

## 3. EXISTING REUSABLE COMPONENTS & SERVICES

* `Navbar`: Renders header, connection health, and engine version indicator.
* `WizardHeader`: Displays section title, progress indicator, and action buttons.
* `SectionNavigation`: Sidebar for navigating Sections A–G, Review, and Results.
* `QuestionCard`: Renders question input controls (dropdowns, inputs, checkboxes).
* `ReviewSummary`: Summarizes answered questions prior to calculation.
* `CalculationStatusView`: Displays deterministic snapshot status and calculation metadata.
* `ExecutiveDashboard`: Multi-tab executive dashboard (Effort, Exposure, Sandbox, Findings, Provenance).
* `ScenarioSandbox`: Interactive scenario modeling component.
* `ExecutiveReportView`: 14-section customer report with PDF print layout.
* `api.ts`: API service with methods for customers, assessments, calculation, and snapshots.

---

## 4. EXISTING GAPS IDENTIFIED

1. **No Frontend Login Screen**: Users navigating to the web application are not prompted to log in.
2. **Missing Session Context & Provider**: No React context manages current user identity, role, permissions, and tenant context.
3. **No Cookie Credentials in API Client**: `frontend/src/services/api.ts` does not explicitly set `credentials: "include"`, which is necessary for the browser to send HTTP-only cookies on cross-origin or local requests.
4. **No Route Protection**: Pages do not redirect unauthenticated users to `/login`.
5. **No Role-Aware UI Controls**: Navigation and actions (e.g. calculation, tenant management, audit review) do not dynamically reflect user role.
6. **No Logout Control**: Navbar does not provide a user menu or logout action.
7. **No Centralized Error Handling for 401/403/500**: API client throws generic error strings without structured user feedback for expired sessions or forbidden actions.

---

## 5. PROPOSED FRONTEND AUTHENTICATION FLOW

```text
1. Application Load / Mount:
   AuthContext -> calls api.getCurrentUser() (/api/v1/auth/me with credentials: "include")
   ├── If 200 OK: Store user, role, permissions, tenant in AuthContext (state = "authenticated")
   └── If 401 Unauthorized / Error: Set state = "unauthenticated" -> redirect to /login

2. Login Form Submission (/login):
   User inputs email/password -> calls api.login({ email, password })
   ├── Backend validates credentials and sets HTTP-only access_token cookie
   ├── AuthContext updates user state
   └── Router redirects to dashboard / wizard (/)

3. Logout Action:
   User clicks "Sign Out" -> calls api.logout()
   ├── Backend clears HTTP-only cookie and logs USER_LOGOUT audit event
   ├── AuthContext resets user state to null (state = "unauthenticated")
   └── Router redirects to /login
```

**Security Invariant**: JWT tokens are **never** stored in `localStorage`, `sessionStorage`, or JavaScript memory variables. Authentication relies entirely on the secure HTTP-only cookie managed by the browser.

---

## 6. PROPOSED ROLE-AWARE NAVIGATION

Using the 5 Phase 8 roles (`PLATFORM_ADMIN`, `PARTNER_ADMIN`, `CONSULTANT`, `CUSTOMER_ADMIN`, `CUSTOMER_USER`):
* **Navbar & User Menu**:
  * Displays current user's full name, role badge, and active tenant name.
  * Role-specific navigation links:
    * `CONSULTANT` / `PARTNER_ADMIN`: Assessment Wizard, Executive Dashboard, Customer Management, Audit Trail.
    * `CUSTOMER_ADMIN`: Assessment Intake, Executive Dashboard, Reports, Team View.
    * `CUSTOMER_USER`: Assessment Discovery Intake, Executive Report View (read-only calculation & audit).
    * `PLATFORM_ADMIN`: Global tenant switcher / cross-tenant view, System Health, Audit Trail.
* **Action Gating**:
  * "Calculate Assessment" button enabled only for roles with `assessment:calculate` permission.
  * "Audit Logs" tab visible only for roles with `audit:read` permission.
  * Backend continues to enforce all permissions authoritatively (defense-in-depth).

---

## 7. PROPOSED PROTECTED-ROUTE STRATEGY

* **Client-Side Auth Guard Component (`ProtectedRoute`)**:
  * Wraps authenticated pages.
  * If `authState === "loading"`, renders an accessible enterprise loading spinner.
  * If `authState === "unauthenticated"`, redirects to `/login`.
  * If authenticated but lacks required role/permission, renders a clean `403 Forbidden` unauthorized state without leaking sensitive underlying data.
* **`/login` Route**:
  * If already authenticated, automatically redirects to `/`.

---

## 8. PROPOSED TESTING STRATEGY

Add dedicated frontend test suites in `frontend/src/test/`:
1. `authContext.test.tsx`:
   * Successful login and session population
   * Failed login with safe error message
   * Session hydration on mount via `/api/v1/auth/me`
   * Logout clears user state
2. `loginPage.test.tsx`:
   * Renders DATAEKO × meshIQ enterprise login layout
   * Form validation (email required, password required)
   * Loading state during authentication
   * Error display on invalid credentials
3. `protectedRoute.test.tsx`:
   * Redirects unauthenticated users to `/login`
   * Allows authenticated users
   * Renders forbidden view for unauthorized roles
4. `apiClient.test.ts`:
   * Handles 401, 403, 404, 500 cleanly with sanitized messages

---

## 9. FILES EXPECTED TO CHANGE / BE CREATED

### Files to Create:
* `frontend/src/types/auth.ts`: TypeScript interfaces for `User`, `Role`, `TokenResponse`, `LoginCredentials`.
* `frontend/src/context/AuthContext.tsx`: React Context for authentication state, session check, login, logout.
* `frontend/src/components/ProtectedRoute.tsx`: Route guard component.
* `frontend/src/components/UserMenu.tsx`: Navbar dropdown with user details, role badge, tenant context, logout button.
* `frontend/src/app/login/page.tsx`: Enterprise login page.
* `frontend/src/test/authContext.test.tsx`: Unit tests for auth context.
* `frontend/src/test/loginPage.test.tsx`: Unit tests for login page.
* `frontend/src/test/protectedRoute.test.tsx`: Unit tests for route protection.

### Files to Modify:
* `frontend/src/services/api.ts`: Add `credentials: "include"`, auth API endpoints (`login`, `logout`, `getCurrentUser`, `listAuditEvents`), and structured error handling.
* `frontend/src/components/Navbar.tsx`: Integrate `UserMenu`, tenant badge, and role display.
* `frontend/src/app/layout.tsx`: Wrap application in `AuthProvider`.
* `frontend/src/app/page.tsx`: Wrap in `ProtectedRoute` and adapt UI controls based on permissions.

---

## 10. FILES THAT MUST REMAIN UNTOUCHED

* `backend/app/calculation_engine/` (Single source of calculation truth; 0 changes)
* `backend/app/models/` (Validated database models; 0 changes)
* `backend/app/services/calculation_service.py` (Validated calculation service; 0 changes)
* `docs/business-spec/` (Authoritative business rules & formulas; 0 changes)
* `frontend/src/data/questionCatalog.ts` (Authoritative Q01–Q22 catalog; 0 changes)
* `frontend/src/services/reportDataAdapter.ts` (Deterministic report adapter; 0 changes)
* `frontend/scripts/generate_pdf.mjs` (Phase 7 PDF export script; 0 changes)
