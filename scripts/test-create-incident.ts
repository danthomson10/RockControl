import { sharePointService } from "../server/sharepoint";

async function testCreateIncident() {
  console.log("🧪 Testing SharePoint incident creation...\n");

  if (!sharePointService.isConfigured()) {
    console.error("❌ SharePoint service is not configured!");
    return;
  }

  const testData = {
    formData: {
      incidentTitle: "Test Incident from Rock Control",
      timeOfIncident: "14:30",
      location: "Test Site - Building A",
      incidentType: "Near Miss",
      severity: "Low",
      description: "This is a test incident report created automatically from Rock Control to verify SharePoint integration.",
      peopleInvolved: "John Doe, Jane Smith",
      wereThirdPartiesInjured: "No",
      injuryDetails: "N/A",
      witnesses: "Mike Johnson",
      immediateActionTaken: "Area was secured and team briefed",
      equipmentInvolved: "Forklift #234",
    },
    formCode: "TEST-INC-" + Date.now(),
    submittedBy: "Test User",
    submittedAt: new Date(),
  };

  try {
    console.log("📤 Creating incident in SharePoint...");
    console.log("Form Code:", testData.formCode);
    console.log();

    const itemId = await sharePointService.createIncidentReportItem(testData);

    if (itemId) {
      console.log("✅ Success! Incident created in SharePoint");
      console.log("SharePoint Item ID:", itemId);
      console.log("\n🔗 Check your SharePoint list to verify the entry!");
    } else {
      console.log("❌ Failed to create incident - no item ID returned");
    }
  } catch (error: any) {
    console.error("❌ Error creating incident:", error.message);
    if (error.body) {
      console.error("\nDetailed error:", error.body);
    }
  }
}

testCreateIncident();
