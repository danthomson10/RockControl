import { db } from "./db";
import { formTemplates, organizations, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedCrewBriefingTemplate() {
  // Get the first organization
  const [org] = await db.select().from(organizations).limit(1);
  if (!org) {
    console.error("No organization found. Please run the main seed script first.");
    return;
  }
  
  const organizationId = org.id;
  const crewBriefingSchema = {
    questions: [
      // Header / Project details
      {
        id: "project-site",
        label: "Project Site",
        fieldType: "text" as const,
        required: true,
        placeholder: "Site location or name",
        helpText: "Name or address of the project site",
      },
      {
        id: "construction-pack-no",
        label: "Construction Pack No.",
        fieldType: "text" as const,
        required: false,
        placeholder: "Pack number",
      },
      {
        id: "drawings",
        label: "Drawing(s)",
        fieldType: "text" as const,
        required: false,
        placeholder: "Drawing number or N/A",
        helpText: "Relevant drawing numbers for today's work",
      },
      
      // Permits / Consents Required
      {
        id: "permit-worksafe",
        label: "Worksafe Works Notice Required?",
        fieldType: "checkbox" as const,
        required: false,
        options: ["Worksafe works notice required"],
      },
      {
        id: "permit-height",
        label: "Work at Height Permit Required?",
        fieldType: "checkbox" as const,
        required: false,
        options: ["Work at height permit required"],
      },
      {
        id: "permit-hotworks",
        label: "Hot Works Permit Required?",
        fieldType: "checkbox" as const,
        required: false,
        options: ["Hot works permit required"],
      },
      
      // Site contacts & pre-starts
      {
        id: "site-engineer",
        label: "Site Engineer (Name)",
        fieldType: "text" as const,
        required: true,
        placeholder: "Engineer's name",
      },
      {
        id: "foreman",
        label: "Foreman (Name)",
        fieldType: "text" as const,
        required: true,
        placeholder: "Foreman's name",
      },
      {
        id: "vehicle-prestarts",
        label: "Vehicle Prestarts Done?",
        fieldType: "checkbox" as const,
        required: false,
        options: ["Vehicle prestarts completed"],
      },
      {
        id: "machine-prestarts",
        label: "Machine Prestarts Daily?",
        fieldType: "checkbox" as const,
        required: false,
        options: ["Daily machine prestarts completed"],
      },
      {
        id: "toolbox-talk",
        label: "Toolbox Talk Completed?",
        fieldType: "checkbox" as const,
        required: false,
        options: ["Toolbox talk completed"],
      },
      {
        id: "additional-check",
        label: "Additional Check",
        fieldType: "checkbox" as const,
        required: false,
        options: ["Additional checklist item completed"],
        helpText: "Any additional pre-start checks",
      },
      
      // Planning & tasks
      {
        id: "critical-risks",
        label: "Critical Risks and Controls",
        fieldType: "textarea" as const,
        required: true,
        placeholder: "List key hazards and controls for today...",
        helpText: "Examples: fall from height, rockfall, mobile plant, compressed air, confined space",
      },
      {
        id: "site-plan",
        label: "Site Plan Description/Reference",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "Describe site layout or reference drawing...",
        helpText: "Description of site plan or reference to uploaded drawing",
      },
      {
        id: "key-tasks",
        label: "Key Construction Tasks - What are we doing today?",
        fieldType: "textarea" as const,
        required: true,
        placeholder: "List the main construction activities for today...",
        helpText: "Outline the key tasks to be completed",
      },
      {
        id: "quality-tasks",
        label: "Key Quality Tasks",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "Quality checks and requirements...",
        helpText: "Specific quality tasks or inspections required",
      },
      
      // Emergency management
      {
        id: "medical-centre",
        label: "Nearest Medical Centre",
        fieldType: "text" as const,
        required: true,
        placeholder: "Name and location of nearest medical facility",
      },
      {
        id: "site-address",
        label: "Site Address",
        fieldType: "text" as const,
        required: true,
        placeholder: "Full site address for emergency services",
      },
      {
        id: "site-access",
        label: "Site Access Notes",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "How to access the site, gate codes, landmarks...",
        helpText: "Information for emergency services accessing the site",
      },
      {
        id: "first-aider",
        label: "Site First Aider (Name)",
        fieldType: "text" as const,
        required: true,
        placeholder: "Name of designated first aider on site",
      },
      {
        id: "rescue-procedure",
        label: "Rescue Procedure",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "Outline rescue procedures for site-specific hazards...",
        helpText: "To be completed for each site as needed",
      },
      
      // Traffic, communications & environment
      {
        id: "traffic-management",
        label: "Traffic Management",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "N/A or describe traffic management plan in place...",
        helpText: "Details of TMP or traffic control measures",
      },
      {
        id: "site-communications",
        label: "Site Communications",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "Radio channel, phone details, coverage notes...",
        helpText: "Communication methods and contact details",
      },
      {
        id: "environmental-hazards",
        label: "Critical Environmental Hazards and Controls",
        fieldType: "textarea" as const,
        required: false,
        placeholder: "Environmental risks and mitigation measures...",
        helpText: "e.g., dust control, noise management, waterway protection",
      },
      
      // Sign-off
      {
        id: "engineer-signoff",
        label: "Site Engineer Sign-off (Name)",
        fieldType: "text" as const,
        required: true,
        placeholder: "Engineer name to confirm briefing",
      },
      {
        id: "foreman-signoff",
        label: "Site Foreman Sign-off (Name)",
        fieldType: "text" as const,
        required: true,
        placeholder: "Foreman name to confirm briefing",
      },
      {
        id: "briefing-date",
        label: "Date of Briefing",
        fieldType: "date" as const,
        required: true,
        helpText: "Date this crew briefing was conducted",
      },
    ],
  };

  try {
    // Check if template already exists
    const existing = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.name, "Crew Briefing"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Crew Briefing template already exists. Skipping...");
      return;
    }

    console.log("Creating Crew Briefing template...");
    await db.insert(formTemplates).values({
      name: "Crew Briefing",
      description: "Daily crew briefing form covering project details, permits, risks, tasks, emergency management, and environmental controls",
      organizationId,
      createdById: null,
      schema: crewBriefingSchema,
    });
    console.log("Crew Briefing template created successfully");

    return true;
  } catch (error: any) {
    console.error("Error seeding Crew Briefing template:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedCrewBriefingTemplate()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
