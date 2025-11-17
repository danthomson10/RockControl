import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse } from 'url';

interface BrowserSession {
  browserWs: WebSocket;
  elevenLabsWs?: WebSocket;
  userId: number;
  formType: string;
}

const activeSessions = new Map<string, BrowserSession>();

export function setupElevenLabsBrowserProxy(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true 
  });

  // Handle upgrade requests
  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const { pathname } = parse(request.url || '');
    
    if (pathname === '/api/voice/browser-websocket') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (browserWs: WebSocket, request: IncomingMessage) => {
    console.log('🌐 Browser WebSocket connected');
    
    const url = parse(request.url || '', true);
    const sessionId = Math.random().toString(36).substring(7);
    
    const session: BrowserSession = {
      browserWs,
      userId: 0, // Will be set from session
      formType: url.query.formType as string || '',
    };
    
    activeSessions.set(sessionId, session);

    browserWs.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle initialization message from browser
        if (message.type === 'init') {
          const { agentId, apiKey, formType } = message;
          
          // Connect to ElevenLabs
          await connectToElevenLabs(session, agentId, apiKey, formType);
        } 
        // Forward all other messages to ElevenLabs
        else if (session.elevenLabsWs && session.elevenLabsWs.readyState === WebSocket.OPEN) {
          session.elevenLabsWs.send(data);
        }
      } catch (error) {
        console.error('Browser message error:', error);
      }
    });

    browserWs.on('close', () => {
      console.log('🌐 Browser disconnected');
      if (session.elevenLabsWs) {
        session.elevenLabsWs.close();
      }
      activeSessions.delete(sessionId);
    });

    browserWs.on('error', (error) => {
      console.error('Browser WebSocket error:', error);
    });
  });

  console.log('🌐 ElevenLabs browser proxy initialized');
}

async function connectToElevenLabs(
  session: BrowserSession,
  agentId: string,
  apiKey: string,
  formType: string
) {
  try {
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    
    console.log(`🤖 Connecting to ElevenLabs for browser: ${wsUrl}`);
    
    const elevenLabsWs = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': apiKey
      }
    });

    session.elevenLabsWs = elevenLabsWs;

    elevenLabsWs.on('open', () => {
      console.log('✅ ElevenLabs connected for browser');
      
      // Notify browser that connection is ready
      session.browserWs.send(JSON.stringify({
        type: 'connection_ready'
      }));
    });

    elevenLabsWs.on('message', (data: Buffer) => {
      // Forward all ElevenLabs messages to browser
      if (session.browserWs.readyState === WebSocket.OPEN) {
        session.browserWs.send(data);
      }
    });

    elevenLabsWs.on('error', (error) => {
      console.error('❌ ElevenLabs WebSocket error:', error);
      session.browserWs.send(JSON.stringify({
        type: 'error',
        error: 'ElevenLabs connection error'
      }));
    });

    elevenLabsWs.on('close', (code, reason) => {
      console.log(`🔌 ElevenLabs closed - Code: ${code}, Reason: ${reason.toString()}`);
      session.browserWs.send(JSON.stringify({
        type: 'disconnected',
        code,
        reason: reason.toString()
      }));
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to ElevenLabs:', error);
    session.browserWs.send(JSON.stringify({
      type: 'error',
      error: 'Failed to connect to voice service'
    }));
  }
}
