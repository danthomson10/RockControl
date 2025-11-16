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
        source: 'voice',
        formData: responses,
        status: 'pending',
        submittedById: 1, // System user for voice submissions
      });
      
      console.log('✅ Voice form saved:', formCode);
      
      res.json({ 
        success: true,
        formCode,
        message: 'Form submitted successfully'
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

  // Twilio Webhook: Incoming calls - Stream to WebSocket proxy
  app.post('/api/voice/incoming-call', (req, res) => {
    try {
      const twiml = new VoiceResponse();
      
      console.log('📞 Incoming call from:', req.body.From);
      console.log('🎙️ Streaming to ElevenLabs proxy');
      
      // Connect and stream audio to our WebSocket proxy
      // The proxy will handle ElevenLabs authentication securely
      const connect = twiml.connect();
      const stream = connect.stream({
        url: `wss://${req.get('host')}/api/voice/media-stream`,
      });
      
      // Pass caller info (but NOT API keys - those stay server-side)
      stream.parameter({ name: 'callerPhone', value: req.body.From || 'unknown' });
      
      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error: any) {
      console.error('Error in incoming-call webhook:', error);
      const twiml = new VoiceResponse();
      twiml.say('Sorry, there was an error connecting your call. Please try again later.');
      twiml.hangup();
      res.type('text/xml');
      res.send(twiml.toString());
    }
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
        source: 'voice',
        formData,
        status: 'pending',
        submittedById: 1,
      });
      
      res.json({ success: true, formCode });
    } catch (error: any) {
      console.error('Error saving voice form:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
