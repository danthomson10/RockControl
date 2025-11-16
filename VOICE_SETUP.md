# Voice Form Filling Setup Guide

Rock Control supports voice-based form completion where workers call **+64 3 567 2557** and an AI assistant guides them through safety forms using natural conversation.

## Architecture

**Twilio → Rock Control Proxy → ElevenLabs**

1. Worker calls +64 3 567 2557 (Twilio number)
2. Twilio webhook returns TwiML with `<Connect><Stream>` pointing to Rock Control WebSocket proxy
3. Rock Control proxy authenticates with ElevenLabs using API key (server-side, secure)
4. Audio streams bidirectionally: Twilio ↔ Rock Control Proxy ↔ ElevenLabs
5. ElevenLabs AI uses custom tools to fetch forms and submit responses
6. Form saved to Rock Control database

**Why a proxy?**
- ✅ Keeps API keys server-side (never exposed to Twilio network)
- ✅ Handles authentication with ElevenLabs securely
- ✅ Enables bidirectional audio streaming between Twilio and ElevenLabs
- ✅ Provides a single integration point for monitoring and debugging

## Features

✅ Call a phone number to fill out forms via voice  
✅ AI-powered conversation guides users through form questions  
✅ Real-time audio streaming between Twilio and ElevenLabs  
✅ Supports all form types: Incident Reports, Take-5, Crew Briefings, etc.  
✅ Automatic form submission to database  

## Setup Instructions

### 1. Configure Twilio TwiML App

Your Twilio number **+6435672557** must use the **"ElevenLabs Stream"** TwiML App:

**Via Twilio Console:**

1. Go to [Twilio Console → Voice → TwiML Apps](https://console.twilio.com/us1/develop/voice/manage/twiml-apps)
2. Find or create **"ElevenLabs Stream"** TwiML App
3. Set **Voice Request URL:** `https://rockcontrol.app/api/voice/incoming-call`
4. Set **HTTP Method:** POST
5. Save the TwiML App
6. Go to [Phone Numbers → Active Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
7. Click **+6435672557**
8. Under **Voice Configuration**, select **TwiML App: ElevenLabs Stream**
9. Save configuration

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
  "message": "Form submitted successfully"
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
2. The ElevenLabs AI assistant will greet you
3. Tell the AI which form you want to complete:
   - "Incident report" - for safety incidents
   - "Take five" - for pre-work safety checks
   - "Variation" - for project variations
   - "Crew briefing" - for daily briefings
4. The AI will guide you through the form questions
5. Your responses are automatically saved to the database

## How It Works

```
┌─────────────┐     ┌──────────┐     ┌─────────────────┐     ┌──────────────┐
│   Worker    │─────│  Twilio  │─────│  Rock Control   │─────│  ElevenLabs  │
│ (Phone Call)│     │  Number  │     │  WS Proxy       │     │  AI Agent    │
└─────────────┘     └──────────┘     └─────────────────┘     └──────────────┘
       │                   │                   │                      │
       │  1. Dial Number   │                   │                      │
       ├──────────────────►│                   │                      │
       │                   │ 2. POST /incoming │                      │
       │                   ├──────────────────►│                      │
       │                   │ 3. TwiML <Stream> │                      │
       │                   │◄──────────────────┤                      │
       │                   │                   │                      │
       │                   │ 4. Connect WebSocket to Proxy            │
       │                   ├──────────────────►│                      │
       │                   │                   │ 5. Auth & Connect    │
       │                   │                   ├─────────────────────►│
       │                   │                   │                      │
       │  6. AI Greeting   │                   │                      │
       │◄──────────────────┤◄──────────────────┤◄─────────────────────┤
       │                   │                   │                      │
       │  7. Speak         │                   │                      │
       ├──────────────────►├──────────────────►├─────────────────────►│
       │                   │                   │ 8. GET /forms/:type  │
       │                   │                   │◄─────────────────────┤
       │                   │                   │ 9. Return questions  │
       │                   │                   ├─────────────────────►│
       │                   │                   │                      │
       │  10. AI Asks      │                   │                      │
       │◄──────────────────┤◄──────────────────┤◄─────────────────────┤
       │  11. Answers      │                   │                      │
       ├──────────────────►├──────────────────►├─────────────────────►│
       │                   │                   │ 12. POST /submit     │
       │                   │                   │◄─────────────────────┤
       │                   │                   │ 13. Save to DB       │
       │                   │                   │                      │
       │  14. Confirmation │                   │                      │
       │◄──────────────────┤◄──────────────────┤◄─────────────────────┤
```

## API Endpoints

### Twilio Voice Webhooks
- `POST /api/voice/incoming-call` - Returns TwiML to stream call to WebSocket proxy

### WebSocket Proxy
- `wss://rockcontrol.app/api/voice/media-stream` - Bidirectional audio proxy between Twilio and ElevenLabs
  - Authenticates with ElevenLabs using server-side API key
  - Forwards audio: Twilio ↔ ElevenLabs
  - Manages call sessions

### ElevenLabs Custom Tools (AI Agent API)
- `GET /api/voice/forms/:formType` - Fetch form questions for a specific form type
- `POST /api/voice/forms/submit` - Submit completed form with responses

### ElevenLabs Webhooks (Conversation Lifecycle)
- `POST /api/elevenlabs/conversation-start` - Provides initial context when call begins
- `POST /api/elevenlabs/conversation-end` - Receives transcript and metadata when call ends

## Environment Variables

The following secrets are configured in Replit:

- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token  
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number (+6435672557)
- `ELEVENLABS_API_KEY` - Your ElevenLabs API key
- `ELEVENLABS_AGENT_ID` - Your ElevenLabs agent ID (agent_8401k9xb1dypexrtqt8n6g8zmtga)

## ElevenLabs Agent Configuration

**Critical Settings in ElevenLabs Dashboard:**

### 1. Audio Format ⚠️
**Input Audio Format**: PCM 8000 Hz
- ✅ This MUST match Twilio's output format (no transcoding needed)
- ❌ Do NOT use 16 kHz - will cause audio compatibility issues

### 2. Custom Tools (API Integration)
Configure these tools in your ElevenLabs agent:

**Get Form Questions**
- Name: `get_form_questions`
- Method: GET
- URL: `https://rockcontrol.app/api/voice/forms/{formType}`
- Description: "Fetch questions for a specific form type (e.g., take-5, crew-briefing)"

**Submit Form**
- Name: `submit_form`
- Method: POST
- URL: `https://rockcontrol.app/api/voice/forms/submit`
- Body: JSON with `formtype`, `formdata`, `caller_phone`
- Description: "Submit completed form with user responses"

### 3. Webhooks
Configure these webhooks in your ElevenLabs agent:

**Conversation Start**
- URL: `https://rockcontrol.app/api/elevenlabs/conversation-start`
- Sends: Call ID, metadata when conversation begins

**Conversation End**
- URL: `https://rockcontrol.app/api/elevenlabs/conversation-end`
- Sends: Call ID, transcript, duration, metadata when conversation ends

## Troubleshooting

### Call Doesn't Connect
- Verify TwiML App "ElevenLabs Stream" is assigned to +6435672557
- Check that webhook URL is `https://rockcontrol.app/api/voice/incoming-call`
- Ensure it's HTTPS (not HTTP)
- Check that the application is running

### No AI Response
- Check workflow logs in Replit for errors
- Verify `ELEVENLABS_API_KEY` is set correctly
- Verify `ELEVENLABS_AGENT_ID` is set correctly
- Check ElevenLabs dashboard for agent status

### Audio Quality Issues
- Check network connectivity
- Verify Twilio number supports voice streaming
- Check ElevenLabs service status

### Form Not Saving
- Check application logs for errors
- Verify database is connected
- Check that custom tools are configured in ElevenLabs dashboard
- Verify tool URLs are correct (https://rockcontrol.app/api/voice/...)

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
