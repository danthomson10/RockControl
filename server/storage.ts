import { db } from "./db";
import {
  organizations,
  users,
  jobs,
  jobMembers,
  forms,
  incidents,
  accessRequests,
  oauthConnections,
  type InsertOrganization,
  type Organization,
  type InsertUser,
  type User,
  type UpsertUser,
  type InsertJob,
  type Job,
  type InsertJobMember,
  type JobMember,
  type InsertForm,
  type Form,
  type InsertIncident,
  type Incident,
  type InsertAccessRequest,
  type AccessRequest,
  type InsertOAuthConnection,
  type OAuthConnection,
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  organizations: {
    create(data: InsertOrganization): Promise<Organization>;
    getById(id: number): Promise<Organization | undefined>;
  };
  
  users: {
    create(data: InsertUser): Promise<User>;
    getById(id: number): Promise<User | undefined>;
    getByReplitId(replitId: string): Promise<User | undefined>;
    getByEmail(email: string): Promise<User | undefined>;
    getByOrganization(organizationId: number): Promise<User[]>;
    upsertUser(data: UpsertUser): Promise<User>;
    update(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  };
  
  accessRequests: {
    create(data: InsertAccessRequest): Promise<AccessRequest>;
    getById(id: number): Promise<AccessRequest | undefined>;
    getByOrganization(organizationId: number, status?: 'pending' | 'approved' | 'denied'): Promise<AccessRequest[]>;
    update(id: number, data: Partial<InsertAccessRequest>): Promise<AccessRequest | undefined>;
  };
  
  oauthConnections: {
    create(data: InsertOAuthConnection): Promise<OAuthConnection>;
    getByUserAndProvider(userId: number, provider: 'google' | 'github' | 'microsoft'): Promise<OAuthConnection | undefined>;
    update(id: number, data: Partial<InsertOAuthConnection>): Promise<OAuthConnection | undefined>;
  };
  
  jobs: {
    create(data: InsertJob): Promise<Job>;
    getById(id: number): Promise<Job | undefined>;
    getByIdScoped(id: number, organizationId: number): Promise<Job | undefined>;
    getByCode(code: string, organizationId: number): Promise<Job | undefined>;
    getByOrganization(organizationId: number): Promise<Job[]>;
    update(id: number, data: Partial<Omit<InsertJob, 'organizationId' | 'code' | 'createdById'>>): Promise<Job | undefined>;
    updateScoped(id: number, organizationId: number, data: Partial<Omit<InsertJob, 'organizationId' | 'code' | 'createdById'>>): Promise<Job | undefined>;
    getStats(organizationId: number): Promise<{
      total: number;
      active: number;
      completed: number;
    }>;
  };
  
  jobMembers: {
    create(data: InsertJobMember): Promise<JobMember>;
    getByJob(jobId: number): Promise<JobMember[]>;
  };
  
  forms: {
    create(data: InsertForm): Promise<Form>;
    getById(id: number): Promise<Form | undefined>;
    getByIdScoped(id: number, organizationId: number): Promise<Form | undefined>;
    getByJob(jobId: number): Promise<Form[]>;
    getByOrganization(organizationId: number, limit?: number): Promise<Form[]>;
    update(id: number, data: Partial<Omit<InsertForm, 'organizationId' | 'formCode' | 'submittedById'>>): Promise<Form | undefined>;
    updateScoped(id: number, organizationId: number, data: Partial<Omit<InsertForm, 'organizationId' | 'formCode' | 'submittedById'>>): Promise<Form | undefined>;
    getStats(organizationId: number): Promise<{
      total: number;
      pending: number;
      completed: number;
    }>;
  };
  
  incidents: {
    create(data: InsertIncident): Promise<Incident>;
    getById(id: number): Promise<Incident | undefined>;
    getByIdScoped(id: number, organizationId: number): Promise<Incident | undefined>;
    getByJob(jobId: number): Promise<Incident[]>;
    getByOrganization(organizationId: number, limit?: number): Promise<Incident[]>;
    update(id: number, data: Partial<Omit<InsertIncident, 'organizationId' | 'incidentCode' | 'reportedById'>>): Promise<Incident | undefined>;
    updateScoped(id: number, organizationId: number, data: Partial<Omit<InsertIncident, 'organizationId' | 'incidentCode' | 'reportedById'>>): Promise<Incident | undefined>;
    getStats(organizationId: number): Promise<{
      total: number;
      open: number;
      resolved: number;
    }>;
  };
}

export class DatabaseStorage implements IStorage {
  organizations = {
    create: async (data: InsertOrganization): Promise<Organization> => {
      const [org] = await db.insert(organizations).values(data).returning();
      return org;
    },
    
    getById: async (id: number): Promise<Organization | undefined> => {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
      return org;
    },
  };
  
  users = {
    create: async (data: InsertUser): Promise<User> => {
      const [user] = await db.insert(users).values(data).returning();
      return user;
    },
    
    getById: async (id: number): Promise<User | undefined> => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    },
    
    getByReplitId: async (replitId: string): Promise<User | undefined> => {
      const [user] = await db.select().from(users).where(eq(users.replitId, replitId));
      return user;
    },
    
    getByEmail: async (email: string): Promise<User | undefined> => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    },
    
    getByOrganization: async (organizationId: number): Promise<User[]> => {
      return db.select().from(users).where(eq(users.organizationId, organizationId));
    },
    
    upsertUser: async (data: UpsertUser): Promise<User> => {
      // Find existing user by replit ID or email
      const existingUser = await this.users.getByReplitId(data.replitId) || 
                           (data.email ? await this.users.getByEmail(data.email) : null);
      
      if (existingUser) {
        // Update existing user
        const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || existingUser.name;
        const [user] = await db.update(users)
          .set({
            replitId: data.replitId,
            email: data.email || existingUser.email,
            firstName: data.firstName || existingUser.firstName,
            lastName: data.lastName || existingUser.lastName,
            profileImageUrl: data.profileImageUrl || existingUser.profileImageUrl,
            name: fullName,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return user;
      } else {
        // Create new user - assign to a default organization (org 1) and default role
        // TODO: Implement invitation system to assign proper org and role
        const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email || 'New User';
        const [user] = await db.insert(users)
          .values({
            replitId: data.replitId,
            organizationId: 1, // Default org - TODO: implement invite-based assignment
            email: data.email || '',
            name: fullName,
            firstName: data.firstName,
            lastName: data.lastName,
            profileImageUrl: data.profileImageUrl,
            role: 'FieldTech', // Default role - TODO: implement invite-based assignment
            active: true,
          })
          .returning();
        return user;
      }
    },
    
    update: async (id: number, data: Partial<InsertUser>): Promise<User | undefined> => {
      const [user] = await db.update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user;
    },
  };
  
  accessRequests = {
    create: async (data: InsertAccessRequest): Promise<AccessRequest> => {
      const [request] = await db.insert(accessRequests).values(data).returning();
      return request;
    },
    
    getById: async (id: number): Promise<AccessRequest | undefined> => {
      const [request] = await db.select().from(accessRequests).where(eq(accessRequests.id, id));
      return request;
    },
    
    getByOrganization: async (organizationId: number, status?: 'pending' | 'approved' | 'denied'): Promise<AccessRequest[]> => {
      if (status) {
        return db.select().from(accessRequests)
          .where(and(eq(accessRequests.organizationId, organizationId), eq(accessRequests.status, status)))
          .orderBy(desc(accessRequests.createdAt));
      }
      return db.select().from(accessRequests)
        .where(eq(accessRequests.organizationId, organizationId))
        .orderBy(desc(accessRequests.createdAt));
    },
    
    update: async (id: number, data: Partial<InsertAccessRequest>): Promise<AccessRequest | undefined> => {
      const [request] = await db.update(accessRequests)
        .set(data)
        .where(eq(accessRequests.id, id))
        .returning();
      return request;
    },
  };
  
  oauthConnections = {
    create: async (data: InsertOAuthConnection): Promise<OAuthConnection> => {
      const [connection] = await db.insert(oauthConnections).values(data).returning();
      return connection;
    },
    
    getByUserAndProvider: async (userId: number, provider: 'google' | 'github' | 'microsoft'): Promise<OAuthConnection | undefined> => {
      const [connection] = await db.select().from(oauthConnections)
        .where(and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, provider)));
      return connection;
    },
    
    update: async (id: number, data: Partial<InsertOAuthConnection>): Promise<OAuthConnection | undefined> => {
      const [connection] = await db.update(oauthConnections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(oauthConnections.id, id))
        .returning();
      return connection;
    },
  };
  
  jobs = {
    create: async (data: InsertJob): Promise<Job> => {
      const [job] = await db.insert(jobs).values(data).returning();
      return job;
    },
    
    getById: async (id: number): Promise<Job | undefined> => {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
      return job;
    },
    
    getByIdScoped: async (id: number, organizationId: number): Promise<Job | undefined> => {
      const [job] = await db.select().from(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.organizationId, organizationId)));
      return job;
    },
    
    getByCode: async (code: string, organizationId: number): Promise<Job | undefined> => {
      const [job] = await db.select().from(jobs)
        .where(and(eq(jobs.code, code), eq(jobs.organizationId, organizationId)));
      return job;
    },
    
    getByOrganization: async (organizationId: number): Promise<Job[]> => {
      return db.select().from(jobs)
        .where(eq(jobs.organizationId, organizationId))
        .orderBy(desc(jobs.createdAt));
    },
    
    update: async (id: number, data: Partial<Omit<InsertJob, 'organizationId' | 'code' | 'createdById'>>): Promise<Job | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      // Only include defined values in update
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [job] = await db.update(jobs)
        .set(updates)
        .where(eq(jobs.id, id))
        .returning();
      return job;
    },
    
    updateScoped: async (id: number, organizationId: number, data: Partial<Omit<InsertJob, 'organizationId' | 'code' | 'createdById'>>): Promise<Job | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      // Only include defined values in update
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [job] = await db.update(jobs)
        .set(updates)
        .where(and(eq(jobs.id, id), eq(jobs.organizationId, organizationId)))
        .returning();
      return job;
    },
    
    getStats: async (organizationId: number) => {
      const allJobs = await db.select().from(jobs).where(eq(jobs.organizationId, organizationId));
      return {
        total: allJobs.length,
        active: allJobs.filter(j => j.status === 'active').length,
        completed: allJobs.filter(j => j.status === 'completed').length,
      };
    },
  };
  
  jobMembers = {
    create: async (data: InsertJobMember): Promise<JobMember> => {
      const [member] = await db.insert(jobMembers).values(data).returning();
      return member;
    },
    
    getByJob: async (jobId: number): Promise<JobMember[]> => {
      return db.select().from(jobMembers).where(eq(jobMembers.jobId, jobId));
    },
  };
  
  forms = {
    create: async (data: InsertForm): Promise<Form> => {
      const [form] = await db.insert(forms).values(data).returning();
      return form;
    },
    
    getById: async (id: number): Promise<Form | undefined> => {
      const [form] = await db.select().from(forms).where(eq(forms.id, id));
      return form;
    },
    
    getByIdScoped: async (id: number, organizationId: number): Promise<Form | undefined> => {
      const [form] = await db.select().from(forms)
        .where(and(eq(forms.id, id), eq(forms.organizationId, organizationId)));
      return form;
    },
    
    getByJob: async (jobId: number): Promise<Form[]> => {
      return db.select().from(forms)
        .where(eq(forms.jobId, jobId))
        .orderBy(desc(forms.createdAt));
    },
    
    getByOrganization: async (organizationId: number, limit?: number): Promise<Form[]> => {
      const query = db.select().from(forms)
        .where(eq(forms.organizationId, organizationId))
        .orderBy(desc(forms.createdAt));
      
      if (limit) {
        return query.limit(limit);
      }
      return query;
    },
    
    update: async (id: number, data: Partial<Omit<InsertForm, 'organizationId' | 'formCode' | 'submittedById'>>): Promise<Form | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      // Only include defined values in update
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [form] = await db.update(forms)
        .set(updates)
        .where(eq(forms.id, id))
        .returning();
      return form;
    },
    
    updateScoped: async (id: number, organizationId: number, data: Partial<Omit<InsertForm, 'organizationId' | 'formCode' | 'submittedById'>>): Promise<Form | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      // Only include defined values in update
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [form] = await db.update(forms)
        .set(updates)
        .where(and(eq(forms.id, id), eq(forms.organizationId, organizationId)))
        .returning();
      return form;
    },
    
    getStats: async (organizationId: number) => {
      const allForms = await db.select().from(forms).where(eq(forms.organizationId, organizationId));
      return {
        total: allForms.length,
        pending: allForms.filter(f => f.status === 'pending').length,
        completed: allForms.filter(f => f.status === 'completed').length,
      };
    },
  };
  
  incidents = {
    create: async (data: InsertIncident): Promise<Incident> => {
      const [incident] = await db.insert(incidents).values(data).returning();
      return incident;
    },
    
    getById: async (id: number): Promise<Incident | undefined> => {
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      return incident;
    },
    
    getByIdScoped: async (id: number, organizationId: number): Promise<Incident | undefined> => {
      const [incident] = await db.select().from(incidents)
        .where(and(eq(incidents.id, id), eq(incidents.organizationId, organizationId)));
      return incident;
    },
    
    getByJob: async (jobId: number): Promise<Incident[]> => {
      return db.select().from(incidents)
        .where(eq(incidents.jobId, jobId))
        .orderBy(desc(incidents.createdAt));
    },
    
    getByOrganization: async (organizationId: number, limit?: number): Promise<Incident[]> => {
      const query = db.select().from(incidents)
        .where(eq(incidents.organizationId, organizationId))
        .orderBy(desc(incidents.createdAt));
      
      if (limit) {
        return query.limit(limit);
      }
      return query;
    },
    
    update: async (id: number, data: Partial<Omit<InsertIncident, 'organizationId' | 'incidentCode' | 'reportedById'>>): Promise<Incident | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      // Only include defined values in update
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [incident] = await db.update(incidents)
        .set(updates)
        .where(eq(incidents.id, id))
        .returning();
      return incident;
    },
    
    updateScoped: async (id: number, organizationId: number, data: Partial<Omit<InsertIncident, 'organizationId' | 'incidentCode' | 'reportedById'>>): Promise<Incident | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      // Only include defined values in update
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [incident] = await db.update(incidents)
        .set(updates)
        .where(and(eq(incidents.id, id), eq(incidents.organizationId, organizationId)))
        .returning();
      return incident;
    },
    
    getStats: async (organizationId: number) => {
      const allIncidents = await db.select().from(incidents).where(eq(incidents.organizationId, organizationId));
      return {
        total: allIncidents.length,
        open: allIncidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
        resolved: allIncidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
      };
    },
  };
}

export const storage = new DatabaseStorage();
