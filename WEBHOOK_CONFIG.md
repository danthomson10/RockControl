# Rock Control - External Service Webhook Configuration

This document lists all webhook and API endpoints that need to be configured in external services (Twilio, ElevenLabs).

## Current Environment URLs

### Development URL
```
https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev
```

### Production URL (when deployed)
```
https://rockcontrol.app
```

---

## Twilio Configuration

### Phone Number: +6435672557

**Voice & Fax → Configure With → Webhooks, TwiML Bins, Functions, Studio, or Proxy**

**When a call comes in:**
- Method: `POST`
- URL (Dev): 
  ```
  https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev/api/voice/incoming-call
  ```
- URL (Prod):
  ```
  https://rockcontrol.app/api/voice/incoming-call
  ```

**Behavior:** Returns TwiML with WebSocket stream configuration

---

## ElevenLabs Configuration

### Agent ID: agent_8401k9xb1dypexrtqt8n6g8zmtga

### Custom Tools (API Endpoints)

#### Tool 1: get_form_questions
- **Name**: `get_form_questions`
- **Method**: `GET`
- **URL (Dev)**:
  ```
  https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev/api/voice/forms/{formType}
  ```
- **URL (Prod)**:
  ```
  https://rockcontrol.app/api/voice/forms/{formType}
  ```
- **Parameters**: 
  - `formType` (path parameter): e.g., "take-5", "crew-briefing", "permit-to-work"

#### Tool 2: submit_form
- **Name**: `submit_form`
- **Method**: `POST`
- **URL (Dev)**:
  ```
  https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev/api/voice/forms/submit
  ```
- **URL (Prod)**:
  ```
  https://rockcontrol.app/api/voice/forms/submit
  ```
- **Body** (JSON):
  ```json
  {
    "formType": "take-5",
    "formData": { /* form field values */ },
    "callerPhone": "+64211782272"
  }
  ```

### Webhooks

#### Conversation Start
- **Event**: Conversation Start
- **URL (Dev)**:
  ```
  https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev/api/elevenlabs/conversation-start
  ```
- **URL (Prod)**:
  ```
  https://rockcontrol.app/api/elevenlabs/conversation-start
  ```

#### Conversation End
- **Event**: Conversation End
- **URL (Dev)**:
  ```
  https://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev/api/elevenlabs/conversation-end
  ```
- **URL (Prod)**:
  ```
  https://rockcontrol.app/api/elevenlabs/conversation-end
  ```

---

## Audio Format Configuration

### ElevenLabs Agent Settings

**User Input Audio Format:**
- Set to: `PCM 8000 Hz`

**NOTE:** There is no "Agent Output Audio Format" setting in the ElevenLabs dashboard. The output format is controlled via the WebSocket connection URL parameter (`output_format=ulaw_8000`), which is handled automatically by the Rock Control backend.

---

## Internal WebSocket (DO NOT configure in external services)

The following WebSocket is internal to Rock Control and handled automatically:

```
wss://9e9b0ef3-677f-419a-bd18-1f4d09a01450-00-k6il9sck2lxx.picard.replit.dev/api/voice/media-stream
```

This endpoint:
- Receives audio streams from Twilio
- Connects to ElevenLabs Conversational AI with `output_format=ulaw_8000`
- Forwards audio bidirectionally between Twilio and ElevenLabs
- No external configuration needed

---

## Checklist for URL Updates

When switching between Dev and Production environments:

### Twilio
- [ ] Update "When a call comes in" webhook URL

### ElevenLabs
- [ ] Update `get_form_questions` tool URL
- [ ] Update `submit_form` tool URL
- [ ] Update "Conversation Start" webhook URL
- [ ] Update "Conversation End" webhook URL

---

## Testing

After configuring all webhooks:

1. **Call the number**: +6435672557
2. **Expected behavior**:
   - AI agent answers: "Hi, hope you're having a great day - are you ready to do a site inspection?"
   - You can speak and the AI responds
   - AI can ask form questions and submit data to Rock Control
3. **Check logs** for audio streaming confirmation:
   - `🔊 Forwarding audio chunk to Twilio`
   - `🎤 User said: [transcript]`
