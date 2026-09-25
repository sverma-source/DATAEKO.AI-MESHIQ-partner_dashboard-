# ADR-006: Authentication & Multi-Tenant Authorization Strategy

## Context
The platform processes confidential customer IT topologies, incident frequencies, and financial metrics. The security model must support authentication, role-based access control (RBAC), multi-tenant customer isolation, and protection against Insecure Direct Object Reference (IDOR).

## Options Considered
1. **Stateless JWT Tokens with HTTP-Only Cookies & RBAC Middleware**: Issue digitally signed, short-lived JWT tokens stored in HTTP-Only, Secure, SameSite=Strict cookies. Middleware enforces organization scoping and object-level permissions.
2. **Third-Party Identity Provider (Auth0 / Clerk / AWS Cognito)**: Delegate user authentication to a managed SaaS identity provider.
3. **Database-Backed Stateful Server Sessions**: Traditional session identifiers stored in Redis / PostgreSQL with server-side validation.

## Decision
`[RECOMMENDATION]` **Adopt Signed JWT in HTTP-Only Cookies with FastAPI RBAC Middleware and Tenant Scoping for Phase 1.**

## Rationale
* **Zero Secrets in Frontend**: Storing JWTs in HTTP-Only cookies prevents client-side script access (XSS token theft).
* **Decoupled Architecture**: Stateless tokens carry tenant context (`org_id`, `roles`, `user_id`), allowing backend services to verify claims quickly without round-trips to external auth servers on every API call.
* **SSO Readiness**: The internal user abstraction can easily integrate external OIDC/SAML providers (Azure AD / Okta) later by swapping the authentication exchange handler while keeping the internal RBAC middleware unchanged.
* **Anti-IDOR Enforcement**: Every route handler runs object-level validation: `verify_user_access_to_assessment(user, assessment_id)`.

## Consequences
* **Positive**: High security, XSS protection, zero vendor lock-in, straightforward local development.
* **Negative**: Requires implementing password reset, token revocation, and rate limiting logic if built-in auth is used.

## Status
`Needs Review` (Pending Human Approval Gate)
