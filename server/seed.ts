import { db } from "./db";
import { organizations, users, jobs, jobMembers, forms, incidents } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  const [org] = await db.insert(organizations).values({
    name: "Acme Construction",
    domain: "acme.com",
    active: true,
  }).returning();

  const [user1] = await db.insert(users).values({
    organizationId: org.id,
    email: "john.doe@acme.com",
    name: "John Doe",
    role: "SiteSupervisor",
    active: true,
  }).returning();

  const [user2] = await db.insert(users).values({
    organizationId: org.id,
    email: "sarah.wilson@acme.com",
    name: "Sarah Wilson",
    role: "ProjectManager",
    active: true,
  }).returning();

  const [user3] = await db.insert(users).values({
    organizationId: org.id,
    email: "mike.chen@acme.com",
    name: "Mike Chen",
    role: "HSEManager",
    active: true,
  }).returning();

  const [job1] = await db.insert(jobs).values({
    organizationId: org.id,
    code: "WEL-TUN-001",
    name: "Wellington Tunnel Project",
    description: "Tunnel excavation and reinforcement works for the Wellington Northern Corridor improvement project.",
    siteLocation: "Mt Victoria, Wellington",
    status: "active",
    progress: 67,
    startDate: new Date("2024-01-15"),
    dueDate: new Date("2024-03-15"),
    createdById: user2.id,
  }).returning();

  const [job2] = await db.insert(jobs).values({
    organizationId: org.id,
    code: "AKL-BRG-023",
    name: "Auckland Bridge Maintenance",
    description: "Routine maintenance and safety upgrades for Auckland Harbour Bridge.",
    siteLocation: "Harbour Bridge, Auckland",
    status: "active",
    progress: 42,
    startDate: new Date("2024-02-01"),
    dueDate: new Date("2024-04-02"),
    createdById: user2.id,
  }).returning();

  const [job3] = await db.insert(jobs).values({
    organizationId: org.id,
    code: "CHC-RD-156",
    name: "Christchurch Roadworks",
    description: "Road resurfacing and utility upgrades on Main South Road.",
    siteLocation: "Main South Road, Christchurch",
    status: "active",
    progress: 89,
    startDate: new Date("2024-01-08"),
    dueDate: new Date("2024-02-28"),
    createdById: user2.id,
  }).returning();

  await db.insert(jobMembers).values([
    { jobId: job1.id, userId: user1.id, role: "Site Supervisor" },
    { jobId: job1.id, userId: user2.id, role: "Project Manager" },
    { jobId: job2.id, userId: user1.id, role: "Site Supervisor" },
    { jobId: job3.id, userId: user1.id, role: "Site Supervisor" },
  ]);

  await db.insert(forms).values([
    {
      organizationId: org.id,
      jobId: job1.id,
      formCode: "TK5-2847",
      type: "take-5",
      status: "pending",
      formData: {
        taskDescription: "Tunnel boring machine operation",
        riskLevel: "medium",
        controlMeasures: "Machine inspection, safety barriers in place",
        ppeRequired: "standard",
      },
      submittedById: user1.id,
    },
    {
      organizationId: org.id,
      jobId: job2.id,
      formCode: "VAR-1923",
      type: "variation",
      status: "approved",
      formData: {
        variationDescription: "Additional steel reinforcement required",
        costImpact: 15000,
        timeImpact: "3 days",
      },
      submittedById: user1.id,
      signature: "data:image/png;base64,mock-signature",
      signerName: "John Doe",
      signedAt: new Date(),
    },
    {
      organizationId: org.id,
      jobId: job3.id,
      formCode: "CB-5612",
      type: "crew-briefing",
      status: "completed",
      formData: {
        briefingTopic: "Daily safety briefing",
        attendees: ["John Doe", "Team Member 1", "Team Member 2"],
        keyPoints: ["Weather conditions", "Traffic management", "PPE requirements"],
      },
      submittedById: user1.id,
      signature: "data:image/png;base64,mock-signature",
      signerName: "John Doe",
      signedAt: new Date(Date.now() - 86400000),
    },
    {
      organizationId: org.id,
      jobId: job1.id,
      formCode: "TK5-2846",
      type: "take-5",
      status: "completed",
      formData: {
        taskDescription: "Safety inspection of tunnel supports",
        riskLevel: "low",
        controlMeasures: "Visual inspection checklist completed",
        ppeRequired: "standard",
      },
      submittedById: user1.id,
      signature: "data:image/png;base64,mock-signature",
      signerName: "John Doe",
      signedAt: new Date(Date.now() - 86400000),
    },
  ]);

  await db.insert(incidents).values([
    {
      organizationId: org.id,
      jobId: job1.id,
      incidentCode: "INC-2024-047",
      title: "Near-miss: Falling debris",
      description: "Small rock fell from tunnel ceiling during excavation. No injuries.",
      severity: "high",
      status: "investigating",
      reportedById: user1.id,
      incidentDate: new Date(Date.now() - 7200000),
    },
    {
      organizationId: org.id,
      jobId: job2.id,
      incidentCode: "INC-2024-046",
      title: "Equipment malfunction",
      description: "Hydraulic lift experienced pressure loss. Repaired on-site.",
      severity: "medium",
      status: "resolved",
      reportedById: user1.id,
      incidentDate: new Date(Date.now() - 18000000),
      resolvedAt: new Date(Date.now() - 3600000),
    },
    {
      organizationId: org.id,
      jobId: job3.id,
      incidentCode: "INC-2024-045",
      title: "Minor first aid required",
      description: "Worker received minor cut, first aid administered on-site.",
      severity: "low",
      status: "closed",
      reportedById: user1.id,
      incidentDate: new Date(Date.now() - 86400000),
      resolvedAt: new Date(Date.now() - 43200000),
    },
  ]);

  console.log("Database seeded successfully!");
}

seed().catch(console.error);
