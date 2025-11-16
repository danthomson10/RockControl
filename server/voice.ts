import type { Router } from 'express';
import twilio from 'twilio';
import type { DatabaseStorage } from './storage';

const VoiceResponse = twilio.twiml.VoiceResponse;

export function setupVoiceRoutes(app: Router, storage: DatabaseStorage) {
  // ElevenLabs Custom Tool: Get form questions
  app.get('/api/voice/forms/:formType', async (req, res) => {
    try {
      const formType = req.params.formType;
      
      // Get all templates for organization 1 (default for voice calls)
      const templates = await storage.formTemplates.getByOrganization(1, false);
      const template = templates.find((t: any) => t.type === formType);
      
      if (!template) {
        return res.status(404).json({ 
          error: 'Form not found',
          availableFormTypes: templates.map((t: any) => t.type)
        });
      }
      
      // Format response for ElevenLabs
      const schema = template.schema as any;
      const questions = schema.questions || [];
      
      res.json({
        formType: template.type,
        formName: template.name,
        description: template.description,
        questions: questions.map((q: any) => ({
          id: q.id,
          label: q.label,
          type: q.fieldType,
          required: q.required || false,
          options: q.options || [],
          helpText: q.helpText || '',
        }))
      });
    } catch (error: any) {
      console.error('Error fetching form for ElevenLabs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ElevenLabs Custom Tool: Submit completed form
  app.post('/api/voice/forms/submit', async (req, res) => {
    try {
      const { formtype, formdata, caller_phone } = req.body;
      
      console.log('📞 Voice form submission received:', { formtype, caller_phone });
      
      // Parse the responses JSON string
      let responses;
      try {
        responses = typeof formdata.responses === 'string' 
          ? JSON.parse(formdata.responses)
          : formdata.responses;
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'Invalid responses format',
          detail: 'responses must be a valid JSON string or object'
        });
      }
      
      // Generate unique form code
      const formCode = `VOICE-${formtype.toUpperCase()}-${Date.now()}`;
      
      // Create form submission
      const form = await storage.forms.create({
        organizationId: 1,
        jobId: 1, // Default job for voice submissions
        formCode,
        type: formtype,
        formData: responses,
        status: 'submitted',
        submittedById: 1, // System user for voice submissions
        submittedAt: new Date(),
      });
      
      console.log('✅ Voice form saved:', formCode);
      
      // Send SMS confirmation
      try {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        
        await twilioClient.messages.create({
          body: `✅ Your ${formCode} has been submitted successfully via Rock Control Voice. Thank you for keeping our sites safe!`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: caller_phone,
        });
        
        console.log('📱 SMS confirmation sent to', caller_phone);
      } catch (smsError) {
        console.error('SMS error:', smsError);
        // Don't fail the request if SMS fails
      }
      
      res.json({ 
        success: true,
        formCode,
        message: 'Form submitted successfully',
        confirmationSent: true
      });
    } catch (error: any) {
      console.error('Error saving voice form:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ElevenLabs Webhook: Conversation Initiation
  app.post('/api/elevenlabs/conversation-start', async (req, res) => {
    try {
      console.log('🎙️ ElevenLabs conversation started:', req.body);
      
      // Get available form templates
      const templates = await storage.formTemplates.getByOrganization(1, false);
      
      // Format available forms for the AI agent
      const availableForms = templates.map((t: any) => ({
        type: t.type,
        name: t.name,
        description: t.description,
      }));
      
      // Return conversation initiation data
      res.json({
        available_forms: availableForms,
        organization: 'Rock Control',
        greeting_context: 'You are a safety assistant for Rock Control, helping field workers complete safety forms via voice. Be friendly, clear, and concise.',
        phone_number: req.body.caller_phone_number || 'unknown',
      });
    } catch (error: any) {
      console.error('Error in conversation-start webhook:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ElevenLabs Webhook: Post-call Summary
  app.post('/api/elevenlabs/conversation-end', async (req, res) => {
    try {
      const { 
        call_id,
        transcript,
        duration_seconds,
        caller_phone_number,
        agent_id,
        metadata 
      } = req.body;
      
      console.log('📞 ElevenLabs conversation ended:', {
        call_id,
        duration: duration_seconds,
        caller: caller_phone_number,
      });
      
      // Log the full conversation data
      console.log('📝 Transcript:', transcript);
      console.log('📊 Metadata:', metadata);
      
      // TODO: Store in call_logs table when implemented
      // For now, just acknowledge receipt
      
      res.json({ 
        success: true,
        message: 'Call data logged successfully',
        call_id,
      });
    } catch (error: any) {
      console.error('Error in conversation-end webhook:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook for incoming calls
  app.post('/api/voice/incoming-call', (req, res) => {
    const twiml = new VoiceResponse();
    
    twiml.say(
      { voice: 'alice' },
      'Welcome to Rock Control. Please choose a form to complete. Say incident report for safety incidents, or take five for pre-work safety checks.'
    );
    
    const gather = twiml.gather({
      input: ['speech'],
      action: '/api/voice/handle-form-selection',
      method: 'POST',
      speechTimeout: 3,
      language: 'en-US',
    });
    
    gather.say('What form would you like to complete?');
    
    res.type('text/xml');
    res.send(twiml.toString());
  });

  // Handle form selection
  app.post('/api/voice/handle-form-selection', async (req, res) => {
    const twiml = new VoiceResponse();
    const speechResult = req.body.SpeechResult?.toLowerCase() || '';
    
    let formType = '';
    if (speechResult.includes('incident')) {
      formType = 'incident-report';
    } else if (speechResult.includes('take') && speechResult.includes('five')) {
      formType = 'take-5';
    } else if (speechResult.includes('variation')) {
      formType = 'variation';
    } else if (speechResult.includes('crew')) {
      formType = 'crew-briefing';
    }
    
    if (!formType) {
      twiml.say("I didn't understand that. Please try again.");
      twiml.redirect('/api/voice/incoming-call');
    } else {
      // Get the form template
      try {
        const templates = await storage.formTemplates.getByOrganization(1, false);
        const template = templates.find((t: any) => t.type === formType);
        
        if (!template) {
          twiml.say(`Sorry, that form is not available. Please try another option.`);
          twiml.redirect('/api/voice/incoming-call');
        } else {
          // Connect to ElevenLabs WebSocket for conversational form filling
          const connect = twiml.connect();
          const stream = connect.stream({
            url: `wss://${req.get('host')}/api/voice/media-stream?formType=${formType}&templateId=${template.id}`,
          });
          
          stream.parameter({ name: 'callerPhone', value: req.body.From });
          stream.parameter({ name: 'formType', value: formType });
          stream.parameter({ name: 'templateId', value: template.id.toString() });
        }
      } catch (error) {
        console.error('Error fetching form template:', error);
        twiml.say('Sorry, there was an error. Please try again later.');
        twiml.hangup();
      }
    }
    
    res.type('text/xml');
    res.send(twiml.toString());
  });

  // Save voice-completed form data
  app.post('/api/voice/save-form', async (req, res) => {
    try {
      const { templateId, formData, callerPhone, jobId, formType } = req.body;
      
      // Create form submission
      const formCode = `VOICE-${Date.now()}`;
      
      await storage.forms.create({
        organizationId: 1,
        jobId: jobId || 1,
        formCode,
        type: formType || 'incident-report',
        formData,
        status: 'submitted',
        submittedById: 1,
        submittedAt: new Date(),
      });
      
      // Send SMS confirmation
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      await twilioClient.messages.create({
        body: `✅ Your ${formCode} has been submitted successfully. Thank you for using Rock Control.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: callerPhone,
      });
      
      res.json({ success: true, formCode });
    } catch (error: any) {
      console.error('Error saving voice form:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
