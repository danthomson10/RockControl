import { pgTable, text, integer, timestamp, boolean, jsonb, pgEnum, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum('user_role', [
  'OrgAdmin',
  'ProjectManager', 
  'HSEManager',
  'SiteSupervisor',
  'FieldTech',
  'ClientViewer',
  'Subcontractor'
]);

export const jobStatusEnum = pgEnum('job_status', ['draft', 'active', 'on-hold', 'completed', 'cancelled']);

export const siteStatusEnum = pgEnum('site_status', ['active', 'completed', 'archived']);

export const fileTypeEnum = pgEnum('file_type', ['image', 'drone', 'contract', 'document']);

export const formTypeEnum = pgEnum('form_type', ['take-5', 'variation', 'crew-briefing', 'risk-control-plan', 'incident-report']);

export const fieldTypeEnum = pgEnum('field_type', ['text', 'textarea', 'radio', 'checkbox', 'date', 'time', 'number']);

export const formStatusEnum = pgEnum('form_status', ['draft', 'pending', 'approved', 'rejected', 'completed']);

export const formSourceEnum = pgEnum('form_source', ['web', 'voice']);

export const incidentSeverityEnum = pgEnum('incident_severity', ['low', 'medium', 'high', 'critical']);

export const incidentStatusEnum = pgEnum('incident_status', ['open', 'investigating', 'resolved', 'closed']);

export const accessRequestStatusEnum = pgEnum('access_request_status', ['pending', 'approved', 'denied']);

export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'github', 'microsoft']);

export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  replitId: varchar("replit_id").unique(), // Links to Replit Auth sub claim
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // For email/password auth
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Schema for updating user profile (only editable fields)
export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  firstName: z.string().max(255).optional().nullable(),
  lastName: z.string().max(255).optional().nullable(),
});
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Schema for updating organization (settings page)
export const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255),
  domain: z.string().min(1, "Domain is required").max(255),
});
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;

// Schema for updating user settings (role and active status)
export const updateUserSettingsSchema = z.object({
  role: z.enum(['OrgAdmin', 'ProjectManager', 'HSEManager', 'SiteSupervisor', 'FieldTech', 'ClientViewer', 'Subcontractor']),
  active: z.boolean(),
});
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>;

// Type for upserting user from Replit Auth
export type UpsertUser = {
  replitId: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

// Clients table - reusable across sites and jobs
export const clients = pgTable("clients", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  companyName: text("company_name").notNull(),
  primaryContactName: text("primary_contact_name"),
  primaryContactEmail: text("primary_contact_email"),
  primaryContactPhone: text("primary_contact_phone"),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Sites table - lean core attributes only
export const sites = pgTable("sites", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  clientId: integer("client_id").references(() => clients.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: text("latitude"), // Separate lat/lng for better querying
  longitude: text("longitude"),
  status: siteStatusEnum("status").notNull().default('active'),
  projectManagerId: integer("project_manager_id").references(() => users.id),
  sharepointFolderUrl: text("sharepoint_folder_url"),
  description: text("description"),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSiteSchema = createInsertSchema(sites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Site = typeof sites.$inferSelect;

// Site contacts - multiple key contacts per site
export const siteContacts = pgTable("site_contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  siteId: integer("site_id").notNull().references(() => sites.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  role: text("role").notNull(), // e.g., "Site Manager", "Safety Officer", "Client Representative"
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  userId: integer("user_id").references(() => users.id), // Optional link to internal user
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSiteContactSchema = createInsertSchema(siteContacts).omit({
  id: true,
  createdAt: true,
});
export type InsertSiteContact = z.infer<typeof insertSiteContactSchema>;
export type SiteContact = typeof siteContacts.$inferSelect;

// Site files - auditable file storage with metadata
export const siteFiles = pgTable("site_files", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  siteId: integer("site_id").notNull().references(() => sites.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  fileType: fileTypeEnum("file_type").notNull(),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(), // Object storage key
  fileUrl: text("file_url").notNull(), // Signed URL or public URL
  fileSize: integer("file_size"), // Bytes
  mimeType: text("mime_type"),
  metadata: jsonb("metadata"), // Optional metadata (dimensions, duration, etc.)
  uploadedById: integer("uploaded_by_id").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertSiteFileSchema = createInsertSchema(siteFiles).omit({
  id: true,
  uploadedAt: true,
});
export type InsertSiteFile = z.infer<typeof insertSiteFileSchema>;
export type SiteFile = typeof siteFiles.$inferSelect;

export const jobs = pgTable("jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  siteId: integer("site_id").references(() => sites.id), // Link to site
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  siteLocation: text("site_location"), // Kept for backward compatibility, optional now
  status: jobStatusEnum("status").notNull().default('draft'),
  progress: integer("progress").notNull().default(0),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export const jobMembers = pgTable("job_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertJobMemberSchema = createInsertSchema(jobMembers).omit({
  id: true,
  addedAt: true,
});
export type InsertJobMember = z.infer<typeof insertJobMemberSchema>;
export type JobMember = typeof jobMembers.$inferSelect;

export const forms = pgTable("forms", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  formCode: text("form_code").notNull().unique(),
  type: formTypeEnum("type").notNull(),
  status: formStatusEnum("status").notNull().default('draft'),
  source: formSourceEnum("source").notNull().default('web'),
  formData: jsonb("form_data").notNull(),
  signature: text("signature"),
  signerName: text("signer_name"),
  signedAt: timestamp("signed_at"),
  sharepointItemId: text("sharepoint_item_id"),
  aiSummary: text("ai_summary"),
  aiRecommendations: jsonb("ai_recommendations"),
  submittedById: integer("submitted_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  formData: z.record(z.any()),
});
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export const formTemplates = pgTable("form_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  type: formTypeEnum("type").notNull(),
  schema: jsonb("schema").notNull(),
  active: boolean("active").notNull().default(true),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({
  id: true,
  organizationId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  schema: z.object({
    questions: z.array(z.object({
      id: z.string(),
      label: z.string(),
      fieldType: z.enum(['text', 'textarea', 'radio', 'checkbox', 'date', 'time', 'number']),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(),
      placeholder: z.string().optional(),
      helpText: z.string().optional(),
    })),
  }),
});
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;

export const incidents = pgTable("incidents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  incidentCode: text("incident_code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: incidentSeverityEnum("severity").notNull(),
  status: incidentStatusEnum("status").notNull().default('open'),
  reportedById: integer("reported_by_id").notNull().references(() => users.id),
  incidentDate: timestamp("incident_date").notNull(),
  resolvedAt: timestamp("resolved_at"),
  sharepointItemId: text("sharepoint_item_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

// Password Reset Tokens
export const passwordResets = pgTable("password_resets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordResetSchema = createInsertSchema(passwordResets).omit({
  id: true,
  createdAt: true,
});
export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
export type PasswordReset = typeof passwordResets.$inferSelect;

// Email Verification Tokens
export const emailVerifications = pgTable("email_verifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmailVerificationSchema = createInsertSchema(emailVerifications).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailVerification = z.infer<typeof insertEmailVerificationSchema>;
export type EmailVerification = typeof emailVerifications.$inferSelect;

// Access Requests (for users requesting to join organizations)
export const accessRequests = pgTable("access_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  message: text("message"),
  status: accessRequestStatusEnum("status").notNull().default('pending'),
  reviewedById: integer("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAccessRequestSchema = createInsertSchema(accessRequests).omit({
  id: true,
  createdAt: true,
});
export type InsertAccessRequest = z.infer<typeof insertAccessRequestSchema>;
export type AccessRequest = typeof accessRequests.$inferSelect;

// OAuth Connections (Microsoft, Google, GitHub)
export const oauthConnections = pgTable("oauth_connections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  provider: oauthProviderEnum("provider").notNull(),
  providerUserId: text("provider_user_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOAuthConnectionSchema = createInsertSchema(oauthConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOAuthConnection = z.infer<typeof insertOAuthConnectionSchema>;
export type OAuthConnection = typeof oauthConnections.$inferSelect;

// WebAuthn Credentials (Face ID, Touch ID, Windows Hello)
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type"), // 'platform' (Face ID, Touch ID) or 'cross-platform' (security key)
  transports: jsonb("transports"), // ['internal', 'usb', 'nfc', 'ble']
  aaguid: text("aaguid"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWebAuthnCredentialSchema = createInsertSchema(webauthnCredentials).omit({
  id: true,
  createdAt: true,
});
export type InsertWebAuthnCredential = z.infer<typeof insertWebAuthnCredentialSchema>;
export type WebAuthnCredential = typeof webauthnCredentials.$inferSelect;

// SharePoint Configuration
export const sharepointConfig = pgTable("sharepoint_config", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id).unique(),
  siteUrl: text("site_url").notNull(),
  siteId: text("site_id"),
  incidentListId: text("incident_list_id"),
  incidentListName: text("incident_list_name"),
  crewBriefingListId: text("crew_briefing_list_id"),
  crewBriefingListName: text("crew_briefing_list_name"),
  fieldMappings: jsonb("field_mappings"),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSharePointConfigSchema = createInsertSchema(sharepointConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSharePointConfig = z.infer<typeof insertSharePointConfigSchema>;
export type SharePointConfig = typeof sharepointConfig.$inferSelect;
