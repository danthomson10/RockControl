import type { Express } from "express";
import { storage } from "./storage";
import { insertJobSchema, insertFormSchema, insertIncidentSchema, insertAccessRequestSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { hashPassword, verifyPassword, createPasswordResetToken, resetPassword, verifyEmail, resendVerificationEmail, createEmailVerificationToken } from "./passwordAuth";
import { generateAuthUrl, exchangeCodeForTokens, getUserInfo } from "./microsoftAuth";
import cryptoRandomString from "crypto-random-string";
import { sendAccessRequestNotification, sendAccessRequestApproved } from "./email";

// Store OAuth state/nonce temporarily (in production, use Redis or session store)
const oauthStateStore = new Map<string, { nonce: string; codeVerifier: string }>();

export async function registerRoutes(app: Express): Promise<void> {
  // Setup authentication
  await setupAuth(app);
  
  // Public auth routes (no authentication required)
  
  // Email/Password Registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, organizationId } = req.body;
      
      // Validate input
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password, and name are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.users.getByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);
      
      // Create user
      const user = await storage.users.create({
        email,
        name,
        passwordHash,
        organizationId: organizationId || 1, // Default to org 1 if not provided
        role: 'FieldTech', // Default role
        active: true,
        emailVerified: false,
      });
      
      // Send verification email
      await createEmailVerificationToken(user.id, email, name);
      
      res.status(201).json({ 
        message: "Registration successful. Please check your email to verify your account.",
        userId: user.id 
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  
  // Email/Password Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Find user
      const user = await storage.users.getByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
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
      
      // Set session (using express-session)
      (req as any).session.userId = user.id;
      
      res.json({ user });
    } catch (error: any) {
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
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      await createPasswordResetToken(email);
      
      // Always return success to prevent email enumeration
      res.json({ message: "If an account with this email exists, a password reset link has been sent." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.json({ message: "If an account with this email exists, a password reset link has been sent." });
    }
  });
  
  // Reset Password - Submit New Password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      await resetPassword(token, password);
      
      res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (error: any) {
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
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      await resendVerificationEmail(email);
      
      res.json({ message: "Verification email sent" });
    } catch (error: any) {
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
      
      // Store state and code verifier for callback
      oauthStateStore.set(state, { nonce, codeVerifier });
      
      // Clean up old state entries (older than 10 minutes)
      setTimeout(() => oauthStateStore.delete(state), 10 * 60 * 1000);
      
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("Microsoft OAuth initiation error:", error);
      res.status(500).json({ message: "Failed to initiate Microsoft login" });
    }
  });
  
  // Microsoft SSO - Callback
  app.get('/api/auth/microsoft/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        return res.status(400).send("Invalid callback parameters");
      }
      
      const storedData = oauthStateStore.get(state);
      if (!storedData) {
        return res.status(400).send("Invalid or expired state");
      }
      
      // Exchange code for tokens
      const tokenSet = await exchangeCodeForTokens(code, storedData.codeVerifier);
      
      // Get user info from Microsoft Graph
      const microsoftUser = await getUserInfo(tokenSet.access_token!);
      
      // Find or create user
      let user = await storage.users.getByEmail(microsoftUser.mail || microsoftUser.userPrincipalName);
      
      if (!user) {
        // Create new user
        user = await storage.users.create({
          email: microsoftUser.mail || microsoftUser.userPrincipalName,
          name: microsoftUser.displayName || microsoftUser.userPrincipalName,
          firstName: microsoftUser.givenName,
          lastName: microsoftUser.surname,
          emailVerified: true, // Microsoft emails are pre-verified
          organizationId: 1, // Default org
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
          accessToken: tokenSet.access_token!,
          refreshToken: tokenSet.refresh_token,
          expiresAt: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined,
        });
      }
      
      // Set session
      (req as any).session.userId = user.id;
      
      // Clean up state
      oauthStateStore.delete(state);
      
      // Redirect to app
      res.redirect('/');
    } catch (error: any) {
      console.error("Microsoft OAuth callback error:", error);
      res.status(500).send("Authentication failed");
    }
  });
  
  // Access Request - Submit
  app.post('/api/auth/request-access', async (req, res) => {
    try {
      const { email, name, organizationId } = req.body;
      
      if (!email || !name || !organizationId) {
        return res.status(400).json({ message: "Email, name, and organization are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.users.getByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      
      // Create access request
      const request = await storage.accessRequests.create({
        email,
        name,
        organizationId: parseInt(organizationId),
        status: 'pending',
      });
      
      // Get organization to notify admins
      const org = await storage.organizations.getById(parseInt(organizationId));
      if (org) {
        // TODO: Get admin emails and send notification
        // For now, we'll skip the notification
        console.log(`Access request created for ${email} to ${org.name}`);
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
  
  app.post("/api/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const data = insertJobSchema.parse(req.body);
      // Enforce tenant isolation - override organizationId from session
      const job = await storage.jobs.create({ ...data, organizationId });
      res.status(201).json(job);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
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
  
  app.post("/api/forms", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const data = insertFormSchema.parse(req.body);
      // Enforce tenant isolation - override organizationId from session
      const form = await storage.forms.create({ ...data, organizationId });
      res.status(201).json(form);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/forms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
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
  
  app.post("/api/incidents", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
      const data = insertIncidentSchema.parse(req.body);
      // Enforce tenant isolation - override organizationId from session
      const incident = await storage.incidents.create({ ...data, organizationId });
      res.status(201).json(incident);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch("/api/incidents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = await getOrgFromUser(req);
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
}
