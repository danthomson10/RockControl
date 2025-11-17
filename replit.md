# Rock Control - Enterprise Project Management by TacEdge

## Overview
Rock Control is an enterprise-grade GeoTech Project & Health & Safety management web application. It is a multi-tenant platform designed for construction teams, featuring role-based access control, dynamic JSON Schema-based forms, digital signatures, incident management, and Microsoft integration. Its purpose is to streamline project management and enhance health and safety compliance within the GeoTech and construction industries.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the `shared/rbac.ts` file.
Do not make changes to the `server/rbac.ts` file.
Do not make changes to the `client/src/lib/rbac.ts` file.
Do not make changes to the `storage` folder.

## System Architecture

### UI/UX Decisions
The application features a high-fidelity frontend adhering to the "Rock Control" brand identity, utilizing Rock Red (#E23B2E) and Slate Dark (#3A3A3A) as primary and navigation colors, respectively. It includes a dashboard with stats cards, job detail pages with tabbed navigation, and a responsive sidebar. The design system is built on `shadcn/ui` primitives, incorporating a custom form builder with JSON Schema support, a digital signature canvas, and a voice memo recorder component. Light/dark mode theming is supported.

### Technical Implementations
- **Frontend**: React, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS.
- **Backend**: Express.js, TypeScript.
- **Database**: PostgreSQL (Neon) with Drizzle ORM.
- **Authentication**: Replit Auth with session-based authentication and a PostgreSQL session store.
- **Deployment**: Replit.

### Feature Specifications
- **Multi-tenancy**: Organizations are managed through a dedicated table, and all data operations are scoped to the user's organization using `req.currentUser.organizationId` and storage-layer scoped methods (e.g., `getByIdScoped`, `updateScoped`).
- **Role-Based Access Control (RBAC)**: A shared RBAC module defines a capability matrix for 7 distinct roles (OrgAdmin, ProjectManager, HSEManager, SiteSupervisor, FieldTech, ClientViewer, Subcontractor). Both server-side middleware and client-side UI helpers enforce these permissions. All mutating API endpoints are protected by `requireCapability` middleware.
- **Dynamic Forms**: Supports dynamic JSON Schema-based forms (e.g., Take-5, Crew Briefing, Risk Control Plan, Permit to Work, Incident Report), with digital signature and voice memo capture capabilities. Forms can be linked to specific jobs.
- **Voice-Enabled Forms**: Workers can call +6435672557 (Twilio) and interact with ElevenLabs Conversational AI to complete safety forms hands-free. Voice submissions are tracked with source='voice' and status='pending' for management review.
- **Submissions Management**: Comprehensive /submissions page with filtering by status, form type, and source (web vs voice), displaying submission details with visual badge indicators for voice-submitted forms.
- **Job Management**: CRUD operations for construction projects, including status tracking and linking to sites.
- **Sites Management**: Comprehensive system for managing construction sites, including clients, contacts, and file attachments, with robust multi-tenant isolation and RBAC protection.
- **Incident Management**: Tracking and management of safety incidents with severity levels.
- **SharePoint Integration**: Automatic syncing of incident reports to SharePoint list at https://aitearoa.sharepoint.com/sites/rockcontrol when "Send to SharePoint" is checked. Features include Microsoft Graph API OAuth 2.0 authentication, comprehensive field mapping (date, time, location, severity, description, injuries, etc.), robust date/boolean normalization, and non-blocking error handling (form submissions succeed locally even if SharePoint sync fails).

### System Design Choices
- **API Routes**: All API routes are protected by authentication middleware and enforce organization-level scoping. Specific mutating endpoints are further protected by RBAC middleware.
- **Storage Layer**: An `IStorage` interface with a `DatabaseStorage` implementation using Drizzle ORM ensures consistent data access. It features organization-scoped queries and security-enforced scoped methods to prevent cross-tenant access.
- **Security Architecture**: Emphasizes multi-tenant isolation through route-level protection, session-based organization scoping, storage-layer enforcement, and hardening of POST/PATCH routes by overriding `organizationId`, `createdById`, and `submittedById` from the authenticated user.

## External Dependencies
- **Replit Auth**: For email/password and OAuth (Google, GitHub) authentication.
- **PostgreSQL (Neon)**: The primary database for storing all application data and session information.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **Microsoft Graph API**: Implemented for SharePoint integration using Azure AD OAuth 2.0 with client credentials flow. Enables automatic syncing of incident reports to SharePoint lists with comprehensive field mapping and normalization.
- **SharePoint**: Integrated for incident report storage and tracking at https://aitearoa.sharepoint.com/sites/rockcontrol. Azure credentials stored securely in Replit secrets (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, SHAREPOINT_SITE_ID, SHAREPOINT_LIST_ID).