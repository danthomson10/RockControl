import type { Express } from "express";
import { storage } from "./storage";
import { insertClientSchema, insertSiteSchema, insertSiteContactSchema, insertSiteFileSchema, insertJobSchema, insertFormSchema, insertFormTemplateSchema, insertIncidentSchema, insertAccessRequestSchema } from "@shared/schema";
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

// Store OAuth state/nonce temporarily (in production, use Redis or session store)
const oauthStateStore = new Map<string, { nonce: string; codeVerifier: string; state: string; createdAt: number }>();

// Clean up old OAuth state entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  for (const [key, value] of oauthStateStore.entries()) {
    if (now - value.createdAt > tenMinutes) {
      oauthStateStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export async function registerRoutes(app: Express): Promise<void> {
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

  
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      
      const [jobStats, formStats, incidentStats] = await Promise.all([
        storage.jobs.getStats(organizationId),
        storage.forms.getStats(organizationId),
        storage.incidents.getStats(organizationId),
      ]);
      
      res.json({
        activeJobs: jobStats.active,
        formsPending: formStats.pending,
        openIncidents: incidentStats.open,
        complianceRate: 98, // todo: Calculate actual compliance rate
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
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
      const data = insertFormSchema.parse(req.body);
      
      // Enforce tenant isolation - override organizationId and submittedById
      const form = await storage.forms.create({ 
        ...data, 
        organizationId,
        submittedById: user.id 
      });
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
  
  app.get("/api/form-templates/:id", ...withAuth(isAuthenticated), requireCapability("canManageForms"), async (req: any, res) => {
    try {
      const organizationId = req.currentUser!.organizationId;
      const id = parseInt(req.params.id);
      const template = await storage.formTemplates.getByIdScoped(id, organizationId);
      
      if (!template) {
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
        organizationId,
        createdById: user.id 
      });
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
}
