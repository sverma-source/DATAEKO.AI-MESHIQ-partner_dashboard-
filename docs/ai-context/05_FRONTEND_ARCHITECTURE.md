# 05. Frontend Architecture & Implementation

> **Status**: IMPLEMENTED  
> **Source Directory**: [`frontend/`](file:///Users/roop/DATAEKO.AI-MESHIQ-partner_dashboard-/frontend/)

---

## 1. Frontend Technology Stack

- **Framework**: Next.js 16.3.6 (App Router architecture, React 19 Server/Client Components, Turbopack).
- **Language**: TypeScript 5.x with strict type checking enabled.
- **Styling**: Tailwind CSS 4.x with centralized meshIQ theme tokens.
- **Icons**: Lucide React 1.48.0 with standardized bounded SVG scaling.
- **State Management**: React `useState`, `useEffect`, `useCallback`, and Context API (`AuthContext.tsx`).
- **Testing**: Vitest 5.0.2 with React Testing Library (23 test files, 226 passing tests).

---

## 2. Directory Structure & Key Modules

```text
frontend/
├── src/
│   ├── app/                                 # Next.js App Router Pages
│   │   ├── layout.tsx                       # Root HTML shell & AuthProvider wrapper
│   │   ├── page.tsx                         # Main Dynamic Assessment & Workspace Page
│   │   ├── globals.css                      # Global Tailwind & Custom UI styles
│   │   ├── login/page.tsx                   # Enterprise Login Experience
│   │   ├── accept-invitation/page.tsx       # User Token Acceptance & Password Setup
│   │   ├── forgot-password/page.tsx         # Password Reset Request Page
│   │   └── reset-password/page.tsx          # Password Reset Execution Page
│   ├── components/                          # Core UI Components
│   │   ├── Navbar.tsx                       # Global Header with Workspace Context & Logo
│   │   ├── UserMenu.tsx                     # Authenticated User Dropdown & Profile
│   │   ├── WizardHeader.tsx                 # Progress Bar, Hierarchy Tracker, Save Status
│   │   ├── SectionNavigation.tsx            # Horizontal Section Scrolling Nav Bar
│   │   ├── QuestionCard.tsx                 # Standardized Assessment Question Card
│   │   ├── ReviewSummary.tsx                # Pre-Flight Review & Audit Summary Screen
│   │   ├── SubmittedResponsesView.tsx       # Read-Only Finalized Discovery View
│   │   ├── ExecutiveDashboard.tsx           # 3-Tier Economic KPI Results Dashboard
│   │   ├── ConsultantWorkspace.tsx          # Consultant Portfolio Management View
│   │   ├── AdminWorkspace.tsx               # Platform & User Governance Registry
│   │   ├── ScenarioSandbox.tsx              # Controlled Sensitivity Modeling Sandbox
│   │   ├── ShowTheMathDrawer.tsx            # Mathematical Formula Audit Transparency
│   │   ├── ExecutiveEconomicNarrative.tsx   # Structured Synthesis Presentation
│   │   ├── MeshIQLoginBackground.tsx        # Geometric Contour Background Artwork
│   │   ├── ProtectedRoute.tsx               # Client-Side Route & Role Guard
│   │   └── CustomerModal.tsx                # Customer Selection & Switching Modal
│   ├── context/
│   │   └── AuthContext.tsx                  # Global Authentication & Session State
│   ├── data/
│   │   └── questionCatalog.ts               # Authoritative Question Catalog & Normalizer
│   ├── services/
│   │   └── api.ts                           # Typed Axios/Fetch API Client Layer
│   ├── types/
│   │   └── assessment.ts                    # TypeScript Interfaces & Enums
│   └── test/                                # 23 Comprehensive Vitest Test Suites
└── scripts/
    └── render_report_pdf.mjs                # Headless Chromium 3-Page PDF Generator
```

---

## 3. State Normalization & Response Persistence Architecture

To prevent data corruption and handle diverse question types (select dropdowns, text overrides, numeric customer facts, and legacy categorical drafts), the frontend utilizes a centralized normalization function:

### `normalizeResponseState(apiResponse, catalog)`
Located in `frontend/src/data/questionCatalog.ts`:
1. **Sanitizes Nested Payloads**: Recursively strips redundant `raw_responses` before persistence, eliminating payload bloat.
2. **Maps Database Columns to Question State**: Merges structured SQL columns (`q04_weekly_admin_hours`, `q14_outage_duration`, etc.) with `raw_responses`.
3. **Resilient Option Mapping**: Normalizes en-dashes (`–`) vs hyphens (`-`) and case variations so stored values match catalog dropdown options seamlessly.
4. **Q04 Exact Value Binding**: Automatically binds exact numeric input to `answers.q04_admin_hours` without synthetic midpoint conversion.

---

## 4. Frontend Security & Defensive Engineering

1. **Authentication State & JWT Handling**:
   - Authentication tokens are stored in secure browser memory / HTTP-only cookies.
   - `AuthContext.tsx` handles automatic login state restoration, permission verification (`hasPermission`), and clean logout token purging.
2. **Client-Side vs. Server-Side Guardrails**:
   - `ProtectedRoute.tsx` guards routes client-side for UX responsiveness.
   - **Critical Principle**: Server-side FastAPI authorization remains the definitive security boundary; client route guards are strictly for presentation flow.
3. **XSS & Unsafe HTML Defense**:
   - All user input is rendered through React JSX standard text nodes with automatic HTML entity escaping.
   - `dangerouslySetInnerHTML` is strictly prohibited across application components.
4. **Bounded SVG Icon Rendering**:
   - Icons utilize explicit `style="width: 16px; height: 16px; flex-shrink: 0;"` constraints to prevent container expansion.

---
