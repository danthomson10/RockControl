import type { Express } from "express";
import { storage } from "./storage";
import { insertJobSchema, insertFormSchema, insertIncidentSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express) {
  
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const organizationId = 1; // todo: Get from authenticated user session
      
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
  
  app.get("/api/jobs", async (req, res) => {
    try {
      const organizationId = 1; // todo: Get from authenticated user session
      const jobs = await storage.jobs.getByOrganization(organizationId);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/jobs/code/:code", async (req, res) => {
    try {
      const organizationId = 1; // todo: Get from authenticated user session
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
  
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.jobs.getById(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      const members = await storage.jobMembers.getByJob(id);
      
      res.json({ ...job, members });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/jobs", async (req, res) => {
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
  
  app.patch("/api/jobs/:id", async (req, res) => {
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
  
  app.get("/api/forms", async (req, res) => {
    try {
      const organizationId = 1; // todo: Get from authenticated user session
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const forms = await storage.forms.getByOrganization(organizationId, limit);
      res.json(forms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/forms/:id", async (req, res) => {
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
  
  app.post("/api/forms", async (req, res) => {
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
  
  app.patch("/api/forms/:id", async (req, res) => {
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
  
  app.get("/api/incidents", async (req, res) => {
    try {
      const organizationId = 1; // todo: Get from authenticated user session
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const incidents = await storage.incidents.getByOrganization(organizationId, limit);
      res.json(incidents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/incidents/:id", async (req, res) => {
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
  
  app.post("/api/incidents", async (req, res) => {
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
  
  app.patch("/api/incidents/:id", async (req, res) => {
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
