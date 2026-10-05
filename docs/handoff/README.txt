================================================================================
DATAEKO × meshIQ Partner Dashboard — Project Handoff Package
IBM MQ Economic Cost & Efficiency Assessment Platform
================================================================================

Target Audience: Project Manager, Executive Leadership, Development & Web Teams
Branch: meshiq-handoff
Approved Baseline: dev (commit e2ee663)
Status: Complete, Validated, Ready for Integration Decision

--------------------------------------------------------------------------------
1. OVERVIEW & PURPOSE
--------------------------------------------------------------------------------
This documentation package provides complete technical and business architecture
handoff for the DATAEKO × meshIQ Partner Dashboard.

The platform quantifies the economic value, labor efficiency gains, and risk
reduction of modernizing enterprise IBM MQ estates using meshIQ middleware
analytics and automation.

The primary document for the project manager is:
    docs/handoff/PROJECT_HANDOFF.html

--------------------------------------------------------------------------------
2. PACKAGE CONTENTS & FILE MANIFEST
--------------------------------------------------------------------------------
1. START-HERE.html
   - Central landing page designed for stakeholders opening the package.
   - Provides 1-click links to Business Handoff, Web Integration, and Technical docs.

2. PROJECT_HANDOFF.html
   - The primary comprehensive 26-section technical and business specification.
   - Covers: Architecture, Customer/Consultant/Admin workflows, Q01-Q22 questionnaire,
     Calculation Engine, Economic formulas, Snapshots, Executive PDF & Email deliverables,
     Security (RBAC, Multi-tenancy, Auth), Golden Master testing, and Protected Logic.

3. EMBED_GUIDE.html
   - Architectural guidance for future website integration.
   - Conceptual models for adding an assessment card/CTA to dataeko.ai/partners/meshiq
     pointing to a separately hosted application instance (Recommended), as well as
     optional iframe considerations.
   - NOTE: Informational only. No external website was modified by this project.

4. README.txt (this file)
   - Plaintext summary, manifest, and local verification instructions.

5. assets/
   - Official DATAEKO and meshIQ logo assets for offline browser rendering.

--------------------------------------------------------------------------------
3. HOW TO VIEW THE HANDOFF
--------------------------------------------------------------------------------
To view the documentation, simply double-click or open any of the HTML files in
any modern web browser (Chrome, Safari, Firefox, Edge):

- For executive & business review:
    Open: docs/handoff/START-HERE.html  or  docs/handoff/PROJECT_HANDOFF.html

- For portal / marketing website integration planning:
    Open: docs/handoff/EMBED_GUIDE.html

All HTML files are self-contained and render with full styling and offline assets
without requiring an internet connection or local web server.

--------------------------------------------------------------------------------
4. CRITICAL REPOSITORY & SAFETY RULES
--------------------------------------------------------------------------------
- SOURCE OF TRUTH: The Git repository contains the full production-grade codebase
  (Next.js frontend, FastAPI backend, SQLite/PostgreSQL schema, Calculation Engine).
  This handoff document explains the implementation; it does not replace the code.

- PROTECTED BUSINESS LOGIC: The calculation engine, formulas, lookup tables, and
  Q01-Q22 semantics are verified against 10/10 Golden Master tests. They must NOT
  be altered without explicit business approval.

- SECURITY BOUNDARY: No passwords, OAuth secrets, JWT secrets, or production
  credentials are included in this documentation. All examples use placeholders.

- WEBSITE BOUNDARY: No external website (dataeko.ai or meshiq.com) was touched.
  The manager will oversee production domain setup and website linking when ready.
================================================================================
