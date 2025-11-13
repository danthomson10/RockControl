# Rock Control - Enterprise Project Management by TacEdge

## Project Overview
Enterprise-grade GeoTech Project & Health & Safety management web application. Multi-tenant platform featuring role-based access control, dynamic JSON Schema-based forms, digital signatures, incident management, and Microsoft integration for construction teams.

## Tech Stack
- **Frontend**: React, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Auth**: Replit Auth with session-based authentication
- **Deployment**: Replit

## Current Status (November 13, 2025)

### ✅ Completed Features
1. **Replit Auth Integration** (Task 1)
   - Email/password and OAuth (Google, GitHub) authentication
   - Session-based auth with PostgreSQL session store
   - Auto-created sessions table with conditional secure cookies
   - Protected API routes with isAuthenticated middleware
   - Storage-layer scoped methods for critical operations (getByIdScoped, updateScoped)
   - Frontend useAuth hook with proper 401 error handling
   - Landing page for unauthenticated users
   - Auth routing with loading states

2. **Database Schema** (6 tables)
   - organizations: Multi-tenant organization management
   - users: User profiles with replitId mapping, role-based access
   - jobs: Construction projects with status tracking
   - job_members: Team assignments to jobs
   - forms: Dynamic JSON Schema-based forms (Take-5, Crew Briefing, Risk Control Plan, etc.)
   - incidents: Safety incident tracking with severity levels

3. **High-Fidelity Frontend**
   - Rock Control brand identity (Rock Red #E23B2E, Slate Dark #3A3A3A)
   - Dashboard with stats cards and active jobs/recent forms/incidents
   - Job detail pages with tabs (Overview, Forms, Incidents, Team)
   - Forms page with digital signature and voice memo capture
   - Responsive sidebar navigation
   - Theme toggle (light/dark mode)

4. **API Routes** (All Protected)
   - `/api/auth/*`: Login, logout, callback, user session
   - `/api/dashboard/stats`: Organization-scoped dashboard metrics
   - `/api/jobs/*`: CRUD operations with tenant isolation
   - `/api/forms/*`: Form management with org scoping
   - `/api/incidents/*`: Incident tracking with org scoping

5. **Storage Layer**
   - IStorage interface with typed methods
   - DatabaseStorage implementation with Drizzle ORM
   - Partial update methods that filter undefined values
   - Organization-scoped queries (getByOrganization, getStats)
   - Security-enforced scoped methods (getByIdScoped, updateScoped)

## Security Architecture

### Multi-Tenant Isolation
- **Route-level protection**: All API routes require isAuthenticated middleware
- **Session-based org scoping**: getOrgFromUser extracts organizationId from authenticated user
- **Storage-layer enforcement**: Scoped methods (getByIdScoped, updateScoped) prevent cross-tenant access
- **POST route hardening**: organizationId overridden from session, not request body

### Known Limitations (To Address in Tasks 2-3)
1. **User Provisioning**: upsertUser currently assigns new users to org 1 with FieldTech role
   - Will be replaced with invitation-based seat assignment (Task 2)
2. **Collection Endpoints**: getByOrganization/getStats trust route-provided organizationId
   - Acceptable with current middleware protection
   - Future hardening: Refactor to storage-layer scoping (Task 3)

## Database Schema Details

### organizations
- id (serial, PK)
- name, plan, maxSeats, industry
- active, createdAt, updatedAt

### users
- id (serial, PK)
- replitId (unique, for Replit Auth mapping)
- organizationId (FK to organizations)
- email, name, firstName, lastName, profileImageUrl
- role: OrgAdmin | ProjectManager | HSE Manager | Superintendent | Foreman | FieldTech | ReadOnlyClient
- active, createdAt, updatedAt

### jobs
- id (serial, PK)
- organizationId (FK)
- code (unique per org)
- name, location, siteAddress, status (active | completed | on_hold)
- startDate, endDate, budget
- createdById (FK to users)
- createdAt, updatedAt

### job_members
- id (serial, PK)
- jobId (FK)
- userId (FK)
- createdAt

### forms
- id (serial, PK)
- organizationId (FK)
- jobId (FK, nullable)
- formCode (unique per org)
- formType: Take5 | CrewBriefing | RiskControlPlan | PermitToWork (4/12 types implemented)
- jsonData (jsonb - stores form fields)
- signatureDataUrl, voiceMemoUrl
- submittedById (FK to users)
- status: pending | completed | archived
- createdAt, updatedAt

### incidents
- id (serial, PK)
- organizationId (FK)
- jobId (FK, nullable)
- incidentCode (unique per org)
- title, description
- severity: low | medium | high | critical
- status: open | investigating | resolved | closed
- location, reportedById (FK to users)
- createdAt, updatedAt

## Form Types

### Currently Implemented (4/12)
1. Take-5 Safety Check
2. Crew Briefing Plan
3. Risk Control Plan
4. Permit to Work

### To Be Added (Task 8)
5. Site Assessment
6. Rope Rescue Plan
7. Observation
8. Near Miss Report
9. Asset Report
10. Incident Investigation
11. Toolbox Talk
12. Pre-Start Safety Check

## Role-Based Access Control

### 7 Role Types
1. **OrgAdmin**: Full organization control, user/seat management, billing
2. **ProjectManager**: Multi-project oversight, reporting, resource allocation
3. **HSE Manager**: Safety compliance, incident investigation, audit trails
4. **Superintendent**: Project execution, team coordination, schedule management
5. **Foreman**: Day-to-day operations, crew supervision, form submission
6. **FieldTech**: Task execution, form completion, incident reporting
7. **ReadOnlyClient**: View-only access to project status and reports

## Upcoming Tasks (Priority Order)

### Phase 2: Auth & RBAC (Tasks 2-4)
- Task 2: Invitation system, seat assignments table
- Task 3: RBAC middleware, advanced route guards
- Task 4: Login/registration UI with role-based redirects

### Phase 3: Core Pages & Search (Tasks 5-7, 11)
- Task 5: Sites management page
- Task 6: Jobs listing with search/filters
- Task 7: Incidents listing with workflows
- Task 11: Global search

### Phase 4: Forms Expansion (Tasks 8-10)
- Task 8: Add 8 new form types to enum
- Task 9: Form templates system
- Task 10: Multi-step form wizard

### Phase 5: Admin Panel (Task 12)
- User management, seat assignment, role/permission controls

### Phase 6: Microsoft Integration (Tasks 13-15)
- Task 13: Microsoft Graph OAuth setup
- Task 14: Teams notifications
- Task 15: SharePoint document sync

## Developer Notes

### Running the Application
```bash
npm run dev  # Starts Express + Vite dev server on port 5000
```

### Database Management
```bash
npm run db:push        # Sync schema to database (safe)
npm run db:push --force  # Force sync (use for schema changes)
npm run db:studio      # Open Drizzle Studio for DB inspection
```

### Important Patterns
1. **Always use scoped storage methods** when possible (getByIdScoped, updateScoped)
2. **Extract organizationId from session**, never trust request body
3. **Validate with Zod schemas** before storage operations
4. **Filter undefined values** in partial updates
5. **Use isAuthenticated middleware** on ALL protected routes

### Auth Flow
1. User clicks "Sign In" → `/api/login`
2. Replit Auth redirects to OAuth provider (Google/GitHub)
3. Callback to `/api/callback` → `upsertUser` creates/updates user
4. Session stored in PostgreSQL, cookie set
5. Frontend checks `/api/auth/user` → loads user data
6. All API routes protected with `isAuthenticated` middleware

### Tenant Isolation Flow
1. Request → isAuthenticated middleware → verifies session
2. Route → getOrgFromUser(req) → extracts organizationId from authenticated user
3. Storage → getByIdScoped/updateScoped → enforces org check in SQL WHERE clause
4. Response → Only returns data belonging to user's organization

## Design System

### Brand Colors
- **Primary (Rock Red)**: #E23B2E
- **Navigation (Slate Dark)**: #3A3A3A
- **Accent**: Complementary to primary
- **Background/Foreground**: Auto-adapts for light/dark mode

### Component Library
- Built on shadcn/ui primitives
- Custom form builder with JSON Schema support
- Digital signature canvas component
- Voice memo recorder component
- Responsive sidebar with collapsible nav

## API Documentation

### Authentication Endpoints
- `GET /api/login` - Initiates Replit Auth flow
- `GET /api/callback` - OAuth callback handler
- `GET /api/logout` - Destroys session, redirects to landing
- `GET /api/auth/user` - Returns current authenticated user or null

### Protected Endpoints (require isAuthenticated)
- `GET /api/dashboard/stats` - Organization dashboard metrics
- `GET /api/jobs` - List all jobs for organization
- `GET /api/jobs/:id` - Get job details with members
- `GET /api/jobs/code/:code` - Get job by code (org-scoped)
- `POST /api/jobs` - Create new job (org from session)
- `PATCH /api/jobs/:id` - Update job (org-scoped)
- `GET /api/forms` - List forms (org-scoped, with limit)
- `GET /api/forms/:id` - Get form details (org-scoped)
- `POST /api/forms` - Create form (org from session)
- `PATCH /api/forms/:id` - Update form (org-scoped)
- `GET /api/incidents` - List incidents (org-scoped)
- `GET /api/incidents/:id` - Get incident details (org-scoped)
- `POST /api/incidents` - Create incident (org from session)
- `PATCH /api/incidents/:id` - Update incident (org-scoped)

## Environment Variables (Auto-Configured by Replit)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session encryption key
- `NODE_ENV` - development | production
- PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

## Testing Strategy (To Be Implemented)
- E2E tests with Playwright for user flows
- Unit tests for storage layer
- Integration tests for API routes
- Manual testing for complex forms and signature capture

## Future Considerations
- Offline-first PWA capabilities (service workers)
- Real-time notifications via WebSockets
- Mobile app (React Native)
- Advanced analytics and reporting dashboard
- File attachments to forms/incidents (object storage)
- Audit trail for all data changes
- Export to PDF for forms and reports
