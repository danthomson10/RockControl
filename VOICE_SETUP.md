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
     - **Webhook URL:** `https://rock-control-web-app-danthomson10.replit.app/api/voice/incoming-call`
     - **HTTP Method:** POST
5. Click **Save Configuration**

**Option B: Via Twilio CLI (Terminal)**

```bash
twilio phone-numbers:update YOUR_PHONE_NUMBER \
  --voice-url https://rock-control-web-app-danthomson10.replit.app/api/voice/incoming-call \
  --voice-method POST
```

Replace `YOUR_PHONE_NUMBER` with your Twilio number (e.g., +1234567890)

### 2. Test the Integration

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

### Voice Webhooks
- `POST /api/voice/incoming-call` - Initial call webhook
- `POST /api/voice/handle-form-selection` - Process form type selection
- `POST /api/voice/save-form` - Save voice-completed form data

### WebSocket
- `wss://[your-domain]/api/voice/media-stream` - Real-time audio streaming

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

**Deployment URL:** https://rock-control-web-app-danthomson10.replit.app

**Voice Webhook:** https://rock-control-web-app-danthomson10.replit.app/api/voice/incoming-call
