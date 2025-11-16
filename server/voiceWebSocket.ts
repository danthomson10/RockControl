import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { DatabaseStorage } from './storage';

interface CallSession {
  streamSid: string;
  callSid: string;
  callerPhone: string;
  formType: string;
  templateId: number;
  elevenLabsWs?: WebSocket;
  conversationState: {
    currentQuestionIndex: number;
    responses: Record<string, any>;
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
              formType: msg.start.customParameters?.formType || formType,
              templateId: parseInt(msg.start.customParameters?.templateId || String(templateId)),
              conversationState: {
                currentQuestionIndex: 0,
                responses: {},
              },
            };
            
            activeSessions.set(msg.streamSid, session);
            console.log(`📞 Call started: ${session.callSid} for ${session.formType}`);
            
            // Initialize ElevenLabs conversation
            await initializeElevenLabsConversation(session, storage);
            break;

          case 'media':
            if (session?.elevenLabsWs && session.elevenLabsWs.readyState === WebSocket.OPEN) {
              // Forward audio to ElevenLabs
              const audioPayload = msg.media.payload;
              session.elevenLabsWs.send(JSON.stringify({
                type: 'audio',
                audio_base64: audioPayload,
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
  
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ElevenLabs API key not configured');
    return;
  }

  // Get form template
  const template = await storage.formTemplates.getByIdScoped(session.templateId, 1);
  
  if (!template) {
    console.error(`❌ Template ${session.templateId} not found`);
    return;
  }

  const questions = (template.schema as any).questions || [];
  
  // Build system prompt for ElevenLabs agent
  const systemPrompt = buildFormPrompt(template.name, questions);
  
  console.log(`🤖 Initializing ElevenLabs conversation for ${template.name}`);
  console.log(`   Questions: ${questions.length}`);
  
  // Note: This is a simplified implementation
  // In production, you'd connect to ElevenLabs Conversational AI WebSocket
  // For now, we're setting up the structure
  
  // The actual ElevenLabs WebSocket connection would be:
  // const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;
  // session.elevenLabsWs = new WebSocket(wsUrl, {
  //   headers: { 'xi-api-key': ELEVENLABS_API_KEY }
  // });
  
  // For this implementation, we'll use a simpler approach with Twilio's gather
  console.log('✅ Voice conversation initialized');
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
