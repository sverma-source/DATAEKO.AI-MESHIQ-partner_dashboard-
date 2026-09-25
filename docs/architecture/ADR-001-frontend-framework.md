# ADR-001: Frontend Framework Selection

## Context
The DATAEKO × meshIQ Partner Dashboard requires an enterprise web presentation layer to support an interactive multi-step assessment intake wizard, real-time executive KPI visualizations, interactive sensitivity sliders for scenario modeling, calculation provenance inspection modals, and high-fidelity report rendering.

## Options Considered
1. **Next.js 14+ (React + TypeScript)**: Full-stack React framework with App Router, SSR, Server Components, API routes, and enterprise TypeScript typing.
2. **Vite + React SPA (TypeScript)**: Lightweight client-side single page application. Fast build times, simple deployment, but requires separate server setup for server-rendered PDF generation.
3. **Vue.js 3 / Nuxt 3 (TypeScript)**: Reactive frontend framework. Clean syntax, but smaller ecosystem for enterprise financial charting libraries (e.g., Tremor, Recharts).
4. **Angular (TypeScript)**: Highly structured enterprise framework, but higher boilerplate and slower prototyping for dynamic consulting wizards.

## Decision
`[RECOMMENDATION]` **Adopt Next.js 14+ with React, TypeScript, and Tailwind CSS/Vanilla CSS components.**

## Rationale
* **Enterprise Chart Ecosystem**: React possesses the richest ecosystem of interactive dashboard and charting components (Recharts, Tremor, Visx) suited for C-level financial presentations.
* **Server-Side Rendering (SSR)**: Enables consistent server-side rendering of report views, simplifying the PDF generation pipeline.
* **Type Safety**: End-to-end TypeScript interfaces shared with OpenAPI schema guarantees type safety across the API boundary.

## Consequences
* **Positive**: Fast interactive wizard, strong component reusability, seamless integration with headless browser PDF rendering engines.
* **Negative**: Requires Node.js runtime for SSR deployment (or static export if SSR is not used).

## Status
`Needs Review` (Pending Human Approval Gate)
