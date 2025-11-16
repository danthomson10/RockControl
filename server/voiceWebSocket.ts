import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { DatabaseStorage } from './storage';

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

  wss.on('connection', (ws, req) => {
    console.log('📞 New call connection');
    
    const url = new URL(req.url!, `ws://${req.headers.host}`);
    const formType = url.searchParams.get('formType') || '';
    const templateId = parseInt(url.searchParams.get('templateId') || '0');
    
    let session: CallSession | null = null;

    ws.on('message', async (message: Buffer) => {
      try {
        const msg = JSON.parse(message.toString());

        switch (msg.event) {
          case 'start':
            session = {
              streamSid: msg.streamSid,
              callSid: msg.start.callSid,
              callerPhone: msg.start.customParameters?.callerPhone || 'unknown',
              formType: msg.start.customParameters?.formType || '',
              templateId: parseInt(msg.start.customParameters?.templateId || '0'),
              twilioWs: ws,
              conversationState: {
                currentQuestionIndex: 0,
                responses: {},
              },
            };
            
            activeSessions.set(msg.streamSid, session);
            console.log(`📞 Call started: ${session.callSid}`);
            
            // Initialize ElevenLabs conversation
            await initializeElevenLabsConversation(session, storage);
            break;

          case 'media':
            if (session?.elevenLabsWs && session.elevenLabsWs.readyState === WebSocket.OPEN) {
              // Forward audio from Twilio to ElevenLabs
              // Twilio sends base64-encoded μ-law audio in msg.media.payload
              session.elevenLabsWs.send(JSON.stringify({
                user_audio_chunk: msg.media.payload,
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

    ws.on('close', (code, reason) => {
      console.log(`📞 Twilio connection closed - Code: ${code}, Reason: ${reason.toString()}`);
      if (code === 1006 || code === 1011) {
        console.error(`⚠️ Twilio close code ${code} - likely audio format mismatch!`);
      }
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
    // Connect to ElevenLabs Conversational AI WebSocket with Twilio-compatible audio
    // Using ulaw_8000 (μ-law 8kHz) which Twilio media streams expect
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}&output_format=ulaw_8000`;
    
    console.log(`🔗 Connecting to: ${wsUrl}`);
    
    session.elevenLabsWs = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    session.elevenLabsWs.on('open', () => {
      console.log('✅ ElevenLabs connection established');
      // Connection is ready - ElevenLabs will start the conversation
    });

    session.elevenLabsWs.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Log all message types for debugging
        if (message.type !== 'audio' && message.type !== 'ping') {
          console.log('📨 ElevenLabs message:', message.type, message);
        }
        
        // Handle different message types from ElevenLabs
        switch (message.type) {
          case 'audio':
            // Forward audio from ElevenLabs back to Twilio
            const audioData = message.audio;
            if (audioData && session.twilioWs?.readyState === WebSocket.OPEN) {
              console.log(`🔊 Sending audio to Twilio – length: ${audioData.length}`);
              session.twilioWs.send(JSON.stringify({
                event: 'media',
                streamSid: session.streamSid,
                media: {
                  payload: audioData,
                },
              }));
            } else if (!audioData) {
              console.warn('⚠️ Audio message received but no audio data found:', JSON.stringify(message, null, 2));
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
            // Respond to keep-alive
            session.elevenLabsWs?.send(JSON.stringify({ type: 'pong' }));
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
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
    });

    session.elevenLabsWs.on('close', (code, reason) => {
      console.log(`🔌 ElevenLabs connection closed - Code: ${code}, Reason: ${reason.toString()}`);
      if (code !== 1000) {
        console.error(`⚠️ Abnormal close code: ${code}`);
      }
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
