# Power Automate Integration Guide for Rock Control

This guide provides step-by-step instructions for building Power Automate flows to integrate SharePoint forms with Rock Control.

---

## Overview

**Integration Flows:**
1. **SharePoint → Rock Control**: When an incident report is created/modified in SharePoint, send it to Rock Control
2. **Rock Control → SharePoint**: When a form is submitted in Rock Control (web or voice), update SharePoint

---

## Prerequisites

Before you begin:
- [ ] Power Automate Premium license (for HTTP connector)
- [ ] SharePoint site with Incident Report list/form
- [ ] Rock Control API key (will be provided by Rock Control admin)
- [ ] Rock Control API base URL: `https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev`

---

## Flow 1: SharePoint → Rock Control

### What This Flow Does
Automatically sends incident reports from SharePoint to Rock Control when they are created or updated.

### Copilot Prompt

**Copy and paste this to Power Automate Copilot:**

```
Create a flow that triggers when an item is created or modified in my SharePoint Incident Report list.

When triggered:
1. Get the SharePoint item details
2. Send an HTTP POST request to Rock Control API at:
   URL: https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev/api/integrations/sharepoint/forms
   
3. Include these headers:
   - Content-Type: application/json
   - x-api-key: [MY_API_KEY]
   
4. Send this JSON body:
   {
     "formType": "incident-report",
     "sharepointListId": "LIST_GUID_HERE",
     "sharepointItemId": [SharePoint Item ID],
     "formData": {
       "incidentDate": "[Incident Date field]",
       "location": "[Location field]",
       "description": "[Description field]",
       "severity": "[Severity field]",
       "reportedBy": "[Reported By field]",
       "witnesses": "[Witnesses field]",
       "immediateActions": "[Immediate Actions field]"
     }
   }

5. If the HTTP request succeeds (status 200-299), update the SharePoint item with:
   - Rock Control Status: "Synced"
   - Rock Control ID: [ID from response]
   
6. If the HTTP request fails, send an email notification to admin and log error
```

### Manual Configuration Steps

If building manually (not using Copilot):

#### Step 1: Add SharePoint Trigger
```
Trigger: When an item is created or modified
Site Address: https://aitearoa-my.sharepoint.com/sites/[YOUR_SITE]
List Name: Incident Reports (or your list name)
```

#### Step 2: Add HTTP Action
```
Action: HTTP
Method: POST
URI: https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev/api/integrations/sharepoint/forms

Headers:
{
  "Content-Type": "application/json",
  "x-api-key": "YOUR_API_KEY_HERE"
}

Body:
{
  "formType": "incident-report",
  "sharepointListId": "@{triggerOutputs()?['body/{ListId}']}",
  "sharepointItemId": @{triggerOutputs()?['body/ID']},
  "formData": {
    "incidentDate": "@{triggerOutputs()?['body/IncidentDate']}",
    "location": "@{triggerOutputs()?['body/Location']}",
    "description": "@{triggerOutputs()?['body/Description']}",
    "severity": "@{triggerOutputs()?['body/Severity']}",
    "reportedBy": "@{triggerOutputs()?['body/ReportedBy']}",
    "witnesses": "@{triggerOutputs()?['body/Witnesses']}",
    "immediateActions": "@{triggerOutputs()?['body/ImmediateActions']}"
  },
  "metadata": {
    "createdBy": "@{triggerOutputs()?['body/Author/DisplayName']}",
    "createdDate": "@{triggerOutputs()?['body/Created']}",
    "modifiedBy": "@{triggerOutputs()?['body/Editor/DisplayName']}",
    "modifiedDate": "@{triggerOutputs()?['body/Modified']}"
  }
}
```

#### Step 3: Add Condition (Check Success)
```
Condition: Status code of HTTP
Equals: 200

If Yes Branch:
  1. Parse JSON (parse HTTP response)
  2. Update SharePoint item:
     - Rock Control Status: "Synced"
     - Rock Control ID: @{body('Parse_JSON')?['formId']}
     - Last Sync Date: @{utcNow()}

If No Branch:
  1. Send email to: [ADMIN_EMAIL]
     Subject: "SharePoint → Rock Control Sync Failed"
     Body: "Failed to sync item @{triggerOutputs()?['body/ID']}"
  2. Update SharePoint item:
     - Rock Control Status: "Sync Failed"
     - Error Message: @{body('HTTP')}
```

---

## Flow 2: Rock Control → SharePoint

### What This Flow Does
Receives notifications from Rock Control when forms are submitted (web or voice) and creates/updates corresponding SharePoint items.

### Copilot Prompt

**Copy and paste this to Power Automate Copilot:**

```
Create a flow with an HTTP webhook trigger that receives form submission notifications from Rock Control.

The webhook will receive JSON like:
{
  "eventType": "form.submitted",
  "formId": 123,
  "formType": "incident-report",
  "source": "voice",
  "status": "pending",
  "formData": { ... },
  "submittedBy": "John Doe",
  "timestamp": "2025-01-15T10:30:00Z"
}

When triggered:
1. Parse the incoming JSON
2. Check if formType is "incident-report"
3. If yes, check if SharePoint item already exists (search by Rock Control ID)
4. If exists: Update the SharePoint item
5. If not exists: Create new SharePoint item
6. Map Rock Control fields to SharePoint columns:
   - Title: formData.location
   - Incident Date: formData.incidentDate
   - Description: formData.description
   - Severity: formData.severity
   - Source: source field (web or voice)
   - Rock Control ID: formId
   - Status: "Pending Review" if source is voice, else "Submitted"
7. Send response 200 OK back to Rock Control
```

### Manual Configuration Steps

#### Step 1: Add HTTP Webhook Trigger
```
Trigger: When a HTTP request is received

Schema (click "Use sample payload to generate schema", paste this):
{
  "eventType": "form.submitted",
  "formId": 123,
  "formType": "incident-report",
  "source": "voice",
  "status": "pending",
  "formData": {
    "incidentDate": "2025-01-15",
    "location": "Site A - Building 2",
    "description": "Worker slipped on wet floor",
    "severity": "minor",
    "reportedBy": "John Doe",
    "witnesses": "Jane Smith",
    "immediateActions": "Area cordoned off, first aid administered"
  },
  "submittedBy": "John Doe",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Step 2: Add Condition (Check Form Type)
```
Condition: formType
Equals: incident-report
```

#### Step 3: In "If Yes" Branch - Get SharePoint Items
```
Action: Get items (SharePoint)
Site Address: https://aitearoa-my.sharepoint.com/sites/[YOUR_SITE]
List Name: Incident Reports
Filter Query: RockControlID eq '@{triggerBody()?['formId']}'
Top Count: 1
```

#### Step 4: Add Condition (Item Exists?)
```
Condition: length(body('Get_items')?['value'])
Is greater than: 0
```

#### Step 5A: If Item Exists - Update
```
Action: Update item (SharePoint)
Site Address: https://aitearoa-my.sharepoint.com/sites/[YOUR_SITE]
List Name: Incident Reports
Id: @{first(body('Get_items')?['value'])?['ID']}

Field mappings:
- Incident Date: @{triggerBody()?['formData']?['incidentDate']}
- Location: @{triggerBody()?['formData']?['location']}
- Description: @{triggerBody()?['formData']?['description']}
- Severity: @{triggerBody()?['formData']?['severity']}
- Reported By: @{triggerBody()?['formData']?['reportedBy']}
- Source: @{triggerBody()?['source']}
- Last Updated: @{utcNow()}
```

#### Step 5B: If Item Doesn't Exist - Create
```
Action: Create item (SharePoint)
Site Address: https://aitearoa-my.sharepoint.com/sites/[YOUR_SITE]
List Name: Incident Reports

Field mappings:
- Title: @{triggerBody()?['formData']?['location']}
- Incident Date: @{triggerBody()?['formData']?['incidentDate']}
- Location: @{triggerBody()?['formData']?['location']}
- Description: @{triggerBody()?['formData']?['description']}
- Severity: @{triggerBody()?['formData']?['severity']}
- Reported By: @{triggerBody()?['formData']?['reportedBy']}
- Witnesses: @{triggerBody()?['formData']?['witnesses']}
- Immediate Actions: @{triggerBody()?['formData']?['immediateActions']}
- Rock Control ID: @{triggerBody()?['formId']}
- Source: @{triggerBody()?['source']}
- Status: @{if(equals(triggerBody()?['source'], 'voice'), 'Pending Review', 'Submitted')}
- Created Date: @{utcNow()}
```

#### Step 6: Add Response Action
```
Action: Response
Status Code: 200
Body:
{
  "success": true,
  "sharepointItemId": "@{if(greater(length(body('Get_items')?['value']), 0), first(body('Get_items')?['value'])?['ID'], body('Create_item')?['ID'])}",
  "message": "Form synced to SharePoint successfully"
}
```

---

## SharePoint List Setup

Your SharePoint Incident Report list should have these columns:

| Column Name | Type | Required | Notes |
|-------------|------|----------|-------|
| Title | Single line of text | Yes | Auto-populated from Location |
| Incident Date | Date and Time | Yes | When incident occurred |
| Location | Single line of text | Yes | Site/building location |
| Description | Multiple lines of text | Yes | Detailed description |
| Severity | Choice | Yes | Options: Minor, Moderate, Serious, Critical |
| Reported By | Single line of text | Yes | Person who reported |
| Witnesses | Multiple lines of text | No | Names of witnesses |
| Immediate Actions | Multiple lines of text | No | Actions taken |
| **Rock Control ID** | Number | No | **ADD THIS** - For sync tracking |
| **Source** | Choice | No | **ADD THIS** - Options: web, voice |
| **Rock Control Status** | Choice | No | **ADD THIS** - Options: Synced, Sync Failed, Pending |
| **Last Sync Date** | Date and Time | No | **ADD THIS** - When last synced |

---

## Testing the Integration

### Test SharePoint → Rock Control
1. Create a new incident report in SharePoint
2. Check Power Automate run history (should show success)
3. Verify form appears in Rock Control at: https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev/submissions
4. Check SharePoint item updated with Rock Control ID

### Test Rock Control → SharePoint  
1. Submit a test form in Rock Control (web or call +6435672557 for voice)
2. Check Power Automate run history
3. Verify new item created in SharePoint
4. Check that voice submissions show Source = "voice" and Status = "Pending Review"

---

## Webhook URL Configuration

After creating Flow 2 (HTTP trigger), you'll get a webhook URL like:
```
https://prod-xx.environment.api.powerplatform.com/workflows/xxxxx...
```

**IMPORTANT:** 
1. Copy this complete URL (may be 300+ characters)
2. Send it to your Rock Control admin to register
3. Rock Control will send notifications to this URL when forms are submitted

---

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Check API key is correct in HTTP headers
- Verify API key hasn't expired

**400 Bad Request**
- Check JSON format in body
- Ensure all required fields are mapped
- Verify SharePoint column names match exactly

**404 Not Found**
- Verify Rock Control API URL is correct
- Check endpoint path is correct

**Flow not triggering**
- SharePoint: Check trigger is enabled and list name is correct
- HTTP trigger: Verify webhook URL was registered with Rock Control

### Viewing Errors
1. Go to Power Automate → My flows
2. Click on the flow name
3. Click "Run history"
4. Click on failed run to see details
5. Expand each action to see inputs/outputs

---

## Field Mapping Reference

### Incident Report Fields

| Rock Control Field | SharePoint Column | Type | Example |
|-------------------|-------------------|------|---------|
| incidentDate | Incident Date | Date | 2025-01-15 |
| location | Location | Text | "Site A - Building 2" |
| description | Description | Text | "Worker slipped on wet floor" |
| severity | Severity | Choice | "minor" / "moderate" / "serious" / "critical" |
| reportedBy | Reported By | Text | "John Doe" |
| witnesses | Witnesses | Text | "Jane Smith, Bob Johnson" |
| immediateActions | Immediate Actions | Text | "Area cordoned off" |

### System Fields

| Rock Control Field | SharePoint Column | Notes |
|-------------------|-------------------|-------|
| formId | Rock Control ID | Numeric ID for sync tracking |
| source | Source | "web" or "voice" |
| status | Status | Form status in Rock Control |
| submittedBy | Created By | Auto-populated |
| timestamp | Created Date | Auto-populated |

---

## Next Steps

1. ✅ Review your SharePoint form structure and column names
2. ✅ Add the required columns to SharePoint (Rock Control ID, Source, Status)
3. ✅ Create Flow 1 (SharePoint → Rock Control) using Copilot prompts above
4. ✅ Create Flow 2 (Rock Control → SharePoint) using Copilot prompts above
5. ✅ Get API key from Rock Control admin
6. ✅ Configure flows with your API key and SharePoint details
7. ✅ Register Flow 2 webhook URL with Rock Control
8. ✅ Test both directions
9. ✅ Monitor run history for errors

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Power Automate run history for detailed error messages
3. Verify all prerequisites are met
4. Contact your Rock Control administrator for API access issues
