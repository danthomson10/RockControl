import { db } from "./db";
import { formTemplates, users, organizations } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedIncidentTemplate() {
  console.log("Seeding default Incident Report template...");
  
  // Get the first organization and a user to create the template
  const [org] = await db.select().from(organizations).limit(1);
  if (!org) {
    console.error("No organization found. Please run the main seed script first.");
    return;
  }

  const [admin] = await db.select().from(users)
    .where(eq(users.organizationId, org.id))
    .limit(1);
  
  if (!admin) {
    console.error("No user found in organization. Please run the main seed script first.");
    return;
  }

  // Check if template already exists
  const existing = await db.select().from(formTemplates)
    .where(eq(formTemplates.name, "Comprehensive Incident Report"))
    .limit(1);

  if (existing.length > 0) {
    console.log("Incident Report template already exists. Skipping...");
    return;
  }

  const incidentReportSchema = {
    questions: [
      {
        id: "incident-date",
        label: "Date of Incident",
        fieldType: "date" as const,
        required: true,
        helpText: "When did the incident occur?",
      },
      {
        id: "incident-time",
        label: "Time of Incident",
        fieldType: "time" as const,
        required: true,
        helpText: "What time did the incident occur?",
      },
      {
        id: "location",
        label: "Location",
        fieldType: "text" as const,
        required: true,
        placeholder: "e.g., Site 2, Building A, Ground Floor",
        helpText: "Exact location where the incident occurred",
      },
      {
        id: "incident-type",
        label: "Type of Incident",
        fieldType: "radio" as const,
        required: true,
        options: [
          "Near Miss",
          "Minor Injury",
          "Serious Injury",
          "Property Damage",
          "Environmental",
          "Equipment Failure",
          "Other",
        ],
      },
      {
        id: "severity",
        label: "Severity Level",
        fieldType: "radio" as const,
        required: true,
        options: ["Low", "Medium", "High", "Critical"],
      },
      {
        id: "description",
        label: "Incident Description",
        fieldType: "textarea" as const,
        required: true,
        placeholder: "Provide a detailed description of what happened...",
        helpText: "Include sequence of events, conditions, and circumstances",
      },
      {
        id: "people-involved",
        label: "People Involved",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "Names and roles of people involved...",
        helpText: "List all individuals directly involved in the incident",
      },
      {
        id: "injuries",
        label: "Were there any injuries?",
        fieldType: "radio" as const,
        required: true,
        options: ["Yes", "No"],
      },
      {
        id: "injury-details",
        label: "Injury Details",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "Describe nature and extent of injuries...",
        helpText: "Complete this if injuries occurred",
      },
      {
        id: "witnesses",
        label: "Witnesses",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "Names and contact information of witnesses...",
        helpText: "List anyone who witnessed the incident",
      },
      {
        id: "immediate-actions",
        label: "Immediate Actions Taken",
        fieldType: "textarea" as const,
        required: true,
        placeholder: "What was done immediately after the incident?",
        helpText: "First aid, emergency services, site secured, etc.",
      },
      {
        id: "equipment-involved",
        label: "Equipment/Machinery Involved",
        fieldType: "text" as const,
        required: false,
        placeholder: "e.g., Forklift #23, Scaffold Tower",
      },
      {
        id: "weather-conditions",
        label: "Weather Conditions",
        fieldType: "checkbox" as const,
        required: false,
        options: ["Clear", "Rainy", "Windy", "Foggy", "Icy/Snowy", "Hot", "Cold"],
        helpText: "Select all that apply",
      },
      {
        id: "root-cause-category",
        label: "Root Cause Category",
        fieldType: "radio" as const,
        required: false,
        options: [
          "Human Error",
          "Equipment Failure",
          "Inadequate Training",
          "Poor Communication",
          "Unsafe Conditions",
          "Lack of Procedures",
          "Fatigue",
          "Other",
        ],
      },
      {
        id: "root-cause-analysis",
        label: "Root Cause Analysis",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "What were the underlying causes?",
        helpText: "Analysis of why the incident occurred (can be completed later)",
      },
      {
        id: "corrective-actions",
        label: "Corrective Actions Required",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "What actions will prevent this from happening again?",
        helpText: "Specific measures to be implemented",
      },
      {
        id: "preventive-measures",
        label: "Preventive Measures/Recommendations",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "Additional recommendations for prevention...",
        helpText: "Long-term safety improvements",
      },
      {
        id: "reported-by",
        label: "Reported By",
        fieldType: "text" as const,
        required: true,
        placeholder: "Your name",
      },
      {
        id: "contact-number",
        label: "Contact Number",
        fieldType: "text" as const,
        required: true,
        placeholder: "Your contact number",
      },
    ],
  };

  await db.insert(formTemplates).values({
    organizationId: org.id,
    name: "Comprehensive Incident Report",
    description: "Detailed incident reporting form for health and safety compliance. Captures incident details, injuries, root causes, and corrective actions.",
    type: "incident-report",
    schema: incidentReportSchema,
    active: true,
    createdById: admin.id,
  });

  console.log("✓ Default Incident Report template created successfully!");
}

seedIncidentTemplate()
  .then(() => {
    console.log("Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
