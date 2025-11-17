import type { Express } from "express";
import { storage } from "./storage";
import { insertClientSchema, insertSiteSchema, insertSiteContactSchema, insertSiteFileSchema, insertJobSchema, insertFormSchema, insertFormTemplateSchema, insertIncidentSchema, insertAccessRequestSchema, updateProfileSchema, jobs, sites, forms, incidents } from "@shared/schema";
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  resendVerificationSchema,
  requestAccessSchema 
} from "@shared/authSchemas";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { hashPassword, verifyPassword, createPasswordResetToken, resetPassword, verifyEmail, resendVerificationEmail, createEmailVerificationToken } from "./passwordAuth";
import { generateAuthUrl, exchangeCodeForTokens, getUserInfo, validateIdToken } from "./microsoftAuth";
import { sendTeamsNotification } from "./microsoftTeams";
import { loadCurrentUser, requireCapability, requireRoles, withAuth } from "./rbac";
import cryptoRandomString from "crypto-random-string";
import { sendAccessRequestNotification, sendAccessRequestApproved } from "./email";
import { sharePointService } from "./sharepoint";
import { aiIncidentAnalyzer } from "./ai-incident-analyzer";
import { db } from "./db";
import { eq, and, ilike, or } from "drizzle-orm";

// Store OAuth state/nonce temporarily (in production, use Redis or session store)
const oauthStateStore = new Map<string, { nonce: string; codeVerifier: string; state: string; createdAt: number }>();

// Clean up old OAuth state entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  for (const [key, value] of Array.from(oauthStateStore.entries())) {
    if (now - value.createdAt > tenMinutes) {
      oauthStateStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Form type mapping for search display
const FORM_TYPE_LABELS: Record<string, string> = {
  'take-5': 'Take 5',
  'crew-briefing': 'Crew Briefing',
  'risk-control-plan': 'Risk Control Plan',
  'permit-to-work': 'Permit to Work',
  'incident-report': 'Incident Report',
  'variation': 'Variation',
};

export async function registerRoutes(app: Express) {
  // Health check endpoint (must be first, before auth)
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Setup authentication
  await setupAuth(app);
  
  
  // Public auth routes (no authentication required)
  
  // Email/Password Registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.users.getByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password
      const passwordHash = await hashPassword(data.password);
      
      // Create user
      const user = await storage.users.create({
        email: data.email,
        name: data.name,
        passwordHash,
        organizationId: data.organizationId || 1,
        role: 'FieldTech',
        active: true,
        emailVerified: false,
      });
      
      // Send verification email
      await createEmailVerificationToken(user.id, data.email, data.name);
      
      res.status(201).json({ 
        message: "Registration successful. Please check your email to verify your account.",
        userId: user.id 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  
  // Email/Password Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.users.getByEmail(data.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const isValid = await verifyPassword(data.password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email before logging in",
          emailNotVerified: true,
          userId: user.id
        });
      }
      
      // Check if user is active
      if (!user.active) {
        return res.status(403).json({ message: "Your account has been deactivated" });
      }
      
      // Set session
      (req as any).session.userId = user.id;
      
      res.json({ user });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  // Logout
  app.post('/api/auth/logout', async (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Forgot Password - Request Reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      
      await createPasswordResetToken(data.email);
      
      // Always return success to prevent email enumeration
      res.json({ message: "If an account with this email exists, a password reset link has been sent." });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      console.error("Forgot password error:", error);
      res.json({ message: "If an account with this email exists, a password reset link has been sent." });
    }
  });
  
  // Reset Password - Submit New Password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const data = resetPasswordSchema.parse(req.body);
      
      await resetPassword(data.token, data.password);
      
      res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Reset password error:", error);
      res.status(400).json({ message: error.message || "Password reset failed" });
    }
  });
  
  // Email Verification
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Verification token is required" });
      }
      
      const userId = await verifyEmail(token);
      
      res.json({ message: "Email verified successfully. You can now log in." });
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.status(400).json({ message: error.message || "Email verification failed" });
    }
  });
  
  // Resend Verification Email
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const data = resendVerificationSchema.parse(req.body);
      
      await resendVerificationEmail(data.email);
      
      res.json({ message: "Verification email sent" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      console.error("Resend verification error:", error);
      res.status(400).json({ message: error.message || "Failed to send verification email" });
    }
  });
  
  // Microsoft SSO - Initiate
  app.get('/api/auth/microsoft', (req, res) => {
    try {
      const state = cryptoRandomString({ length: 32, type: 'url-safe' });
      const nonce = cryptoRandomString({ length: 32, type: 'url-safe' });
      
      const { authUrl, codeVerifier } = generateAuthUrl(state, nonce);
      
      // Store state, nonce, and code verifier for callback validation
      oauthStateStore.set(state, { 
        nonce, 
        codeVerifier, 
        state,
        createdAt: Date.now() 
      });
      
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("Microsoft OAuth initiation error:", error);
      res.status(500).json({ message: "Failed to initiate Microsoft login" });
    }
  });
  
  // Microsoft SSO - Callback (updated path per user's Azure config)
  app.get('/api/auth/callback/azure-ad', async (req, res) => {
    const { code, state } = req.query;
    
    try {
      // Validate callback parameters
      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        console.error("Invalid callback parameters");
        return res.status(400).send("Invalid callback parameters");
      }
      
      // Validate and retrieve stored state
      const storedData = oauthStateStore.get(state);
      if (!storedData) {
        console.error("Invalid or expired state parameter");
        return res.status(400).send("Invalid or expired state parameter");
      }
      
      // Double-check state matches (CSRF protection)
      if (storedData.state !== state) {
        console.error("State parameter mismatch");
        oauthStateStore.delete(state);
        return res.status(400).send("State parameter mismatch");
      }
      
      // Exchange authorization code for tokens
      const tokenSet = await exchangeCodeForTokens(code, storedData.codeVerifier);
      
      // CRITICAL: Verify ID token exists
      if (!tokenSet.id_token) {
        console.error("No ID token in token response");
        oauthStateStore.delete(state);
        return res.status(400).send("No ID token received from Microsoft");
      }
      
      // CRITICAL: Cryptographically verify ID token
      // This validates signature, issuer, audience, expiration, and nonce
      let validatedPayload;
      try {
        validatedPayload = await validateIdToken(tokenSet.id_token, storedData.nonce);
      } catch (err: any) {
        console.error("ID token validation failed:", err.message);
        oauthStateStore.delete(state);
        return res.status(400).send(`ID token validation failed: ${err.message}`);
      }
      
      // Get user info from Microsoft Graph
      const microsoftUser = await getUserInfo(tokenSet.access_token);
      
      // Find or create user
      const email = microsoftUser.mail || microsoftUser.userPrincipalName;
      let user = await storage.users.getByEmail(email);
      
      if (!user) {
        user = await storage.users.create({
          email,
          name: microsoftUser.displayName || email,
          firstName: microsoftUser.givenName,
          lastName: microsoftUser.surname,
          emailVerified: true,
          organizationId: 1,
          role: 'FieldTech',
          active: true,
        });
      }
      
      // Store or update OAuth connection
      const existingConnection = await storage.oauthConnections.getByUserAndProvider(user.id, 'microsoft');
      
      if (existingConnection) {
        await storage.oauthConnections.update(existingConnection.id, {
          accessToken: tokenSet.access_token,
          refreshToken: tokenSet.refresh_token,
          expiresAt: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined,
        });
      } else {
        await storage.oauthConnections.create({
          userId: user.id,
          provider: 'microsoft',
          providerUserId: microsoftUser.id,
          accessToken: tokenSet.access_token,
          refreshToken: tokenSet.refresh_token,
          expiresAt: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined,
        });
      }
      
      // Set session only after successful validation
      (req as any).session.userId = user.id;
      
      // Clean up state after success
      oauthStateStore.delete(state);
      
      // Redirect to app
      res.redirect('/');
    } catch (error: any) {
      // Clean up state on any error
      if (state && typeof state === 'string') {
        oauthStateStore.delete(state);
      }
      
      console.error("Microsoft OAuth callback error:", error);
      res.status(500).send("Authentication failed");
    }
  });
  
  // Access Request - Submit
  app.post('/api/auth/request-access', async (req, res) => {
    try {
      const data = requestAccessSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.users.getByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      
      // Create access request
      const request = await storage.accessRequests.create({
        email: data.email,
        name: data.name,
        organizationId: data.organizationId,
        status: 'pending',
      });
      
      // Get organization to notify admins
      const org = await storage.organizations.getById(data.organizationId);
      if (org) {
        console.log(`Access request created for ${data.email} to ${org.name}`);
      }
      
      res.status(201).json({ 
        message: "Access request submitted successfully. You will be notified when it's approved.",
        requestId: request.id 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Access request error:", error);
      res.status(500).json({ message: "Failed to submit access request" });
    }
  });
  
  // Current user info (can work with session-based or Replit auth)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      let user;
      
      // Check session-based auth first
      if (req.session?.userId) {
        user = await storage.users.getById(req.session.userId);
      }
      // Fall back to Replit auth
      else if (req.user?.claims?.sub) {
        const replitId = req.user.claims.sub;
        user = await storage.users.getByReplitId(replitId);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Update current user profile
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      
      // Get current user ID
      let userId: number | undefined;
      if (req.session?.userId) {
        userId = req.session.userId;
      } else if (req.user?.claims?.sub) {
        const replitId = req.user.claims.sub;
        const user = await storage.users.getByReplitId(replitId);
        userId = user?.id;
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Update user profile
      const updatedUser = await storage.users.update(userId, data);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // ====== Settings Routes ======
  
  // Get organization details (for settings page)
  app.get('/api/settings/organization', ...withAuth(isAuthenticated), requireCapability('canManageUsers'), async (req, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      const organization = await storage.organizations.getById(organizationId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(organization);
    } catch (error: any) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });
  
  // Update organization details
  app.patch('/api/settings/organization', ...withAuth(isAuthenticated), requireCapability('canManageUsers'), async (req, res) => {
    try {
      const { updateOrganizationSchema } = await import("@shared/schema");
      const data = updateOrganizationSchema.parse(req.body);
      const organizationId = req.currentUser!.organizationId;
      
      const updatedOrganization = await storage.organizations.update(organizationId, data);
      
      if (!updatedOrganization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(updatedOrganization);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Organization update error:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });
  
  // Get all users in organization (for settings page)
  app.get('/api/settings/users', ...withAuth(isAuthenticated), requireCapability('canManageUsers'), async (req, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      const users = await storage.users.getByOrganization(organizationId);
      
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Update user settings (role and active status)
  app.patch('/api/settings/users/:id', ...withAuth(isAuthenticated), requireCapability('canManageUsers'), async (req, res) => {
    try {
      const { updateUserSettingsSchema } = await import("@shared/schema");
      const data = updateUserSettingsSchema.parse(req.body);
      const userId = parseInt(req.params.id);
      const organizationId = req.currentUser!.organizationId;
      const currentUserId = req.currentUser!.id;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const updatedUser = await storage.users.updateSettings(userId, organizationId, currentUserId, data);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("User settings update error:", error);
      res.status(500).json({ message: error.message || "Failed to update user settings" });
    }
  });
  
  // Helper to get organization ID from authenticated user
  const getOrgFromUser = async (req: any): Promise<number> => {
    // Support email/password or Microsoft SSO authentication
    if (req.session && req.session.userId) {
      const user = await storage.users.getById(req.session.userId);
      if (!user) throw new Error("User not found");
      return user.organizationId;
    }

    // Support Replit OAuth authentication
    const replitId = req.user?.claims?.sub;
    if (!replitId) throw new Error("User not authenticated");
    const user = await storage.users.getByReplitId(replitId);
    if (!user) throw new Error("User not found");
    return user.organizationId;
  };

  
  // ====== Dashboard Routes ======
  
  // Basic stats for all authenticated users
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      
      const [jobStats, formStats, incidentStats, siteStats] = await Promise.all([
        storage.jobs.getStats(organizationId),
        storage.forms.getStats(organizationId),
        storage.incidents.getStats(organizationId),
        storage.sites.getStats(organizationId),
      ]);
      
      res.json({
        jobs: jobStats,
        forms: formStats,
        incidents: incidentStats,
        sites: siteStats,
        activeJobs: jobStats.active,
        formsPending: formStats.pending,
        openIncidents: incidentStats.open,
        complianceRate: formStats.total > 0 
          ? Math.round((formStats.completed / formStats.total) * 100)
          : 100,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Comprehensive overview for management and supervisor users
  app.get("/api/dashboard/overview", isAuthenticated, loadCurrentUser, requireRoles(["OrgAdmin", "ProjectManager", "HSEManager", "SiteSupervisor"]), async (req: any, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      
      const [
        jobs,
        recentForms,
        recentIncidents,
        sites,
        jobStats,
        formStats,
        incidentStats,
        siteStats
      ] = await Promise.all([
        storage.jobs.getByOrganization(organizationId),
        storage.forms.getByOrganization(organizationId, 10),
        storage.incidents.getByOrganization(organizationId, 10),
        storage.sites.getByOrganization(organizationId),
        storage.jobs.getStats(organizationId),
        storage.forms.getStats(organizationId),
        storage.incidents.getStats(organizationId),
        storage.sites.getStats(organizationId),
      ]);
      
      // Calculate project progress metrics - guard against missing progress fields
      const totalProgress = jobs.reduce((sum, job) => sum + (job.progress || 0), 0);
      const averageProgress = jobs.length > 0 ? Math.round(totalProgress / jobs.length) : 0;
      
      // Calculate completion rate
      const completionRate = jobStats.total > 0
        ? Math.round((jobStats.completed / jobStats.total) * 100)
        : 0;
      
      // Calculate compliance rate (forms completed vs total)
      const complianceRate = formStats.total > 0
        ? Math.round((formStats.completed / formStats.total) * 100)
        : 100;
      
      res.json({
        stats: {
          jobs: jobStats,
          forms: formStats,
          incidents: incidentStats,
          sites: siteStats,
        },
        metrics: {
          averageProgress,
          completionRate,
          complianceRate,
        },
        recentActivity: {
          forms: recentForms,
          incidents: recentIncidents,
        },
        activeJobs: jobs.filter(j => j.status === 'active'),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Personal activity for frontline users (FieldTech, Subcontractor)
  app.get("/api/dashboard/my-activity", isAuthenticated, loadCurrentUser, async (req: any, res) => {
    try {
      const user = req.currentUser;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const organizationId = user.organizationId;
      
      // Get user's assigned jobs via job members - ONLY fetch assigned job IDs
      const userJobMembers = await storage.jobMembers.getByUser(user.id);
      const userJobIds = userJobMembers.map(member => member.jobId);
      
      // Fetch ONLY assigned jobs (not all organization jobs)
      const assignedJobsPromises = userJobIds.map(jobId => 
        storage.jobs.getByIdScoped(jobId, organizationId)
      );
      const assignedJobsResults = await Promise.all(assignedJobsPromises);
      const assignedJobs = assignedJobsResults.filter((job): job is NonNullable<typeof job> => job !== undefined);
      
      // Get ONLY forms submitted by this user
      const allForms = await storage.forms.getByOrganization(organizationId);
      const myForms = allForms.filter(form => form.submittedById === user.id);
      
      // Get ONLY incidents reported by this user
      const allIncidents = await storage.incidents.getByOrganization(organizationId);
      const myIncidents = allIncidents.filter(incident => incident.reportedById === user.id);
      
      res.json({
        assignedJobs: assignedJobs.filter(j => j.status === 'active'),
        myForms: myForms.slice(0, 10),
        myIncidents: myIncidents.slice(0, 10),
        stats: {
          assignedJobsCount: assignedJobs.length,
          activeAssignments: assignedJobs.filter(j => j.status === 'active').length,
          formsSubmitted: myForms.length,
          incidentsReported: myIncidents.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ====== Global Search Route ======
  
  // Global search across all entities
  app.get("/api/search", ...withAuth(isAuthenticated), async (req, res) => {
    try {
      const user = req.currentUser;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const query = req.query.q as string;
      
      // Validate query parameter
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: "Search query parameter 'q' is required" });
      }
      
      const organizationId = user.organizationId;
      const searchPattern = `%${query}%`;
      
      // Search forms by type (matching display names)
      const matchingFormTypes: Array<{ type: string; label: string; url: string }> = [];
      for (const [type, label] of Object.entries(FORM_TYPE_LABELS)) {
        if (label.toLowerCase().includes(query.toLowerCase())) {
          matchingFormTypes.push({
            type,
            label,
            url: `/forms?type=${type}`,
          });
        }
      }
      const formResults = matchingFormTypes.slice(0, 5);
      
      // Search jobs by name or code
      const jobResults = await db
        .select({
          id: jobs.id,
          name: jobs.name,
          code: jobs.code,
          url: jobs.id,
        })
        .from(jobs)
        .where(
          and(
            eq(jobs.organizationId, organizationId),
            or(
              ilike(jobs.name, searchPattern),
              ilike(jobs.code, searchPattern)
            )
          )
        )
        .limit(5);
      
      // Format job results with proper URL
      const formattedJobs = jobResults.map(job => ({
        id: job.id,
        name: job.name,
        code: job.code,
        url: `/jobs/${job.id}`,
      }));
      
      // Search sites by name or address
      const siteResults = await db
        .select({
          id: sites.id,
          name: sites.name,
          address: sites.address,
        })
        .from(sites)
        .where(
          and(
            eq(sites.organizationId, organizationId),
            or(
              ilike(sites.name, searchPattern),
              ilike(sites.address, searchPattern)
            )
          )
        )
        .limit(5);
      
      // Format site results with proper URL
      const formattedSites = siteResults.map(site => ({
        id: site.id,
        name: site.name,
        url: `/sites/${site.id}`,
      }));
      
      // Search incidents by title or incidentCode
      const incidentResults = await db
        .select({
          id: incidents.id,
          title: incidents.title,
          incidentCode: incidents.incidentCode,
        })
        .from(incidents)
        .where(
          and(
            eq(incidents.organizationId, organizationId),
            or(
              ilike(incidents.title, searchPattern),
              ilike(incidents.incidentCode, searchPattern)
            )
          )
        )
        .limit(5);
      
      // Format incident results with proper URL
      const formattedIncidents = incidentResults.map(incident => ({
        id: incident.id,
        title: incident.title,
        code: incident.incidentCode,
        url: `/incidents/${incident.id}`,
      }));
      
      // Search submissions (forms) by type or status
      const submissionResults = await db
        .select({
          id: forms.id,
          type: forms.type,
          status: forms.status,
        })
        .from(forms)
        .where(
          and(
            eq(forms.organizationId, organizationId),
            or(
              ilike(forms.type, searchPattern),
              ilike(forms.status, searchPattern)
            )
          )
        )
        .limit(5);
      
      // Format submission results with proper URL
      const formattedSubmissions = submissionResults.map(submission => ({
        id: submission.id,
        formType: submission.type,
        url: `/submissions`,
      }));
      
      // Return categorized results
      res.json({
        forms: formResults,
        jobs: formattedJobs,
        sites: formattedSites,
        incidents: formattedIncidents,
        submissions: formattedSubmissions,
      });
    } catch (error: any) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed", message: error.message });
    }
  });
  
  // ====== Job Routes ======
  
  app.get("/api/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const jobs = await storage.jobs.getByOrganization(organizationId);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/jobs/code/:code", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const code = req.params.code;
      const job = await storage.jobs.getByCode(code, organizationId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      const members = await storage.jobMembers.getByJob(job.id);
      
      res.json({ ...job, members });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const id = parseInt(req.params.id);
      const job = await storage.jobs.getByIdScoped(id, organizationId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      const members = await storage.jobMembers.getByJob(id);
      
      res.json({ ...job, members });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/jobs", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const data = insertJobSchema.parse(req.body);
      
      // Enforce tenant isolation - override organizationId and createdById
      const job = await storage.jobs.create({ 
        ...data, 
        organizationId,
        createdById: user.id 
      });
      res.status(201).json(job);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/jobs/:id", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      const data = insertJobSchema.partial().parse(req.body);
      
      // Use scoped update - enforces tenant isolation at storage layer
      const job = await storage.jobs.updateScoped(id, organizationId, data);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      res.json(job);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/forms", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const forms = await storage.forms.getByOrganization(organizationId, limit);
      res.json(forms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/forms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const id = parseInt(req.params.id);
      const form = await storage.forms.getByIdScoped(id, organizationId);
      
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      
      res.json(form);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/forms", ...withAuth(isAuthenticated), requireCapability("canManageForms"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const syncToSharePoint = req.body.syncToSharePoint;
      const data = insertFormSchema.parse(req.body);
      
      // Enforce tenant isolation - override organizationId and submittedById
      const form = await storage.forms.create({ 
        ...data,
        submittedById: user.id 
      } as any);
      
      // SharePoint integration for incident reports
      if (syncToSharePoint && form.type === 'incident-report') {
        try {
          if (sharePointService.isConfigured()) {
            const sharepointItemId = await sharePointService.createIncidentReportItem({
              formData: form.formData as any,
              formCode: form.formCode,
              submittedBy: user.name,
              submittedAt: form.createdAt,
            });
            
            if (sharepointItemId) {
              // Update form with SharePoint item ID
              const updated = await storage.forms.update(form.id, {
                sharepointItemId,
              } as any);
              
              if (updated) {
                form.sharepointItemId = sharepointItemId;
              }
              
              console.log(`✅ Incident report ${form.formCode} synced to SharePoint (ID: ${sharepointItemId})`);
            }
          } else {
            console.warn('⚠️  SharePoint sync requested but service not configured');
          }
        } catch (sharepointError: any) {
          console.error('❌ SharePoint sync failed:', sharepointError.message);
          // Don't fail the form submission if SharePoint sync fails
        }
      }

      // AI analysis for incident reports
      if (form.type === 'incident-report') {
        try {
          const analysis = await aiIncidentAnalyzer.analyzeIncident({
            formData: form.formData as any,
            formCode: form.formCode,
            type: form.type,
          });

          if (analysis) {
            // Update form with AI analysis
            const updated = await storage.forms.update(form.id, {
              aiSummary: analysis.summary,
              aiRecommendations: analysis.recommendations,
            } as any);

            if (updated) {
              form.aiSummary = analysis.summary;
              form.aiRecommendations = analysis.recommendations as any;
            }

            console.log(`🤖 AI analysis completed for ${form.formCode}`);
          }
        } catch (aiError: any) {
          console.error('❌ AI analysis failed:', aiError.message);
          // Don't fail the form submission if AI analysis fails
        }
      }
      
      res.status(201).json(form);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/forms/:id", ...withAuth(isAuthenticated), requireCapability("canManageForms"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      const data = insertFormSchema.partial().parse(req.body);
      
      // Use scoped update - enforces tenant isolation at storage layer
      const form = await storage.forms.updateScoped(id, organizationId, data);
      
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      
      res.json(form);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Form Templates - Public endpoint for active templates (all authenticated users)
  app.get("/api/form-templates/available", ...withAuth(isAuthenticated), async (req: any, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      const templates = await storage.formTemplates.getByOrganization(organizationId, false);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Form Templates - Admin only (OrgAdmin/HSEManager)
  app.get("/api/form-templates", ...withAuth(isAuthenticated), requireCapability("canManageForms"), async (req: any, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      const includeInactive = req.query.includeInactive === 'true';
      const templates = await storage.formTemplates.getByOrganization(organizationId, includeInactive);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/form-templates/:id", ...withAuth(isAuthenticated), async (req: any, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      const id = parseInt(req.params.id);
      const template = await storage.formTemplates.getByIdScoped(id, organizationId);
      
      if (!template) {
        return res.status(404).json({ error: "Form template not found" });
      }
      
      // Only allow active templates for non-admin users
      const user = req.currentUser!;
      const canManage = user.role === 'OrgAdmin' || user.role === 'HSEManager';
      if (!template.active && !canManage) {
        return res.status(404).json({ error: "Form template not found" });
      }
      
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/form-templates", ...withAuth(isAuthenticated), requireCapability("canManageForms"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const data = insertFormTemplateSchema.parse(req.body);
      
      // Enforce tenant isolation - override organizationId and createdById
      const template = await storage.formTemplates.create({ 
        ...data,
        createdById: user.id 
      } as any);
      res.status(201).json(template);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/form-templates/:id", ...withAuth(isAuthenticated), requireCapability("canManageForms"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      const data = insertFormTemplateSchema.partial().parse(req.body);
      
      // Use scoped update - enforces tenant isolation at storage layer
      const template = await storage.formTemplates.update(id, organizationId, data);
      
      if (!template) {
        return res.status(404).json({ error: "Form template not found" });
      }
      
      res.json(template);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete("/api/form-templates/:id", ...withAuth(isAuthenticated), requireCapability("canManageForms"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      
      // Soft delete - marks as inactive
      await storage.formTemplates.delete(id, organizationId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Variation-specific endpoint with Teams/SharePoint integration  
  app.post("/api/variations", ...withAuth(isAuthenticated), requireCapability("canManageForms"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const { jobCode, formData, sendToTeams } = req.body;
      
      // Find job by code
      const job = await storage.jobs.getByCode(jobCode, organizationId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      // Generate unique form code
      const formCode = `${formData.variationNumber || 'VAR'}-${Date.now()}`;
      
      // Create variation form
      const formPayload: any = {
        organizationId,
        jobId: job.id,
        formCode,
        type: "variation" as const,
        status: "pending" as const,
        formData: formData,
        submittedById: user.id,
      };
      
      const variation = await storage.forms.create(formPayload);
      
      // Send Teams notification if enabled
      if (sendToTeams && formData.variationTitle) {
        try {
          await sendTeamsNotification({
            title: formData.variationTitle,
            text: formData.description || "No description provided",
            variationNumber: formData.variationNumber,
            jobCode: formData.jobCode,
            category: formData.category,
            impactType: formData.impactType,
            costImpact: formData.costImpact,
            timeImpact: formData.timeImpact,
            requestedBy: formData.requestedBy,
          });
        } catch (teamsError) {
          console.error("Teams notification failed:", teamsError);
          // Don't fail the request if Teams notification fails
        }
      }
      
      res.status(201).json(variation);
    } catch (error: any) {
      console.error("Variation submission error:", error);
      res.status(500).json({ error: error.message || "Failed to submit variation" });
    }
  });
  
  // ====== SharePoint Configuration Routes ======
  
  app.get("/api/sharepoint-config", ...withAuth(isAuthenticated), requireCapability("canManageIntegrations"), async (req: any, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      const config = await storage.sharepointConfig.getByOrganization(organizationId);
      res.json(config || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/sharepoint-config/initialize", ...withAuth(isAuthenticated), requireCapability("canManageIntegrations"), async (req: any, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      const { siteUrl, incidentListName } = req.body;
      
      if (!siteUrl) {
        return res.status(400).json({ error: "Site URL is required" });
      }
      
      // Initialize SharePoint connection and get site ID
      const { siteId } = await sharepointService.initializeSharePointConfig(siteUrl, organizationId);
      
      // Try to discover the incident list if name provided
      let listId: string | undefined;
      let listName: string | undefined;
      
      if (incidentListName) {
        try {
          const listInfo = await sharepointService.discoverIncidentList(siteId, incidentListName);
          listId = listInfo.listId;
          listName = listInfo.listName;
        } catch (error: any) {
          console.warn('Failed to discover list:', error.message);
        }
      }
      
      // Upsert configuration
      const config = await storage.sharepointConfig.upsert(organizationId, {
        siteUrl,
        siteId,
        incidentListId: listId,
        incidentListName: listName || incidentListName,
        enabled: !!listId, // Only enable if list was found
      });
      
      res.json(config);
    } catch (error: any) {
      console.error("SharePoint config initialization error:", error);
      res.status(500).json({ error: error.message || "Failed to initialize SharePoint configuration" });
    }
  });
  
  app.patch("/api/sharepoint-config", ...withAuth(isAuthenticated), requireCapability("canManageIntegrations"), async (req: any, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      const updates = req.body;
      
      const existingConfig = await storage.sharepointConfig.getByOrganization(organizationId);
      if (!existingConfig) {
        return res.status(404).json({ error: "SharePoint configuration not found. Please initialize first." });
      }
      
      const config = await storage.sharepointConfig.update(existingConfig.id, updates);
      res.json(config);
    } catch (error: any) {
      console.error("SharePoint config update error:", error);
      res.status(500).json({ error: error.message || "Failed to update SharePoint configuration" });
    }
  });
  
  // ====== Incidents Routes ======
  
  app.get("/api/incidents", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const incidents = await storage.incidents.getByOrganization(organizationId, limit);
      res.json(incidents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/incidents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const id = parseInt(req.params.id);
      const incident = await storage.incidents.getByIdScoped(id, organizationId);
      
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      res.json(incident);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/incidents", ...withAuth(isAuthenticated), requireCapability("canManageIncidents"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const data = insertIncidentSchema.parse(req.body);
      
      // Enforce tenant isolation - override organizationId and reportedById
      const incident = await storage.incidents.create({ 
        ...data, 
        organizationId,
        reportedById: user.id 
      });
      res.status(201).json(incident);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/incidents/:id", ...withAuth(isAuthenticated), requireCapability("canManageIncidents"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      const data = insertIncidentSchema.partial().parse(req.body);
      
      // Use scoped update - enforces tenant isolation at storage layer
      const incident = await storage.incidents.updateScoped(id, organizationId, data);
      
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      res.json(incident);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // ====== Sites Routes ======
  
  app.get("/api/sites", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const status = req.query.status as 'active' | 'completed' | 'archived' | undefined;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const search = req.query.search as string | undefined;
      
      const filters = { status, clientId, search };
      const sites = await storage.sites.getByOrganization(organizationId, filters);
      res.json(sites);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/sites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const id = parseInt(req.params.id);
      const site = await storage.sites.getByIdScoped(id, organizationId);
      
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      res.json(site);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/sites", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const data = insertSiteSchema.parse(req.body);
      
      const site = await storage.sites.create({ 
        ...data, 
        organizationId,
        createdById: user.id 
      });
      res.status(201).json(site);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/sites/:id", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      const data = insertSiteSchema.partial().parse(req.body);
      
      const site = await storage.sites.updateScoped(id, organizationId, data);
      
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      res.json(site);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // ====== Clients Routes ======
  
  app.get("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const includeInactive = req.query.includeInactive === 'true';
      const clients = await storage.clients.getByOrganization(organizationId, includeInactive);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const id = parseInt(req.params.id);
      const client = await storage.clients.getByIdScoped(id, organizationId);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/clients", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const data = insertClientSchema.parse(req.body);
      
      const client = await storage.clients.create({ 
        ...data, 
        organizationId 
      });
      res.status(201).json(client);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/clients/:id", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      const data = insertClientSchema.partial().parse(req.body);
      
      const client = await storage.clients.update(id, organizationId, data);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      res.json(client);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete("/api/clients/:id", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      
      const client = await storage.clients.archive(id, organizationId);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ====== Site Contacts Routes ======
  
  app.get("/api/sites/:siteId/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const siteId = parseInt(req.params.siteId);
      
      // Verify site belongs to user's organization first
      const site = await storage.sites.getByIdScoped(siteId, organizationId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      const contacts = await storage.siteContacts.getBySiteScoped(siteId, organizationId);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/sites/:siteId/contacts", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const siteId = parseInt(req.params.siteId);
      
      // Verify site belongs to user's organization first
      const site = await storage.sites.getByIdScoped(siteId, organizationId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      const data = insertSiteContactSchema.parse(req.body);
      
      const contact = await storage.siteContacts.create({ 
        ...data, 
        siteId,
        organizationId 
      });
      res.status(201).json(contact);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete("/api/site-contacts/:id", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      
      await storage.siteContacts.delete(id, organizationId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ====== Site Files Routes ======
  
  app.get("/api/sites/:siteId/files", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const siteId = parseInt(req.params.siteId);
      const fileType = req.query.type as 'image' | 'drone' | 'contract' | 'document' | undefined;
      
      // Verify site belongs to user's organization first
      const site = await storage.sites.getByIdScoped(siteId, organizationId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      const files = await storage.siteFiles.getBySiteScoped(siteId, organizationId, fileType);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/sites/:siteId/files", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const siteId = parseInt(req.params.siteId);
      
      // Verify site belongs to user's organization first
      const site = await storage.sites.getByIdScoped(siteId, organizationId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      const data = insertSiteFileSchema.parse(req.body);
      
      const file = await storage.siteFiles.create({ 
        ...data, 
        siteId,
        organizationId,
        uploadedById: user.id 
      });
      res.status(201).json(file);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete("/api/site-files/:id", ...withAuth(isAuthenticated), requireCapability("canManageJobs"), async (req: any, res) => {
    try {
      const user = req.currentUser!;
      const organizationId = user.organizationId;
      const id = parseInt(req.params.id);
      
      await storage.siteFiles.delete(id, organizationId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // OpenAI Realtime API endpoints for conversational voice forms
  app.post("/api/realtime/session", ...withAuth(isAuthenticated), async (req: any, res) => {
    try {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-realtime-preview-2024-12-17",
          voice: "cedar",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI session creation failed:", error);
        return res.status(response.status).json({ error: "Failed to create session" });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Realtime session error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get form schema for AI instructions
  app.get("/api/realtime/form-schema/:formType", ...withAuth(isAuthenticated), async (req: any, res) => {
    try {
      const { formType } = req.params;
      
      // Map form types to their schemas
      const formSchemas: Record<string, any> = {
        "incident-report": {
          title: "Incident Report",
          description: "Report a workplace safety incident",
          requiresSignature: true,
          fields: [
            { name: "incidentDate", type: "date", label: "Date of Incident", required: true },
            { name: "incidentTime", type: "time", label: "Time of Incident", required: true },
            { name: "location", type: "text", label: "Location", required: true },
            { name: "description", type: "textarea", label: "Description of Incident", required: true },
            { name: "severity", type: "radio", label: "Severity", options: ["low", "medium", "high", "critical"], required: true },
            { name: "witnesses", type: "textarea", label: "Witnesses", required: false },
            { name: "immediateAction", type: "textarea", label: "Immediate Action Taken", required: false },
          ]
        },
        "take-5": {
          title: "Take 5 Safety Check",
          description: "Pre-work safety assessment",
          requiresSignature: true,
          fields: [
            { name: "task", type: "text", label: "Task Description", required: true },
            { name: "location", type: "text", label: "Location", required: true },
            { name: "hazards", type: "textarea", label: "Identified Hazards", required: true },
            { name: "controls", type: "textarea", label: "Control Measures", required: true },
            { name: "ppeRequired", type: "checkbox", label: "PPE Required", options: ["Hard Hat", "Safety Glasses", "Gloves", "High Vis", "Steel Toe Boots"], required: false },
          ]
        },
        "variation": {
          title: "Variation Order",
          description: "Request a change to project scope",
          requiresSignature: true,
          fields: [
            { name: "variationNumber", type: "text", label: "Variation Number", required: true },
            { name: "description", type: "textarea", label: "Description", required: true },
            { name: "reason", type: "textarea", label: "Reason for Variation", required: true },
            { name: "impact", type: "textarea", label: "Impact on Schedule/Budget", required: false },
            { name: "estimatedCost", type: "number", label: "Estimated Cost", required: false },
          ]
        },
        "crew-briefing": {
          title: "Crew Briefing",
          description: "Daily crew safety briefing",
          requiresSignature: true,
          fields: [
            { name: "date", type: "date", label: "Briefing Date", required: true },
            { name: "attendees", type: "textarea", label: "Attendees", required: true },
            { name: "workPlan", type: "textarea", label: "Work Plan for Today", required: true },
            { name: "safetyTopics", type: "textarea", label: "Safety Topics Discussed", required: true },
            { name: "equipment", type: "textarea", label: "Equipment Required", required: false },
          ]
        },
        "risk-control-plan": {
          title: "Risk Control Plan",
          description: "Comprehensive risk assessment and control plan",
          requiresSignature: true,
          fields: [
            { name: "activity", type: "text", label: "Activity/Task", required: true },
            { name: "hazards", type: "textarea", label: "Identified Hazards", required: true },
            { name: "riskRating", type: "radio", label: "Risk Rating", options: ["low", "medium", "high", "critical"], required: true },
            { name: "controls", type: "textarea", label: "Control Measures", required: true },
            { name: "residualRisk", type: "radio", label: "Residual Risk", options: ["low", "medium", "high"], required: true },
            { name: "responsiblePerson", type: "text", label: "Responsible Person", required: true },
          ]
        },
      };

      const schema = formSchemas[formType];
      if (!schema) {
        return res.status(404).json({ error: "Form type not found" });
      }

      res.json(schema);
    } catch (error: any) {
      console.error("Form schema error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Setup voice routes
  const { setupVoiceRoutes } = await import('./voice');
  setupVoiceRoutes(app, storage);
  
  // Return storage for WebSocket setup
  return storage;
}
