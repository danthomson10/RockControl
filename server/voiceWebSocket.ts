import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { DatabaseStorage } from './storage';

// Token validation - imported from voice.ts module scope
// We'll validate tokens via HTTP endpoint since we can't directly access the Map
async function validateCallToken(token: string, host: string): Promise<{ valid: boolean; callerPhone?: string }> {
  try {
    const response = await fetch(`http://${host}/api/voice/validate-token/${token}`);
    return await response.json();
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false };
  }
}

interface CallSession {
  streamSid: string;
  callSid: string;
  callerPhone: string;
  formType: string;
  templateId: number;
  twilioWs?: WebSocket;
  elevenLabsWs?: WebSocket;
  conversationState: {
    currentQuestionIndex: number;
    responses: Record<string, any>;
    transcript?: any[];
    userTranscript?: string[];
  };
}

const activeSessions = new Map<string, CallSession>();

export function setupVoiceWebSocket(server: Server, storage: DatabaseStorage) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/voice/media-stream'
  });

  wss.on('connection', async (ws, req) => {
    console.log('📞 New call connection attempt');
    
    // Extract and validate call token from WebSocket URL
    const url = new URL(req.url!, `ws://${req.headers.host}`);
    const callToken = url.searchParams.get('token');
    
    if (!callToken) {
      console.log('❌ WebSocket connection denied: missing token');
      ws.close(1008, 'Missing authentication token');
      return;
    }
    
    // Validate token and get trusted caller phone
    const tokenValidation = await validateCallToken(callToken, req.headers.host || 'localhost:5000');
    if (!tokenValidation.valid || !tokenValidation.callerPhone) {
      console.log('❌ WebSocket connection denied: invalid or expired token');
      ws.close(1008, 'Invalid or expired authentication token');
      return;
    }
    
    const trustedCallerPhone = tokenValidation.callerPhone;
    console.log('✅ WebSocket authenticated for:', trustedCallerPhone);
    
    // Extract formType and templateId from WebSocket URL query params (set by Twilio webhook config)
    const trustedFormType = url.searchParams.get('formType') || '';
    const trustedTemplateId = parseInt(url.searchParams.get('templateId') || '0');
    
    let session: CallSession | null = null;

    ws.on('message', async (message: Buffer) => {
      try {
        const msg = JSON.parse(message.toString());

        switch (msg.event) {
          case 'start':
            // Use trusted caller phone from validated token, NOT from Twilio message (which could be spoofed)
            session = {
              streamSid: msg.streamSid,
              callSid: msg.start.callSid,
              callerPhone: trustedCallerPhone,
              formType: trustedFormType,
              templateId: trustedTemplateId,
              twilioWs: ws,
              conversationState: {
                currentQuestionIndex: 0,
                responses: {},
              },
            };
            
            activeSessions.set(msg.streamSid, session);
            console.log(`📞 Call started: ${session.callSid} from ${trustedCallerPhone}`);
            
            // Authorize caller by phone number
            const phoneAuth = await storage.userPhoneNumbers.getByPhoneNumber(trustedCallerPhone);
            if (!phoneAuth || !phoneAuth.verified || !phoneAuth.allowVoiceAccess) {
              console.log(`❌ Unauthorized phone number: ${trustedCallerPhone}`);
              ws.close();
              activeSessions.delete(msg.streamSid);
              return;
            }
            
            // Check if user is active
            if (!phoneAuth.user.active) {
              console.log(`❌ Inactive user: ${phoneAuth.user.email}`);
              ws.close();
              activeSessions.delete(msg.streamSid);
              return;
            }
            
            // Check if caller is allowed to access requested form type
            if (phoneAuth.allowedFormTypes && phoneAuth.allowedFormTypes.length > 0) {
              // If form restrictions exist, formType MUST be provided and MUST be in allowed list
              if (!trustedFormType || !phoneAuth.allowedFormTypes.includes(trustedFormType)) {
                console.log(`❌ Form type '${trustedFormType || 'missing'}' not allowed for ${phoneAuth.user.email}`);
                ws.close();
                activeSessions.delete(msg.streamSid);
                return;
              }
            }
            
            console.log(`✅ Authorized caller: ${phoneAuth.user.name} (${phoneAuth.user.email}, role: ${phoneAuth.user.role})`);
            
            // Initialize ElevenLabs conversation
            await initializeElevenLabsConversation(session, storage);
            break;

          case 'media':
            if (session?.elevenLabsWs && session.elevenLabsWs.readyState === WebSocket.OPEN) {
              // Forward audio from Twilio to ElevenLabs
              const audioPayload = msg.media.payload;
              session.elevenLabsWs.send(JSON.stringify({
                user_audio_chunk: audioPayload,
              }));
            }
            break;

          case 'stop':
            console.log(`📞 Call ended: ${msg.streamSid}`);
            if (session?.elevenLabsWs) {
              session.elevenLabsWs.close();
            }
            activeSessions.delete(msg.streamSid);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('📞 Call connection closed');
      if (session) {
        if (session.elevenLabsWs) {
          session.elevenLabsWs.close();
        }
        activeSessions.delete(session.streamSid);
      }
    });
  });

  console.log('🎙️ Voice WebSocket server initialized');
}

async function initializeElevenLabsConversation(
  session: CallSession,
  storage: DatabaseStorage
) {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_8401k9xb1dypexrtqt8n6g8zmtga';
  
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ElevenLabs API key not configured');
    return;
  }

  console.log(`🤖 Connecting to ElevenLabs agent: ${ELEVENLABS_AGENT_ID}`);
  
  try {
    // Connect to ElevenLabs Conversational AI WebSocket with Twilio-compatible audio format
    // Using ulaw_8000 (μ-law, 8 kHz) which Twilio media streams expect
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}&output_format=ulaw_8000`;
    
    session.elevenLabsWs = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    session.elevenLabsWs.on('open', () => {
      console.log('✅ ElevenLabs connection established');
      
      // Send initial conversation context
      session.elevenLabsWs?.send(JSON.stringify({
        type: 'conversation_initiation_client_data',
        conversation_initiation_client_data: {
          caller_phone: session.callerPhone,
          form_type: session.formType,
        }
      }));
    });

    session.elevenLabsWs.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Log all message types for debugging (including audio for now)
        if (message.type !== 'ping') {
          console.log('📨 ElevenLabs message:', message.type, 
            message.type === 'audio' ? '(audio chunk received)' : JSON.stringify(message, null, 2));
        }
        
        // Handle different message types from ElevenLabs
        switch (message.type) {
          case 'audio':
            // Forward audio from ElevenLabs back to Twilio
            // ElevenLabs uses audio_base_64 (with underscores), not audio_base64
            const audioData = message.audio_event?.audio_base_64 || 
                            message.audio_event?.audio_base64 || 
                            message.audio_base64 || 
                            message.audio_base_64;
            
            if (audioData && session.twilioWs?.readyState === WebSocket.OPEN) {
              console.log('🔊 Forwarding audio chunk to Twilio');
              session.twilioWs.send(JSON.stringify({
                event: 'media',
                streamSid: session.streamSid,
                media: {
                  payload: audioData,
                },
              }));
            } else {
              console.log('⚠️ Audio message received but no audio data found:', Object.keys(message));
            }
            break;
            
          case 'transcript':
            // Capture transcript for the session
            console.log('📝 Transcript:', message.transcript);
            if (!session.conversationState.transcript) {
              session.conversationState.transcript = [];
            }
            session.conversationState.transcript.push(message.transcript);
            break;
            
          case 'tool_call':
            // ElevenLabs is calling our API tools (e.g., form submission)
            console.log('🔧 Tool call:', message.tool_name, message.parameters);
            break;
            
          case 'agent_response':
            // AI agent's text response (before it's converted to speech)
            const agentText = message.agent_response_event?.agent_response || message.response;
            console.log('💬 Agent says:', agentText);
            break;
            
          case 'user_transcript':
            // User's spoken words transcribed
            console.log('🎤 User said:', message.user_transcript);
            if (!session.conversationState.userTranscript) {
              session.conversationState.userTranscript = [];
            }
            session.conversationState.userTranscript.push(message.user_transcript);
            break;
            
          case 'interruption':
            console.log('🔇 User interrupted');
            break;
            
          case 'ping':
            // Respond to keep-alive with matching event_id
            const pingEventId = message.ping_event?.event_id;
            session.elevenLabsWs?.send(JSON.stringify({ 
              type: 'pong',
              event_id: pingEventId
            }));
            break;
            
          default:
            // Log unknown message types to help with debugging
            console.log('❓ Unknown ElevenLabs message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing ElevenLabs message:', error);
      }
    });

    session.elevenLabsWs.on('error', (error) => {
      console.error('❌ ElevenLabs WebSocket error:', error);
    });

    session.elevenLabsWs.on('close', () => {
      console.log('🔌 ElevenLabs connection closed');
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to ElevenLabs:', error);
  }
}

function buildFormPrompt(formName: string, questions: any[]): string {
  let prompt = `You are a helpful assistant helping a construction worker complete a ${formName} form over the phone.\n\n`;
  prompt += `Ask each question clearly and wait for their response. Be conversational and friendly.\n\n`;
  prompt += `Questions to ask:\n`;
  
  questions.forEach((q, idx) => {
    prompt += `${idx + 1}. ${q.label}`;
    if (q.required) prompt += ' (Required)';
    if (q.options) prompt += ` - Options: ${q.options.join(', ')}`;
    prompt += '\n';
  });
  
  prompt += `\nAfter collecting all responses, confirm the information with the user and ask if they want to submit the form.`;
  
  return prompt;
}
