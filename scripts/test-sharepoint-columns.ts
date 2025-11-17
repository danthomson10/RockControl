import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";

async function getListColumns() {
  const tenantId = process.env.AZURE_TENANT_ID!;
  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;
  const siteId = process.env.SHAREPOINT_SITE_ID!;
  const listId = process.env.SHAREPOINT_LIST_ID!;

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
    console.log("📋 Fetching SharePoint list columns...\n");

    const columns = await client
      .api(`/sites/${siteId}/lists/${listId}/columns`)
      .get();

    console.log("Available columns in 'Incident Report' list:");
    console.log("==========================================\n");

    for (const column of columns.value) {
      if (!column.readOnly && column.name !== 'Attachments') {
        console.log(`Column: ${column.name}`);
        console.log(`  Display Name: ${column.displayName}`);
        console.log(`  Type: ${column.type || column.columnGroup}`);
        console.log(`  Required: ${column.required || false}`);
        console.log();
      }
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.body) {
      console.error("Details:", JSON.parse(error.body).error.message);
    }
  }
}

getListColumns();
