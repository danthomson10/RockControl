# SharePoint Integration Setup Guide

## Overview

Rock Control now supports one-way synchronization of Incident Reports to SharePoint Lists using the Microsoft Graph API. When enabled, submitting an Incident Report in Rock Control will automatically create a matching item in your SharePoint incident list.

## Prerequisites

1. **Microsoft Entra (Azure AD) Application** with the following:
   - Client ID
   - Client Secret
   - Tenant ID
   - API Permissions: `Sites.ReadWrite.All` (Application permission)

2. **SharePoint Site** with:
   - A custom list for incidents
   - Appropriate columns (see Field Mapping below)

3. **Environment Variables** (already configured in Rock Control):
   ```
   MICROSOFT_CLIENT_ID=your_client_id
   MICROSOFT_CLIENT_SECRET=your_client_secret
   MICROSOFT_TENANT_ID=your_tenant_id
   ```

## Field Mapping

Rock Control Incident Reports use hyphenated field names in the form data. The default mapping to SharePoint columns is:

| Rock Control Field | SharePoint Column | Type | Notes |
|-------------------|-------------------|------|-------|
| incident-date | IncidentDate | Date and time | Date of incident |
| incident-time | IncidentTime | Single line of text | Time of incident |
| location | Location | Single line of text | Where it happened |
| incident-type | IncidentType | Single line of text | Type classification |
| severity | Severity | Choice | Options: Low, Medium, High, Critical |
| description | Description | Multiple lines of text | Incident details |
| people-involved | PeopleInvolved | Multiple lines of text | People involved |
| injuries | Injuries | Choice | Yes/No |
| injury-details | InjuryDetails | Multiple lines of text | Injury specifics |
| witnesses | Witnesses | Multiple lines of text | Witness information |
| immediate-actions | ImmediateActions | Multiple lines of text | Actions taken |
| equipment-involved | EquipmentInvolved | Single line of text | Equipment details |
| weather-conditions | WeatherConditions | Single line of text | Weather at time |
| root-cause-category | RootCauseCategory | Choice | Category of root cause |
| root-cause-analysis | RootCauseAnalysis | Multiple lines of text | Analysis details |
| corrective-actions | CorrectiveActions | Multiple lines of text | Corrective measures |
| preventive-measures | PreventiveMeasures | Multiple lines of text | Prevention steps |
| reported-by | ReportedBy | Single line of text | Person who reported |
| contact-number | ContactNumber | Single line of text | Contact information |

**Note**: The SharePoint list also gets a `Title` field auto-populated with: `Incident - {location} - {date}`

## Setup Instructions

### Step 1: Create SharePoint List Columns

In your SharePoint site, create a custom list named "Incident Reports" (or your preferred name) with these columns:

**Required Columns:**
1. **IncidentDate** (Date and time)
2. **IncidentTime** (Single line of text)
3. **Location** (Single line of text)
4. **Description** (Multiple lines of text)

**Recommended Columns:**
5. **IncidentType** (Single line of text)
6. **Severity** (Choice: Low, Medium, High, Critical)
7. **PeopleInvolved** (Multiple lines of text)
8. **Injuries** (Choice: Yes, No)
9. **InjuryDetails** (Multiple lines of text)
10. **Witnesses** (Multiple lines of text)
11. **ImmediateActions** (Multiple lines of text)
12. **EquipmentInvolved** (Single line of text)
13. **WeatherConditions** (Single line of text)
14. **RootCauseCategory** (Choice: Human Error, Equipment Failure, Environmental, Process)
15. **RootCauseAnalysis** (Multiple lines of text)
16. **CorrectiveActions** (Multiple lines of text)
17. **PreventiveMeasures** (Multiple lines of text)
18. **ReportedBy** (Single line of text)
19. **ContactNumber** (Single line of text)

**Note on Array Fields:** If your incident report form allows multiple weather conditions to be selected, they will be joined with commas in the WeatherConditions field.

**Note**: The `Title` column (default in all SharePoint lists) will be auto-populated.

### Step 2: Initialize SharePoint Configuration

As an Organization Admin in Rock Control, use the API to initialize SharePoint:

**Request:**
```bash
curl -X POST https://your-rock-control-domain.repl.co/api/sharepoint-config/initialize \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "siteUrl": "https://yourtenant.sharepoint.com/sites/yoursite",
    "incidentListName": "Incident Reports"
  }'
```

**Response (Success):**
```json
{
  "id": 1,
  "organizationId": 1,
  "siteUrl": "https://yourtenant.sharepoint.com/sites/yoursite",
  "siteId": "contoso.sharepoint.com,abc123-def456-...",
  "incidentListId": "guid-of-your-list",
  "incidentListName": "Incident Reports",
  "enabled": true,
  "fieldMappings": null,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**What happens:**
- System connects to your SharePoint site using the Microsoft Graph API
- Discovers the site ID from the URL
- Looks for a list matching "Incident Reports" (or your specified name)
- Stores configuration in database
- Enables integration automatically if list is found

**Verify Configuration:**
```bash
curl https://your-rock-control-domain.repl.co/api/sharepoint-config \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**If List Discovery Fails:**

If initialization succeeds but list discovery fails, the response will have:
```json
{
  "enabled": false,
  "incidentListId": null
}
```

In this case, you can manually provide the list ID using PATCH:

1. Find your SharePoint list ID (from list settings URL or Graph API)
2. Update configuration manually:

```bash
curl -X PATCH https://your-rock-control-domain.repl.co/api/sharepoint-config \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "incidentListId": "your-actual-list-guid",
    "incidentListName": "Incident Reports",
    "enabled": true
  }'
```

**Alternative Flow (Minimal Initialization):**

You can also initialize with just the site URL, then add list details later:

```bash
# Step 1: Initialize with site only
curl -X POST https://your-rock-control-domain.repl.co/api/sharepoint-config/initialize \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{"siteUrl": "https://yourtenant.sharepoint.com/sites/yoursite"}'

# Step 2: Add list details manually
curl -X PATCH https://your-rock-control-domain.repl.co/api/sharepoint-config \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "incidentListId": "manually-obtained-list-guid",
    "incidentListName": "Incident Reports",
    "enabled": true
  }'
```

### Step 3: Submit an Incident Report

1. Navigate to **Forms** → **Incident Report**
2. The "Send to SharePoint" checkbox will appear at the top of the form
3. Fill out the incident report form
4. Ensure "Send to SharePoint" is checked
5. Submit the form

The system will:
- Save the incident to Rock Control database
- Create a matching item in SharePoint (if toggle is enabled)
- Return success/error status

## Troubleshooting

### Configuration Not Found

**Error**: "SharePoint site or list not configured"

**Solution**: Initialize the SharePoint configuration using the `/api/sharepoint-config/initialize` endpoint

### List Discovery Failed

**Error**: "Failed to discover list"

**Solution**: 
- Verify the list name is correct (case-sensitive)
- Check that the list exists in the specified site
- Ensure the application has `Sites.ReadWrite.All` permissions

### Sync Failed But Form Saved

If the SharePoint sync fails, the incident will still be saved in Rock Control. Check the server logs for detailed error messages.

Common causes:
- SharePoint site is unavailable
- List columns don't match expected names
- Authentication token expired

### Permission Errors

**Error**: "Access denied" or "Insufficient permissions"

**Solution**: 
- Verify the Microsoft Entra application has `Sites.ReadWrite.All` permission
- Ensure admin consent has been granted for the permission
- Check that the site collection administrator has not restricted API access

## API Endpoints

All endpoints require authentication and the `canManageIntegrations` capability (typically Org Admin role).

### GET /api/sharepoint-config

Get current SharePoint configuration for your organization.

**Request:**
```bash
GET /api/sharepoint-config
Cookie: connect.sid=YOUR_SESSION_COOKIE
```

**Response:**
```json
{
  "id": 1,
  "organizationId": 1,
  "siteUrl": "https://yourtenant.sharepoint.com/sites/yoursite",
  "siteId": "contoso.sharepoint.com,abc123-...",
  "incidentListId": "list-guid",
  "incidentListName": "Incident Reports",
  "enabled": true,
  "fieldMappings": null,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

Returns `null` if no configuration exists.

---

### POST /api/sharepoint-config/initialize

Initialize SharePoint integration by connecting to a site and discovering the incident list.

**Request:**
```bash
POST /api/sharepoint-config/initialize
Content-Type: application/json
Cookie: connect.sid=YOUR_SESSION_COOKIE

{
  "siteUrl": "https://yourtenant.sharepoint.com/sites/yoursite",
  "incidentListName": "Incident Reports"
}
```

**Required Fields:**
- `siteUrl` (string): Full SharePoint site URL
- `incidentListName` (string, optional): Name of the list to use for incidents

**Response:**
```json
{
  "id": 1,
  "organizationId": 1,
  "siteUrl": "https://yourtenant.sharepoint.com/sites/yoursite",
  "siteId": "discovered-site-id",
  "incidentListId": "discovered-list-id",
  "incidentListName": "Incident Reports",
  "enabled": true,
  "fieldMappings": null,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Notes:**
- If list discovery fails, `incidentListId` will be `null` and `enabled` will be `false`
- If configuration already exists for your organization, it will be updated (upsert behavior)

---

### PATCH /api/sharepoint-config

Update existing SharePoint configuration settings.

**Request:**
```bash
PATCH /api/sharepoint-config
Content-Type: application/json
Cookie: connect.sid=YOUR_SESSION_COOKIE

{
  "enabled": true,
  "incidentListName": "Updated List Name",
  "incidentListId": "new-list-guid"
}
```

**Updatable Fields:**
- `enabled` (boolean): Enable/disable sync
- `incidentListName` (string): Update list name
- `incidentListId` (string): Update list ID
- `siteUrl` (string): Update site URL
- `siteId` (string): Update site ID
- `fieldMappings` (object): Custom field mapping overrides

**Response:**
```json
{
  "id": 1,
  "organizationId": 1,
  "siteUrl": "https://yourtenant.sharepoint.com/sites/yoursite",
  "siteId": "site-id",
  "incidentListId": "new-list-guid",
  "incidentListName": "Updated List Name",
  "enabled": true,
  "fieldMappings": null,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:05:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "SharePoint configuration not found. Please initialize first."
}
```

## Testing

### End-to-End Test Flow

**1. Initialize SharePoint Configuration:**

```bash
curl -X POST http://localhost:5000/api/sharepoint-config/initialize \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "siteUrl": "https://yourtenant.sharepoint.com/sites/yoursite",
    "incidentListName": "Incident Reports"
  }'
```

Expected result: JSON response with `enabled: true` and populated `siteId` and `incidentListId`

**2. Submit Test Incident Report:**

In Rock Control web interface:
- Navigate to **Forms** → **Incident Report**
- You should see a "Send to SharePoint" checkbox at the top
- Fill in the form with test data:
  - **Incident Date**: (select a date)
  - **Location**: "Test Site - Main Entrance"
  - **Incident Type**: "Near Miss"
  - **Severity**: "Medium"
  - **Description**: "Test incident for SharePoint integration"
  - **Reported By**: "Your Name"
- Ensure "Send to SharePoint" is **checked**
- Click **Submit**

Expected result: Form submits successfully with confirmation message

**3. Verify in SharePoint:**

- Open your SharePoint site
- Navigate to your "Incident Reports" list
- Look for the newest item with:
  - **Title**: "Incident - Test Site - Main Entrance - {date}"
  - **Location**: "Test Site - Main Entrance"
  - **Description**: "Test incident for SharePoint integration"
  - **Severity**: "Medium"
- All filled fields should appear in corresponding SharePoint columns

**4. Verify in Rock Control:**

- Navigate to **Submissions** or **Forms** list
- Find your test incident
- Verify it was saved to Rock Control database
- Check server logs for confirmation: `Successfully synced form {formCode} to SharePoint`

---

### Testing Failure Scenarios

**Test 1: SharePoint Not Configured**

1. Ensure no SharePoint configuration exists (or disable it via PATCH)
2. Submit an incident report with "Send to SharePoint" checked
3. **Expected**: Form saves successfully, but SharePoint sync fails gracefully
4. **Verify**: Check server logs for: `SharePoint sync failed: SharePoint site or list not configured`

**Test 2: Invalid SharePoint List**

1. Use PATCH to set an invalid `incidentListId`
2. Submit an incident report
3. **Expected**: Form saves, sync fails
4. **Verify**: Check logs for Graph API error details

**Test 3: Missing Required Fields**

1. Submit an incident report with minimal fields (only description)
2. **Expected**: Form saves, SharePoint item created with only available fields
3. **Verify**: Empty SharePoint columns for missing data

**Test 4: Authentication Failure**

1. Invalidate Microsoft credentials (remove/corrupt environment variables)
2. Submit an incident report
3. **Expected**: Form saves, sync fails with auth error
4. **Verify**: Check logs for authentication error message

---

### Log Inspection

SharePoint sync events are logged with the following patterns:

**Success:**
```
Successfully synced form INCIDENT-2024-001 to SharePoint. Item ID: abc-123
```

**Failure (Configuration):**
```
SharePoint sync failed: SharePoint site or list not configured
```

**Failure (Graph API):**
```
Failed to create incident in SharePoint: [Graph API error details]
SharePoint sync failed: [error message]
```

**Failure (Field Mapping):**
```
Failed to map field: [field name] - [error details]
```

To view logs in Rock Control:
```bash
# View recent application logs
tail -f /path/to/logs/app.log

# Or use the Replit console logs viewer
```

### Expected Results

✅ **Success**:
- Form saves to Rock Control database
- New item appears in SharePoint list
- All fields are mapped correctly
- Status shows in both systems

❌ **Partial Success** (form saves, SharePoint fails):
- Form saves to Rock Control
- Error message indicates SharePoint sync failed
- Check server logs for details
- Item can be manually added to SharePoint

## Security Considerations

- **Multi-tenant Isolation**: SharePoint configuration is scoped per organization
- **RBAC Protection**: Only users with `canManageIntegrations` can configure SharePoint
- **Token Security**: Access tokens are cached in memory (1 hour) and never logged
- **Audit Trail**: All SharePoint sync attempts are logged server-side

## Limitations

- **One-way Sync**: Changes in SharePoint do not sync back to Rock Control
- **Incident Reports Only**: Currently only supports incident report forms
- **No Attachments**: File attachments are not synced to SharePoint
- **Rate Limits**: Subject to Microsoft Graph API throttling limits

## Future Enhancements

- Two-way synchronization
- Support for additional form types (Take-5, Crew Briefing, etc.)
- File attachment syncing
- Batch sync for historical data
- Real-time webhook notifications from SharePoint
