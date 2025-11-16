# Voice Form Filling Setup Guide

Rock Control now supports voice-based form completion using Twilio + ElevenLabs integration. Workers can call a phone number and complete safety forms using natural conversation.

## Features

✅ Call a phone number to fill out forms via voice
✅ AI-powered conversation guides users through form questions
✅ SMS confirmation sent after successful submission
✅ Supports all form types: Incident Reports, Take-5, Crew Briefings, etc.

## Setup Instructions

### 1. Configure Twilio Phone Number ✅ COMPLETED

Your Twilio phone number **+6435672557** is already configured with the correct webhooks!

**Option A: Via Twilio Console (Web UI)**

1. Go to [Twilio Console → Phone Numbers → Manage → Active Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click on your phone number
3. Scroll to **Voice Configuration**
4. Set the following:
   - **Configure With:** Webhook
   - **A CALL COMES IN:**
     - **Webhook URL:** `https://rockcontrol.app/api/voice/incoming-call`
     - **HTTP Method:** POST
5. Click **Save Configuration**

**Option B: Via Twilio CLI (Terminal)**

```bash
twilio phone-numbers:update YOUR_PHONE_NUMBER \
  --voice-url https://rockcontrol.app/api/voice/incoming-call \
  --voice-method POST
```

Replace `YOUR_PHONE_NUMBER` with your Twilio number (e.g., +1234567890)

### 2. Configure ElevenLabs Custom Tools

Rock Control provides two custom API tools that ElevenLabs uses to fetch forms and submit responses:

#### Tool 1: Get Form Questions

**Purpose:** Fetches available form questions for the AI to ask

**Configuration:**
- **Name:** Get Form Questions
- **Description:** "Retrieves the list of questions for a specific form type"
- **Method:** GET
- **URL:** `https://rockcontrol.app/api/voice/forms/{formType}`

**Path Parameters:**
- **formType** (string, required): The type of form (e.g., "incident-report", "take-5", "crew-briefing")

**Available Form Types:**
- `incident-report` - Incident/Near Miss Report
- `take-5` - Take-5 Safety Assessment
- `crew-briefing` - Daily Crew Briefing
- `risk-control-plan` - Risk Control Plan
- `permit-to-work` - Permit to Work

**Response Example:**
```json
{
  "formType": "incident-report",
  "formName": "Incident Report",
  "description": "Report safety incidents and near misses",
  "questions": [
    {
      "id": "incident_date",
      "label": "When did the incident occur?",
      "type": "date",
      "required": true
    },
    {
      "id": "incident_location",
      "label": "Where did the incident happen?",
      "type": "text",
      "required": true
    }
  ]
}
```

#### Tool 2: Submit Form

**Purpose:** Saves completed form responses to the database

**Configuration:**
- **Name:** Submit Form
- **Description:** "Submits completed form data with caller information"
- **Method:** POST
- **URL:** `https://rockcontrol.app/api/voice/forms/submit`
- **Execution Mode:** Immediate
- **Response Timeout:** 20 seconds

**Body Parameters:**

1. **formtype** (string, required)
   - Description: "Form type being submitted"
   - Example: "incident-report"

2. **formdata** (object, required)
   - Description: "JSON object containing all the user's responses"
   - Properties:
     - **responses** (string, required)
       - Description: "JSON string containing all form responses"
       - Example: `"{\"incident_date\":\"2025-11-16\",\"incident_location\":\"Drill Site 3\"}"`

3. **caller_phone** (string, required)
   - Description: "The phone number of the person calling"
   - Example: "+6435672557"

**Request Body Example:**
```json
{
  "formtype": "incident-report",
  "formdata": {
    "responses": "{\"incident_date\":\"2025-11-16\",\"incident_location\":\"Drill Site 3\",\"incident_description\":\"Near miss with equipment\"}"
  },
  "caller_phone": "+6435672557"
}
```

**Response Example:**
```json
{
  "success": true,
  "formCode": "VOICE-INCIDENT-REPORT-1731772800000",
  "message": "Form submitted successfully",
  "confirmationSent": true
}
```

### 3. Configure ElevenLabs Webhooks

Rock Control provides webhook endpoints that ElevenLabs calls during the conversation lifecycle:

#### Webhook 1: Conversation Initiation

**Purpose:** Provides context to the AI when a call starts

**Configuration in ElevenLabs Dashboard:**
- **Name:** Conversation Initiation Client Data
- **URL:** `https://rockcontrol.app/api/elevenlabs/conversation-start`
- **Method:** POST
- **When:** Called when a conversation begins

**Response Format:**
```json
{
  "available_forms": [
    {
      "type": "incident-report",
      "name": "Incident Report",
      "description": "Report safety incidents and near misses"
    },
    {
      "type": "take-5",
      "name": "Take-5 Safety Assessment",
      "description": "Pre-work safety check"
    }
  ],
  "organization": "Rock Control",
  "greeting_context": "You are a safety assistant for Rock Control...",
  "phone_number": "+64211234567"
}
```

#### Webhook 2: Post-Call Summary

**Purpose:** Receives call transcript and metadata after conversation ends

**Configuration in ElevenLabs Dashboard:**
- **Name:** Post-call Webhook
- **URL:** `https://rockcontrol.app/api/elevenlabs/conversation-end`
- **Method:** POST
- **When:** Called after a conversation completes

**Received Data:**
- `call_id` - Unique identifier for the call
- `transcript` - Full conversation transcript
- `duration_seconds` - Call duration
- `caller_phone_number` - Caller's phone number
- `agent_id` - ElevenLabs agent ID
- `metadata` - Additional call metadata

**Response:**
```json
{
  "success": true,
  "message": "Call data logged successfully",
  "call_id": "xyz123"
}
```

### 4. Test the Integration

1. Call **+64 3 567 2557** from your mobile phone
2. You should hear: *"Welcome to Rock Control. Please choose a form to complete..."*
3. Say one of the following:
   - "Incident report" - for safety incidents
   - "Take five" - for pre-work safety checks
   - "Variation" - for project variations
   - "Crew briefing" - for daily briefings

4. The system will guide you through the form questions
5. After completion, you'll receive an SMS confirmation

## How It Works

```
┌─────────────┐      ┌──────────┐      ┌─────────────┐      ┌──────────────┐
│   Worker    │──────│  Twilio  │──────│ Rock Control│──────│  ElevenLabs  │
│ (Phone Call)│      │  Voice   │      │   Server    │      │  AI Voice    │
└─────────────┘      └──────────┘      └─────────────┘      └──────────────┘
       │                    │                   │                     │
       │   1. Call Number   │                   │                     │
       ├───────────────────►│                   │                     │
       │                    │  2. Webhook       │                     │
       │                    ├──────────────────►│                     │
       │                    │  3. TwiML         │                     │
       │                    │◄──────────────────┤                     │
       │  4. Voice Prompt   │                   │                     │
       │◄───────────────────┤                   │                     │
       │  5. Say "Incident" │                   │                     │
       ├───────────────────►│  6. Speech Text   │                     │
       │                    ├──────────────────►│  7. Get Questions   │
       │                    │                   ├────────────────────►│
       │                    │  8. WebSocket     │  9. AI Responses    │
       │                    │◄─────────────────►│◄───────────────────►│
       │  10. AI Questions  │                   │                     │
       │◄───────────────────┤                   │                     │
       │  11. Worker Answers│                   │                     │
       ├───────────────────►│                   │                     │
       │                    │ 12. Save Form     │                     │
       │                    │  ─────────────────►│                     │
       │                    │                   │                     │
       │  13. SMS Receipt   │                   │                     │
       │◄───────────────────┤                   │                     │
```

## API Endpoints

### Twilio Voice Webhooks
- `POST /api/voice/incoming-call` - Initial call webhook that starts the conversation

### ElevenLabs Custom Tools (AI Agent API)
- `GET /api/voice/forms/:formType` - Fetch form questions for a specific form type
- `POST /api/voice/forms/submit` - Submit completed form with responses

### ElevenLabs Webhooks (Conversation Lifecycle)
- `POST /api/elevenlabs/conversation-start` - Provides initial context when call begins
- `POST /api/elevenlabs/conversation-end` - Receives transcript and metadata when call ends

### WebSocket
- `wss://[your-domain]/api/voice/media-stream` - Real-time audio streaming between Twilio and ElevenLabs

## Environment Variables

The following secrets are already configured in Replit:

- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token  
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number
- `ELEVENLABS_API_KEY` - Your ElevenLabs API key

## Troubleshooting

### Call Doesn't Connect
- Verify webhook URL is set correctly in Twilio Console
- Ensure it's HTTPS (not HTTP)
- Check that the application is running

### No Voice Response
- Check workflow logs in Replit
- Verify Twilio credentials are correct
- Make sure phone number is configured for voice

### SMS Not Sending
- Verify `TWILIO_PHONE_NUMBER` is correct
- Check Twilio Console for messaging errors
- Ensure SMS is enabled for your Twilio number

### Form Not Saving
- Check application logs for errors
- Verify database is connected
- Ensure user exists in system

## Next Steps

1. **Configure your Twilio phone number** using the instructions above
2. **Test the integration** by calling your number
3. **Review saved forms** in the Rock Control dashboard

## Future Enhancements

- [ ] User authentication via phone number
- [ ] Multi-language support
- [ ] Voice signature capture
- [ ] Real-time transcription display
- [ ] Custom voice prompts per organization
- [ ] Integration with Microsoft Teams for notifications

## Support

For issues or questions:
1. Check workflow logs in Replit
2. Review Twilio debugger for call logs
3. Contact TacEdge support

---

**Deployment URL:** https://rockcontrol.app

**Voice Webhook:** https://rockcontrol.app/api/voice/incoming-call
