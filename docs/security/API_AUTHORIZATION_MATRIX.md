# API AUTHORIZATION MATRIX — DATAEKO × meshIQ PARTNER DASHBOARD

**Document Version**: 1.0  
**Phase**: Phase 8 — Production Readiness, Security, Identity & Multi-Tenant Hardening  
**Date**: September 25, 2026  
**Status**: APPROVED & IMPLEMENTED  

---

## 1. COMPLETE ROUTE INVENTORY & AUTHORIZATION RULES

| Method | Endpoint Route | Auth Required | Tenant Check | Required Permission | Sensitive Data Returned | Audit Event Triggered |
| :--- | :--- | :---: | :---: | :--- | :---: | :--- |
| **GET** | `/api/v1/health` | No | No | Public Access | No | No |
| **POST** | `/api/v1/auth/login` | No | Yes (Resolved) | Public / Credential | Session Token (Cookie) | `USER_LOGIN_SUCCESS` / `USER_LOGIN_FAILED` |
| **POST** | `/api/v1/auth/logout` | Yes | No | Public / Authenticated | No | `USER_LOGOUT` |
| **GET** | `/api/v1/auth/me` | Yes | Yes | Authenticated User | User Profile & Roles | No |
| **GET** | `/api/v1/customers` | Yes | Yes (Filtered) | `customer:read` | Customer Details | No |
| **POST** | `/api/v1/customers` | Yes | Yes (Bound) | `customer:create` | Customer Details | `CUSTOMER_CREATED` |
| **GET** | `/api/v1/customers/{id}` | Yes | Yes (Anti-IDOR) | `customer:read` | Customer Details | No |
| **PUT** | `/api/v1/customers/{id}` | Yes | Yes (Anti-IDOR) | `customer:update` | Customer Details | `CUSTOMER_UPDATED` |
| **GET** | `/api/v1/assessments` | Yes | Yes (Filtered) | `assessment:read` | Assessment Metadata | No |
| **POST** | `/api/v1/assessments` | Yes | Yes (Bound) | `assessment:create` | Assessment Metadata | `ASSESSMENT_CREATED` |
| **GET** | `/api/v1/assessments/{id}` | Yes | Yes (Anti-IDOR) | `assessment:read` | Assessment Metadata | No |
| **PUT** | `/api/v1/assessments/{id}` | Yes | Yes (Anti-IDOR) | `assessment:update` | Assessment Metadata | `ASSESSMENT_UPDATED` |
| **GET** | `/api/v1/assessments/{id}/responses` | Yes | Yes (Anti-IDOR) | `assessment:read` | Q01–Q22 Discovery Facts, Q15/Q20/Q21 Financials | No |
| **PUT** | `/api/v1/assessments/{id}/responses` | Yes | Yes (Anti-IDOR) | `assessment:update` | Q01–Q22 Discovery Facts, Q15/Q20/Q21 Financials | `ASSESSMENT_RESPONSES_SAVED` |
| **POST** | `/api/v1/assessments/{id}/calculate` | Yes | Yes (Anti-IDOR) | `assessment:calculate` | Immutable Calculation Snapshot & Engine Outputs | `CALCULATION_EXECUTED` |
| **GET** | `/api/v1/assessments/{id}/snapshots` | Yes | Yes (Anti-IDOR) | `snapshot:read` | Immutable Calculation Snapshots | No |
| **GET** | `/api/v1/assessments/{id}/snapshots/{snapshot_id}` | Yes | Yes (Anti-IDOR) | `snapshot:read` | Immutable Calculation Snapshot Details | No |
| **GET** | `/api/v1/audit-events` | Yes | Yes (Filtered) | `audit:read` | Security & Calculation Audit Trail | No |

---

## 2. ANONYMOUS ACCESS POLICY

* **Only `/api/v1/health` and `/api/v1/auth/login` are accessible without authentication.**
* All customer, assessment, discovery response, calculation snapshot, and audit endpoints strictly require a valid, non-expired JWT session token.
* Attempting unauthenticated access to any protected resource returns **`401 Unauthorized`**.

---

## 3. ANTI-IDOR & CROSS-TENANT INFORMATION HIDING

* When a request references an object ID that exists in the database but belongs to a different tenant, the API returns **`404 Not Found`** (or **`403 Forbidden`** depending on privacy policy).
* The API **never returns 200 with another tenant's data**, and **never reveals the existence or customer name of another tenant's record**.
