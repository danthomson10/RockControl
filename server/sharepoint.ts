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

      // Normalize date to ISO format (YYYY-MM-DD) for SharePoint
      const normalizeDate = (dateValue: any): string => {
        if (!dateValue) return submittedAt.toISOString().split('T')[0];
        
        // If already a Date object
        if (dateValue instanceof Date) {
          return dateValue.toISOString().split('T')[0];
        }
        
        // If string, try to parse it
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
          }
        }
        
        // Fallback to submission date
        return submittedAt.toISOString().split('T')[0];
      };

      // Convert various truthy/falsey values to boolean for SharePoint boolean fields
      const normalizeBoolean = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
          const normalized = value.toLowerCase().trim();
          return normalized === 'yes' || normalized === 'true' || normalized === '1';
        }
        return false;
      };

      const wereThereInjuries = normalizeBoolean(formData.wereThereInjuries);
      const incidentDate = normalizeDate(formData.dateOfIncident || formData.incidentDate);

      const listItem = {
        fields: {
          Title: formData.incidentTitle || formData.title || `Incident ${formCode}`,
          field_1: incidentDate, // DateOfIncident (normalized to YYYY-MM-DD)
          field_2: formData.timeOfIncident || formData.time || "", // TimeOfIncident
          field_3: formData.location || "", // Location
          field_4: formData.incidentType || "", // IncidentType
          field_5: formData.severity || "", // Severity
          field_6: formData.description || formData.incidentDescription || "", // IncidentDescription
          field_7: formData.peopleInvolved || "", // PeopleInvolved
          field_8: wereThereInjuries, // WereThereInjuries (boolean - properly converted)
          field_9: formData.injuryDetails || "", // InjuryDetails
          field_10: formData.witnesses || "", // Witnesses
          field_11: formData.immediateActionTaken || formData.immediateActions || "", // ImmediateActionsTaken
          field_12: formData.equipmentInvolved || "", // EquipmentInvolved
          field_18: submittedBy, // ReportedBy
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
