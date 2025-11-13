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

export const formTypeEnum = pgEnum('form_type', ['take-5', 'variation', 'crew-briefing', 'risk-control-plan']);

export const formStatusEnum = pgEnum('form_status', ['draft', 'pending', 'approved', 'rejected', 'completed']);

export const incidentSeverityEnum = pgEnum('incident_severity', ['low', 'medium', 'high', 'critical']);

export const incidentStatusEnum = pgEnum('incident_status', ['open', 'investigating', 'resolved', 'closed']);

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

// Type for upserting user from Replit Auth
export type UpsertUser = {
  replitId: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

export const jobs = pgTable("jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  siteLocation: text("site_location").notNull(),
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
  formData: jsonb("form_data").notNull(),
  signature: text("signature"),
  signerName: text("signer_name"),
  signedAt: timestamp("signed_at"),
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
