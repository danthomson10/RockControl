import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";

interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteId: string;
  listId: string;
}

interface IncidentReportData {
  formData: Record<string, any>;
  formCode: string;
  submittedBy: string;
  submittedAt: Date;
}

export class SharePointService {
  private client: Client | null = null;
  private config: SharePointConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const siteId = process.env.SHAREPOINT_SITE_ID;
    const listId = process.env.SHAREPOINT_LIST_ID;

    if (!tenantId || !clientId || !clientSecret || !siteId || !listId) {
      console.warn(
        "SharePoint integration not configured. Missing environment variables:",
        {
          hasTenantId: !!tenantId,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasSiteId: !!siteId,
          hasListId: !!listId,
        }
      );
      return;
    }

    this.config = { tenantId, clientId, clientSecret, siteId, listId };
    
    const credential = new ClientSecretCredential(
      tenantId,
      clientId,
      clientSecret
    );

    this.client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken(
            "https://graph.microsoft.com/.default"
          );
          return token.token;
        },
      },
    });

    console.log("SharePoint service initialized successfully");
  }

  public isConfigured(): boolean {
    return this.client !== null && this.config !== null;
  }

  public async createIncidentReportItem(
    data: IncidentReportData
  ): Promise<string | null> {
    if (!this.isConfigured() || !this.client || !this.config) {
      throw new Error("SharePoint service is not configured");
    }

    try {
      const { formData, formCode, submittedBy, submittedAt } = data;

      const listItem = {
        fields: {
          Title: formData.incidentTitle || formData.title || `Incident ${formCode}`,
          Date: submittedAt.toISOString().split('T')[0],
          TimeOffIncident: formData.timeOfIncident || formData.time || "",
          Location: formData.location || "",
          IncidentType: formData.incidentType || "",
          Severity: formData.severity || "",
          IncidentDescription: formData.description || formData.incidentDescription || "",
          PeopleInvolved: formData.peopleInvolved || "",
          WereThirdpartiesinjur: formData.wereThirdPartiesInjured || formData.thirdPartiesInjured || "",
          InjuryDetails: formData.injuryDetails || "",
          Witnesses: formData.witnesses || "",
          ImmediateActionTaken: formData.immediateActionTaken || formData.immediateActions || "",
          EquipmentInvolved: formData.equipmentInvolved || "",
        },
      };

      const response = await this.client
        .api(`/sites/${this.config.siteId}/lists/${this.config.listId}/items`)
        .post(listItem);

      console.log(`SharePoint item created successfully: ${response.id}`);
      return response.id;
    } catch (error: any) {
      console.error("Error creating SharePoint list item:", error);
      console.error("Error details:", {
        message: error.message,
        statusCode: error.statusCode,
        body: error.body,
      });
      throw error;
    }
  }
}

export const sharePointService = new SharePointService();
