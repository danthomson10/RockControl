import type { Express } from "express";
import { storage } from "./storage";
import { insertJobSchema, insertFormSchema, insertIncidentSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<void> {
  // Setup authentication
  await setupAuth(app);
  
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const replitId = req.user.claims.sub;
      const user = await storage.users.getByReplitId(replitId);
      
      if (!user) {
        // User authenticated with Replit but not in database yet
        // This should not happen if upsertUser works correctly, but handle gracefully
        console.warn(`Authenticated user ${replitId} not found in database`);
        return res.status(401).json({ message: "User not found" });
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
      const job = await storage.jobs.getById(id);
      
      if (!job || job.organizationId !== organizationId) {
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
      const data = insertJobSchema.parse(req.body);
      const job = await storage.jobs.create(data);
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
      const id = parseInt(req.params.id);
      const data = insertJobSchema.partial().parse(req.body);
      const job = await storage.jobs.update(id, data);
      
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
      const id = parseInt(req.params.id);
      const form = await storage.forms.getById(id);
      
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
      const data = insertFormSchema.parse(req.body);
      const form = await storage.forms.create(data);
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
      const id = parseInt(req.params.id);
      const data = insertFormSchema.partial().parse(req.body);
      const form = await storage.forms.update(id, data);
      
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
      const id = parseInt(req.params.id);
      const incident = await storage.incidents.getById(id);
      
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
      const data = insertIncidentSchema.parse(req.body);
      const incident = await storage.incidents.create(data);
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
      const id = parseInt(req.params.id);
      const data = insertIncidentSchema.partial().parse(req.body);
      const incident = await storage.incidents.update(id, data);
      
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
