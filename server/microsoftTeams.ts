import type { Request } from "express";

interface TeamsNotification {
  title: string;
  text: string;
  variationNumber: string;
  jobCode: string;
  category: string;
  impactType: string;
  costImpact?: string;
  timeImpact?: string;
  requestedBy: string;
}

/**
 * Send notification to Microsoft Teams
 * 
 * This function prepares to send variation notifications to Microsoft Teams.
 * 
 * Requirements:
 * 1. Set TEAMS_WEBHOOK_URL environment variable with your Teams Incoming Webhook URL
 * 2. Or use Microsoft Graph API with proper OAuth tokens
 * 
 * Setup Instructions:
 * - Teams Webhook: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
 * - Graph API: Requires Microsoft app registration and user OAuth consent
 */
export async function sendTeamsNotification(notification: TeamsNotification): Promise<boolean> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn("TEAMS_WEBHOOK_URL not configured. Skipping Teams notification.");
    console.log("Variation details:", notification);
    return false;
  }

  try {
    const adaptiveCard = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            version: "1.4",
            body: [
              {
                type: "TextBlock",
                text: "🔔 New Variation Request",
                weight: "Bolder",
                size: "Large",
                color: "Accent"
              },
              {
                type: "TextBlock",
                text: notification.title,
                weight: "Bolder",
                size: "Medium",
                wrap: true
              },
              {
                type: "FactSet",
                facts: [
                  {
                    title: "Variation #:",
                    value: notification.variationNumber
                  },
                  {
                    title: "Job Code:",
                    value: notification.jobCode
                  },
                  {
                    title: "Category:",
                    value: notification.category
                  },
                  {
                    title: "Impact Type:",
                    value: notification.impactType
                  },
                  ...(notification.costImpact ? [{
                    title: "Cost Impact:",
                    value: notification.costImpact
                  }] : []),
                  ...(notification.timeImpact ? [{
                    title: "Time Impact:",
                    value: notification.timeImpact
                  }] : []),
                  {
                    title: "Requested By:",
                    value: notification.requestedBy
                  }
                ]
              },
              {
                type: "TextBlock",
                text: notification.text,
                wrap: true,
                separator: true
              }
            ],
            actions: [
              {
                type: "Action.OpenUrl",
                title: "View in Rock Control",
                url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/forms/variation`
              }
            ]
          }
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(adaptiveCard),
    });

    if (!response.ok) {
      throw new Error(`Teams API error: ${response.status} ${response.statusText}`);
    }

    console.log("✓ Teams notification sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send Teams notification:", error);
    return false;
  }
}

/**
 * Upload document to SharePoint
 * 
 * This function prepares to upload variation documents to SharePoint.
 * 
 * Requirements:
 * 1. Microsoft Graph API access token with Files.ReadWrite.All permission
 * 2. SharePoint site ID and drive ID
 * 
 * Setup Instructions:
 * - Register app in Azure AD with required permissions
 * - Use OAuth to get user access token or app-only access
 * - Store tokens in oauthConnections table
 */
export async function uploadToSharePoint(
  fileName: string,
  content: string,
  accessToken?: string
): Promise<boolean> {
  const siteId = process.env.SHAREPOINT_SITE_ID;
  const driveId = process.env.SHAREPOINT_DRIVE_ID;
  
  if (!siteId || !driveId || !accessToken) {
    console.warn("SharePoint not configured. Skipping upload.");
    console.log("Document would be uploaded:", fileName);
    return false;
  }

  try {
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/RockControl/Variations/${fileName}:/content`;
    
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: content,
    });

    if (!response.ok) {
      throw new Error(`SharePoint API error: ${response.status} ${response.statusText}`);
    }

    console.log("✓ Document uploaded to SharePoint successfully");
    return true;
  } catch (error) {
    console.error("Failed to upload to SharePoint:", error);
    return false;
  }
}
