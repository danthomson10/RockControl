import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";

async function getListFields() {
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
    console.log("📋 Fetching list items to see field structure...\n");

    // Get list items with all fields expanded
    const items = await client
      .api(`/sites/${siteId}/lists/${listId}/items`)
      .expand('fields')
      .top(1)
      .get();

    if (items.value && items.value.length > 0) {
      const firstItem = items.value[0];
      console.log("Sample item fields:");
      console.log("===================\n");
      
      const fields = firstItem.fields;
      for (const [key, value] of Object.entries(fields)) {
        if (!key.startsWith('@') && !key.startsWith('_') && key !== 'id' && key !== 'ContentType' && key !== 'Attachments') {
          console.log(`${key}: ${value}`);
        }
      }
    } else {
      console.log("No items found in the list. Let me get the field definitions instead...\n");
      
      // Get all fields/columns
      const fields = await client
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .get();
      
      console.log("List columns:");
      console.log("=============\n");
      
      for (const field of fields.value) {
        if (!field.hidden && field.name !== 'Attachments' && field.name !== 'ContentType') {
          console.log(`Internal Name: ${field.name}`);
          console.log(`  Display Name: ${field.displayName}`);
          console.log(`  Type: ${field.text ? 'Text' : field.dateTime ? 'DateTime' : field.choice ? 'Choice' : field.number ? 'Number' : 'Other'}`);
          if (field.choice) {
            console.log(`  Choices: ${field.choice.choices.join(', ')}`);
          }
          console.log();
        }
      }
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.body) {
      console.error("Details:", error.body);
    }
  }
}

getListFields();
