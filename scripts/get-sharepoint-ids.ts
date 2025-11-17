import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";

async function getSharePointIds() {
  const tenantId = process.env.AZURE_TENANT_ID!;
  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;

  const credential = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
  );

  const client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken(
          "https://graph.microsoft.com/.default"
        );
        return token.token;
      },
    },
  });

  try {
    console.log("🔍 Fetching SharePoint site information...\n");

    // Get site ID using the hostname and path from the Drive ID provided
    const siteUrl = "aitearoa.sharepoint.com:/sites/rockcontrol";
    const site = await client
      .api(`/sites/${siteUrl}`)
      .get();

    console.log("✅ Site found:");
    console.log(`   Name: ${site.displayName}`);
    console.log(`   Site ID: ${site.id}`);
    console.log(`   Web URL: ${site.webUrl}\n`);

    // Get all lists in the site
    console.log("🔍 Fetching lists...\n");
    const lists = await client
      .api(`/sites/${site.id}/lists`)
      .get();

    console.log("📋 Available lists:");
    for (const list of lists.value) {
      console.log(`   - ${list.displayName} (ID: ${list.id})`);
      
      // Check if this is the Incident Report list
      if (list.displayName.toLowerCase().includes("incident")) {
        console.log(`     ⭐ This looks like your Incident Report list!`);
      }
    }

    console.log("\n🔧 Environment variables to set:");
    console.log(`SHAREPOINT_SITE_ID=${site.id}`);
    
    // Find incident report list
    const incidentList = lists.value.find((l: any) => 
      l.displayName.toLowerCase().includes("incident")
    );
    
    if (incidentList) {
      console.log(`SHAREPOINT_LIST_ID=${incidentList.id}`);
    } else {
      console.log("SHAREPOINT_LIST_ID=<find the correct list ID from above>");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.statusCode === 401) {
      console.error("\n⚠️  Authentication failed. Please check:");
      console.error("   1. Azure app has Sites.ReadWrite.All permission");
      console.error("   2. Admin consent has been granted");
      console.error("   3. Client secret is correct and not expired");
    }
  }
}

getSharePointIds();
