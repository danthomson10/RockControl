# Microsoft Teams & SharePoint Integration Setup

Rock Control has built-in capability to send variation notifications to Microsoft Teams and upload documents to SharePoint. This guide explains how to configure these integrations.

## 🔔 Microsoft Teams Notifications

### Option 1: Incoming Webhooks (Easiest)

Teams Incoming Webhooks allow you to post messages to a Teams channel without requiring user authentication.

#### Setup Steps:

1. **Create an Incoming Webhook in Teams:**
   - Open Microsoft Teams
   - Navigate to the channel where you want to receive notifications
   - Click the `···` (More options) button next to the channel name
   - Select **Connectors** (or **Workflows** in newer Teams)
   - Search for **Incoming Webhook**
   - Click **Configure** or **Add**
   - Give your webhook a name (e.g., "Rock Control Notifications")
   - Optionally upload a custom icon
   - Click **Create**
   - **Copy the webhook URL** (it looks like: `https://outlook.office.com/webhook/...`)

2. **Configure Rock Control:**
   - In your Replit environment, go to **Secrets** (lock icon in sidebar)
   - Add a new secret:
     - Key: `TEAMS_WEBHOOK_URL`
     - Value: Paste the webhook URL you copied
   - Click **Add Secret**
   - Restart your application

3. **Test It:**
   - Submit a variation form in Rock Control
   - Check your Teams channel - you should see a notification with variation details!

### Option 2: Microsoft Graph API (Advanced)

For more advanced scenarios (like posting on behalf of a user or accessing additional Teams features), you can use the Microsoft Graph API.

#### Prerequisites:
- Azure Active Directory (Entra ID) app registration
- Appropriate API permissions
- User consent flow

This is already partially set up through the Microsoft SSO integration. Additional configuration is needed for posting to Teams via Graph API.

---

## 📁 SharePoint Document Upload

To automatically upload variation PDFs or documents to SharePoint, you'll need to configure the Microsoft Graph API.

### Setup Steps:

1. **Get Your SharePoint Site ID:**
   ```bash
   # Using Microsoft Graph Explorer (https://developer.microsoft.com/graph/graph-explorer)
   GET https://graph.microsoft.com/v1.0/sites/root
   
   # Or for a specific site:
   GET https://graph.microsoft.com/v1.0/sites/{your-domain}.sharepoint.com:/sites/{site-name}
   ```

2. **Get Your Document Library (Drive) ID:**
   ```bash
   GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
   ```

3. **Configure Environment Variables:**
   Add these secrets in Replit:
   - `SHAREPOINT_SITE_ID`: Your SharePoint site ID
   - `SHAREPOINT_DRIVE_ID`: Your document library drive ID

4. **Ensure OAuth Tokens are Stored:**
   The Microsoft SSO integration should already handle storing access tokens. The system will use these tokens to upload documents on behalf of authenticated users.

---

## 🔧 Technical Details

### Teams Notification Flow:
```
User submits variation form
    ↓
POST /api/variations (with sendToTeams: true)
    ↓
Variation saved to database
    ↓
sendTeamsNotification() called
    ↓
Adaptive Card sent to Teams webhook
    ↓
Notification appears in Teams channel
```

### Data Sent to Teams:
- Variation number
- Job code
- Category
- Impact type (cost/time)
- Cost and time estimates
- Requested by
- Description
- Direct link to view in Rock Control

### Adaptive Card Format:
The Teams notification uses Microsoft's Adaptive Card format, providing:
- Rich formatting
- Color-coded severity
- Actionable buttons
- Professional appearance
- Mobile-friendly layout

---

## 🚨 Troubleshooting

### "TEAMS_WEBHOOK_URL not configured"
- You'll see this warning in console logs if the webhook isn't set up
- Variations will still save to the database
- No Teams notification will be sent

### Webhook Not Posting
1. Verify the webhook URL is correct
2. Check that the webhook hasn't been deleted in Teams
3. Ensure the channel still exists
4. Test the webhook manually:
   ```bash
   curl -H "Content-Type: application/json" -d '{"text":"Test"}' YOUR_WEBHOOK_URL
   ```

### SharePoint Upload Fails
1. Verify site ID and drive ID are correct
2. Check that OAuth tokens are being stored properly
3. Ensure the Microsoft app has `Files.ReadWrite.All` permission
4. Verify user has access to the SharePoint site

---

## 📊 Current Limitations

1. **Teams Notifications:**
   - Currently uses webhook (one-way)
   - Cannot read responses or update messages
   - Limited to text and adaptive cards

2. **SharePoint Upload:**
   - Requires active user session with valid OAuth token
   - User must have SharePoint access
   - No automatic cleanup of old documents

---

## 🔮 Future Enhancements

Potential improvements to consider:
- [ ] Two-way Teams integration (respond to approvals in Teams)
- [ ] Automatic PDF generation of variation forms
- [ ] SharePoint folder organization by job code
- [ ] Teams bot for querying variations
- [ ] Real-time status updates in Teams when variations are approved
- [ ] Document version control in SharePoint

---

## 📚 Resources

- [Microsoft Teams Incoming Webhooks](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/overview)
- [SharePoint REST API](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)

---

## 💡 Need Help?

If you encounter issues setting up the integrations:
1. Check the server logs for detailed error messages
2. Verify your secrets are correctly set in Replit
3. Test the webhook URL independently
4. Ensure Microsoft 365 admin hasn't disabled webhooks for your organization
