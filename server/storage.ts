import { db } from "./db";
import {
  organizations,
  users,
  clients,
  sites,
  siteContacts,
  siteFiles,
  jobs,
  jobMembers,
  forms,
  formTemplates,
  incidents,
  accessRequests,
  oauthConnections,
  sharepointConfig as sharepointConfigTable,
  type InsertOrganization,
  type Organization,
  type InsertUser,
  type User,
  type UpsertUser,
  type InsertClient,
  type Client,
  type InsertSite,
  type Site,
  type InsertSiteContact,
  type SiteContact,
  type InsertSiteFile,
  type SiteFile,
  type InsertJob,
  type Job,
  type InsertJobMember,
  type JobMember,
  type InsertForm,
  type Form,
  type InsertFormTemplate,
  type FormTemplate,
  type InsertIncident,
  type Incident,
  type InsertAccessRequest,
  type AccessRequest,
  type InsertOAuthConnection,
  type OAuthConnection,
  type InsertSharePointConfig,
  type SharePointConfig,
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
  
  clients: {
    create(data: InsertClient): Promise<Client>;
    getById(id: number): Promise<Client | undefined>;
    getByIdScoped(id: number, organizationId: number): Promise<Client | undefined>;
    getByOrganization(organizationId: number, includeInactive?: boolean): Promise<Client[]>;
    update(id: number, organizationId: number, data: Partial<Omit<InsertClient, 'organizationId'>>): Promise<Client | undefined>;
    archive(id: number, organizationId: number): Promise<Client | undefined>;
  };
  
  sites: {
    create(data: InsertSite): Promise<Site>;
    getById(id: number): Promise<Site | undefined>;
    getByIdScoped(id: number, organizationId: number): Promise<Site | undefined>;
    getByOrganization(organizationId: number, filters?: { status?: 'active' | 'completed' | 'archived'; clientId?: number; search?: string }): Promise<Site[]>;
    getByClient(organizationId: number, clientId: number): Promise<Site[]>;
    getByStatus(organizationId: number, statuses: ('active' | 'completed' | 'archived')[]): Promise<Site[]>;
    getRecent(organizationId: number, limit: number): Promise<Site[]>;
    update(id: number, data: Partial<Omit<InsertSite, 'organizationId' | 'createdById'>>): Promise<Site | undefined>;
    updateScoped(id: number, organizationId: number, data: Partial<Omit<InsertSite, 'organizationId' | 'createdById'>>): Promise<Site | undefined>;
    getStats(organizationId: number): Promise<{
      total: number;
      active: number;
      completed: number;
      archived: number;
    }>;
  };
  
  siteContacts: {
    create(data: InsertSiteContact): Promise<SiteContact>;
    getBySite(siteId: number): Promise<SiteContact[]>;
    getBySiteScoped(siteId: number, organizationId: number): Promise<SiteContact[]>;
    delete(id: number, organizationId: number): Promise<void>;
  };
  
  siteFiles: {
    create(data: InsertSiteFile): Promise<SiteFile>;
    getBySite(siteId: number, fileType?: 'image' | 'drone' | 'contract' | 'document'): Promise<SiteFile[]>;
    getBySiteScoped(siteId: number, organizationId: number, fileType?: 'image' | 'drone' | 'contract' | 'document'): Promise<SiteFile[]>;
    delete(id: number, organizationId: number): Promise<void>;
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
    getByUser(userId: number): Promise<JobMember[]>;
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
  
  formTemplates: {
    create(data: InsertFormTemplate): Promise<FormTemplate>;
    getById(id: number): Promise<FormTemplate | undefined>;
    getByIdScoped(id: number, organizationId: number): Promise<FormTemplate | undefined>;
    getByOrganization(organizationId: number, includeInactive?: boolean): Promise<FormTemplate[]>;
    getByType(organizationId: number, type: string): Promise<FormTemplate[]>;
    update(id: number, organizationId: number, data: Partial<Omit<InsertFormTemplate, 'organizationId' | 'createdById'>>): Promise<FormTemplate | undefined>;
    delete(id: number, organizationId: number): Promise<void>;
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
  
  sharepointConfig: {
    create(data: InsertSharePointConfig): Promise<SharePointConfig>;
    getById(id: number): Promise<SharePointConfig | undefined>;
    getByOrganization(organizationId: number): Promise<SharePointConfig | undefined>;
    update(id: number, data: Partial<Omit<InsertSharePointConfig, 'organizationId'>>): Promise<SharePointConfig | undefined>;
    upsert(organizationId: number, data: Partial<Omit<InsertSharePointConfig, 'organizationId'>>): Promise<SharePointConfig>;
  };
}

export class DatabaseStorage implements IStorage {
  organizations = {
    create: async (data: InsertOrganization): Promise<Organization> => {
      const [org] = await db.insert(organizations).values(data as any).returning();
      return org;
    },
    
    getById: async (id: number): Promise<Organization | undefined> => {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
      return org;
    },
  };
  
  users = {
    create: async (data: InsertUser): Promise<User> => {
      const [user] = await db.insert(users).values(data as any).returning();
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
      const [request] = await db.insert(accessRequests).values(data as any).returning();
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
      const [connection] = await db.insert(oauthConnections).values(data as any).returning();
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
  
  clients = {
    create: async (data: InsertClient): Promise<Client> => {
      const [client] = await db.insert(clients).values(data as any).returning();
      return client;
    },
    
    getById: async (id: number): Promise<Client | undefined> => {
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      return client;
    },
    
    getByIdScoped: async (id: number, organizationId: number): Promise<Client | undefined> => {
      const [client] = await db.select().from(clients)
        .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)));
      return client;
    },
    
    getByOrganization: async (organizationId: number, includeInactive?: boolean): Promise<Client[]> => {
      if (includeInactive) {
        return db.select().from(clients)
          .where(eq(clients.organizationId, organizationId))
          .orderBy(desc(clients.createdAt));
      }
      return db.select().from(clients)
        .where(and(eq(clients.organizationId, organizationId), eq(clients.active, true)))
        .orderBy(desc(clients.createdAt));
    },
    
    update: async (id: number, organizationId: number, data: Partial<Omit<InsertClient, 'organizationId'>>): Promise<Client | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [client] = await db.update(clients)
        .set(updates)
        .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
        .returning();
      return client;
    },
    
    archive: async (id: number, organizationId: number): Promise<Client | undefined> => {
      const [client] = await db.update(clients)
        .set({ active: false, updatedAt: new Date() })
        .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
        .returning();
      return client;
    },
  };
  
  sites = {
    create: async (data: InsertSite): Promise<Site> => {
      const [site] = await db.insert(sites).values(data as any).returning();
      return site;
    },
    
    getById: async (id: number): Promise<Site | undefined> => {
      const [site] = await db.select().from(sites).where(eq(sites.id, id));
      return site;
    },
    
    getByIdScoped: async (id: number, organizationId: number): Promise<Site | undefined> => {
      const [site] = await db.select().from(sites)
        .where(and(eq(sites.id, id), eq(sites.organizationId, organizationId)));
      return site;
    },
    
    getByOrganization: async (organizationId: number, filters?: { status?: 'active' | 'completed' | 'archived'; clientId?: number; search?: string }): Promise<Site[]> => {
      const conditions = [eq(sites.organizationId, organizationId)];
      
      if (filters?.status) {
        conditions.push(eq(sites.status, filters.status));
      }
      
      if (filters?.clientId) {
        conditions.push(eq(sites.clientId, filters.clientId));
      }
      
      const query = db.select().from(sites)
        .where(and(...conditions))
        .orderBy(desc(sites.createdAt));
      
      const results = await query;
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        return results.filter(site => 
          site.name.toLowerCase().includes(searchLower) ||
          site.address.toLowerCase().includes(searchLower) ||
          site.description?.toLowerCase().includes(searchLower)
        );
      }
      
      return results;
    },
    
    getByClient: async (organizationId: number, clientId: number): Promise<Site[]> => {
      return db.select().from(sites)
        .where(and(eq(sites.organizationId, organizationId), eq(sites.clientId, clientId)))
        .orderBy(desc(sites.createdAt));
    },
    
    getByStatus: async (organizationId: number, statuses: ('active' | 'completed' | 'archived')[]): Promise<Site[]> => {
      const allSites = await db.select().from(sites)
        .where(eq(sites.organizationId, organizationId))
        .orderBy(desc(sites.createdAt));
      
      return allSites.filter(site => statuses.includes(site.status));
    },
    
    getRecent: async (organizationId: number, limit: number): Promise<Site[]> => {
      return db.select().from(sites)
        .where(eq(sites.organizationId, organizationId))
        .orderBy(desc(sites.createdAt))
        .limit(limit);
    },
    
    update: async (id: number, data: Partial<Omit<InsertSite, 'organizationId' | 'createdById'>>): Promise<Site | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [site] = await db.update(sites)
        .set(updates)
        .where(eq(sites.id, id))
        .returning();
      return site;
    },
    
    updateScoped: async (id: number, organizationId: number, data: Partial<Omit<InsertSite, 'organizationId' | 'createdById'>>): Promise<Site | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [site] = await db.update(sites)
        .set(updates)
        .where(and(eq(sites.id, id), eq(sites.organizationId, organizationId)))
        .returning();
      return site;
    },
    
    getStats: async (organizationId: number) => {
      const allSites = await db.select().from(sites).where(eq(sites.organizationId, organizationId));
      return {
        total: allSites.length,
        active: allSites.filter(s => s.status === 'active').length,
        completed: allSites.filter(s => s.status === 'completed').length,
        archived: allSites.filter(s => s.status === 'archived').length,
      };
    },
  };
  
  siteContacts = {
    create: async (data: InsertSiteContact): Promise<SiteContact> => {
      const [contact] = await db.insert(siteContacts).values(data as any).returning();
      return contact;
    },
    
    getBySite: async (siteId: number): Promise<SiteContact[]> => {
      return db.select().from(siteContacts)
        .where(eq(siteContacts.siteId, siteId))
        .orderBy(desc(siteContacts.createdAt));
    },
    
    getBySiteScoped: async (siteId: number, organizationId: number): Promise<SiteContact[]> => {
      return db.select().from(siteContacts)
        .where(and(eq(siteContacts.siteId, siteId), eq(siteContacts.organizationId, organizationId)))
        .orderBy(desc(siteContacts.createdAt));
    },
    
    delete: async (id: number, organizationId: number): Promise<void> => {
      await db.delete(siteContacts)
        .where(and(eq(siteContacts.id, id), eq(siteContacts.organizationId, organizationId)));
    },
  };
  
  siteFiles = {
    create: async (data: InsertSiteFile): Promise<SiteFile> => {
      const [file] = await db.insert(siteFiles).values(data as any).returning();
      return file;
    },
    
    getBySite: async (siteId: number, fileType?: 'image' | 'drone' | 'contract' | 'document'): Promise<SiteFile[]> => {
      if (fileType) {
        return db.select().from(siteFiles)
          .where(and(eq(siteFiles.siteId, siteId), eq(siteFiles.fileType, fileType)))
          .orderBy(desc(siteFiles.uploadedAt));
      }
      return db.select().from(siteFiles)
        .where(eq(siteFiles.siteId, siteId))
        .orderBy(desc(siteFiles.uploadedAt));
    },
    
    getBySiteScoped: async (siteId: number, organizationId: number, fileType?: 'image' | 'drone' | 'contract' | 'document'): Promise<SiteFile[]> => {
      if (fileType) {
        return db.select().from(siteFiles)
          .where(and(
            eq(siteFiles.siteId, siteId),
            eq(siteFiles.organizationId, organizationId),
            eq(siteFiles.fileType, fileType)
          ))
          .orderBy(desc(siteFiles.uploadedAt));
      }
      return db.select().from(siteFiles)
        .where(and(eq(siteFiles.siteId, siteId), eq(siteFiles.organizationId, organizationId)))
        .orderBy(desc(siteFiles.uploadedAt));
    },
    
    delete: async (id: number, organizationId: number): Promise<void> => {
      await db.delete(siteFiles)
        .where(and(eq(siteFiles.id, id), eq(siteFiles.organizationId, organizationId)));
    },
  };
  
  jobs = {
    create: async (data: InsertJob): Promise<Job> => {
      const [job] = await db.insert(jobs).values(data as any).returning();
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
      const [member] = await db.insert(jobMembers).values(data as any).returning();
      return member;
    },
    
    getByJob: async (jobId: number): Promise<JobMember[]> => {
      return db.select().from(jobMembers).where(eq(jobMembers.jobId, jobId));
    },
    
    getByUser: async (userId: number): Promise<JobMember[]> => {
      return db.select().from(jobMembers).where(eq(jobMembers.userId, userId));
    },
  };
  
  forms = {
    create: async (data: InsertForm): Promise<Form> => {
      const [form] = await db.insert(forms).values(data as any).returning();
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
  
  formTemplates = {
    create: async (data: InsertFormTemplate): Promise<FormTemplate> => {
      const [template] = await db.insert(formTemplates).values(data as any).returning();
      return template;
    },
    
    getById: async (id: number): Promise<FormTemplate | undefined> => {
      const [template] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
      return template;
    },
    
    getByIdScoped: async (id: number, organizationId: number): Promise<FormTemplate | undefined> => {
      const [template] = await db.select().from(formTemplates)
        .where(and(eq(formTemplates.id, id), eq(formTemplates.organizationId, organizationId)));
      return template;
    },
    
    getByOrganization: async (organizationId: number, includeInactive?: boolean): Promise<FormTemplate[]> => {
      if (includeInactive) {
        return db.select().from(formTemplates)
          .where(eq(formTemplates.organizationId, organizationId))
          .orderBy(desc(formTemplates.createdAt));
      }
      
      return db.select().from(formTemplates)
        .where(and(eq(formTemplates.organizationId, organizationId), eq(formTemplates.active, true)))
        .orderBy(desc(formTemplates.createdAt));
    },
    
    getByType: async (organizationId: number, type: string): Promise<FormTemplate[]> => {
      return db.select().from(formTemplates)
        .where(and(
          eq(formTemplates.organizationId, organizationId),
          eq(formTemplates.type, type as any),
          eq(formTemplates.active, true)
        ))
        .orderBy(desc(formTemplates.createdAt));
    },
    
    update: async (id: number, organizationId: number, data: Partial<Omit<InsertFormTemplate, 'organizationId' | 'createdById'>>): Promise<FormTemplate | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [template] = await db.update(formTemplates)
        .set(updates)
        .where(and(eq(formTemplates.id, id), eq(formTemplates.organizationId, organizationId)))
        .returning();
      return template;
    },
    
    delete: async (id: number, organizationId: number): Promise<void> => {
      await db.update(formTemplates)
        .set({ active: false, updatedAt: new Date() })
        .where(and(eq(formTemplates.id, id), eq(formTemplates.organizationId, organizationId)));
    },
  };
  
  incidents = {
    create: async (data: InsertIncident): Promise<Incident> => {
      const [incident] = await db.insert(incidents).values(data as any).returning();
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
  
  sharepointConfig = {
    create: async (data: InsertSharePointConfig): Promise<SharePointConfig> => {
      const [config] = await db.insert(sharepointConfigTable).values(data as any).returning();
      return config;
    },
    
    getById: async (id: number): Promise<SharePointConfig | undefined> => {
      const [config] = await db.select().from(sharepointConfigTable).where(eq(sharepointConfigTable.id, id));
      return config;
    },
    
    getByOrganization: async (organizationId: number): Promise<SharePointConfig | undefined> => {
      const [config] = await db.select().from(sharepointConfigTable)
        .where(eq(sharepointConfigTable.organizationId, organizationId));
      return config;
    },
    
    update: async (id: number, data: Partial<Omit<InsertSharePointConfig, 'organizationId'>>): Promise<SharePointConfig | undefined> => {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates[key] = value;
        }
      });
      
      const [config] = await db.update(sharepointConfigTable)
        .set(updates)
        .where(eq(sharepointConfigTable.id, id))
        .returning();
      return config;
    },
    
    upsert: async (organizationId: number, data: Partial<Omit<InsertSharePointConfig, 'organizationId'>>): Promise<SharePointConfig> => {
      const existing = await db.select().from(sharepointConfigTable)
        .where(eq(sharepointConfigTable.organizationId, organizationId));
      
      if (existing.length > 0) {
        const updates: Record<string, any> = { updatedAt: new Date() };
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            updates[key] = value;
          }
        });
        
        const [updated] = await db.update(sharepointConfigTable)
          .set(updates)
          .where(eq(sharepointConfigTable.organizationId, organizationId))
          .returning();
        return updated;
      } else {
        const [created] = await db.insert(sharepointConfigTable)
          .values({ ...data, organizationId } as any)
          .returning();
        return created;
      }
    },
  };
}

export const storage = new DatabaseStorage();
