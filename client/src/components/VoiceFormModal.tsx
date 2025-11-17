import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from "lucide-react";
import { SimpleSignaturePad } from "@/components/SimpleSignaturePad";
import { useToast } from "@/hooks/use-toast";

interface VoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: string;
  onFormComplete: (formData: any, signature?: string) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function VoiceFormModal({
  isOpen,
  onClose,
  formType,
  onFormComplete,
}: VoiceFormModalProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [formSchema, setFormSchema] = useState<any>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>("");
  
  const elevenLabsWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFormSchema();
    } else {
      cleanup();
    }
  }, [isOpen]);

  const fetchFormSchema = async () => {
    try {
      const response = await fetch(`/api/realtime/form-schema/${formType}`);
      if (!response.ok) throw new Error("Failed to fetch form schema");
      const schema = await response.json();
      setFormSchema(schema);
    } catch (error) {
      console.error("Error fetching form schema:", error);
      toast({
        title: "Error",
        description: "Failed to load form schema",
        variant: "destructive",
      });
    }
  };

  const startConversation = async () => {
    if (isConnecting || isConnected) return;

    try {
      setIsConnecting(true);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Get ElevenLabs connection details from backend
      const sessionResponse = await fetch("/api/voice/browser-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType }),
      });
      
      if (!sessionResponse.ok) throw new Error("Failed to create session");
      const { agentId, apiKey } = await sessionResponse.json();

      // Connect to our WebSocket proxy (which handles ElevenLabs authentication)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/voice/browser-websocket?formType=${formType}`;
      const ws = new WebSocket(wsUrl);

      elevenLabsWsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Proxy connected");
        
        // Send initialization message with credentials
        ws.send(JSON.stringify({
          type: 'init',
          agentId,
          apiKey,
          formType
        }));
      };
      
      // Wait for connection_ready event before starting audio
      const handleConnectionReady = () => {
        console.log("✅ ElevenLabs connected through proxy");
        setIsConnected(true);
        setIsConnecting(false);
        
        // Start audio processing
        setupAudioProcessing(stream);
        
        // Send initial context
        ws.send(JSON.stringify({
          type: 'conversation_initiation_client_data',
          conversation_initiation_client_data: {
            form_type: formType,
            custom_llm_extra_body: {
              form_schema: formSchema
            }
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle proxy control messages
          if (message.type === 'connection_ready') {
            handleConnectionReady();
          } else if (message.type === 'disconnected' || message.type === 'error') {
            console.error("Proxy error:", message);
          } else {
            // Forward to regular handler
            handleElevenLabsMessage(message);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice assistant",
          variant: "destructive",
        });
        cleanup();
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket closed:", event.code, event.reason);
        if (event.code !== 1000 && isConnected) {
          toast({
            title: "Connection Lost",
            description: "Voice assistant disconnected",
            variant: "destructive",
          });
        }
        setIsConnected(false);
      };

    } catch (error: any) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to voice assistant",
        variant: "destructive",
      });
      setIsConnecting(false);
      cleanup();
    }
  };

  const setupAudioProcessing = (stream: MediaStream) => {
    // Create audio context for processing
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    
    // Create processor for capturing audio chunks
    const processor = audioContext.createScriptProcessor(2048, 1, 1);
    audioProcessorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (elevenLabsWsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
        
        // Send to ElevenLabs
        elevenLabsWsRef.current.send(JSON.stringify({
          user_audio_chunk: base64
        }));
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  const handleElevenLabsMessage = (message: any) => {
    console.log("📨 ElevenLabs message:", message.type);

    switch (message.type) {
      case 'audio':
        // Play audio response
        playAudioChunk(message.audio_event?.audio_base_64 || message.audio_base64);
        break;

      case 'user_transcript':
        // User's speech transcribed
        if (message.user_transcription_event?.user_transcript) {
          addMessage("user", message.user_transcription_event.user_transcript);
        }
        break;

      case 'agent_response':
        // Agent's text response
        const agentText = message.agent_response_event?.agent_response;
        if (agentText) {
          setCurrentAssistantMessage(agentText);
          setTimeout(() => {
            addMessage("assistant", agentText);
            setCurrentAssistantMessage("");
          }, 100);
        }
        break;

      case 'interruption':
        console.log("🔇 User interrupted");
        break;

      case 'ping':
        // Respond to keep-alive
        elevenLabsWsRef.current?.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'tool_call':
        // ElevenLabs is calling a tool (form submission)
        console.log("🔧 Tool call:", message.tool_call);
        if (message.tool_call?.tool_name === 'submit_form') {
          const submittedData = message.tool_call.parameters || {};
          console.log("📝 Form data received:", submittedData);
          setFormData(submittedData);
          
          if (formSchema?.requiresSignature) {
            setShowSignature(true);
            addMessage("assistant", "Perfect! I've collected all the information. Please provide your digital signature to complete the form.");
          } else {
            handleSubmit(submittedData);
          }
        }
        break;

      default:
        console.log("❓ Unknown message type:", message.type);
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    if (!base64Audio || !audioContextRef.current) return;

    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32Array for playback
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Create audio buffer and play
      const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 16000);
      audioBuffer.getChannelData(0).set(float32);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSubmit = (data: any) => {
    onFormComplete(data, signature);
    cleanup();
    onClose();
  };

  const handleSignatureComplete = (sig: string) => {
    setSignature(sig);
    handleSubmit(formData);
  };

  const cleanup = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (elevenLabsWsRef.current) {
      elevenLabsWsRef.current.close();
      elevenLabsWsRef.current = null;
    }
    setIsConnected(false);
    setMessages([]);
    setFormData({});
    setShowSignature(false);
    setSignature("");
    setCurrentAssistantMessage("");
  };

  const endConversation = () => {
    cleanup();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Voice Form: {formSchema?.title}</span>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {!showSignature ? (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Conversation Display */}
            <Card className="flex-1 p-4 overflow-y-auto">
              {messages.length === 0 && !isConnected && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <Mic className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold mb-2">Voice Form Assistant</h3>
                    <p className="text-sm text-muted-foreground">
                      Click "Start Conversation" to begin filling out this form with voice
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <span className="text-xs opacity-70">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Show current assistant message being typed */}
                {currentAssistantMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                      <p className="text-sm">{currentAssistantMessage}</p>
                      <span className="text-xs opacity-70 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Speaking...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Form Data Preview */}
            {Object.keys(formData).length > 0 && (
              <Card className="p-4">
                <h4 className="font-semibold mb-2 text-sm">Collected Information:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(formData).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-muted-foreground">{key}:</span>{" "}
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {!isConnected ? (
                <Button
                  onClick={startConversation}
                  disabled={isConnecting}
                  size="lg"
                  data-testid="button-start-conversation"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-5 w-5" />
                      Start Conversation
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? "destructive" : "outline"}
                    size="lg"
                    data-testid="button-toggle-mute"
                  >
                    {isMuted ? (
                      <>
                        <MicOff className="mr-2 h-5 w-5" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-5 w-5" />
                        Mute
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={endConversation}
                    variant="destructive"
                    size="lg"
                    data-testid="button-end-conversation"
                  >
                    <PhoneOff className="mr-2 h-5 w-5" />
                    End Call
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Sign to Complete</h3>
              <p className="text-sm text-muted-foreground">
                Please provide your digital signature below
              </p>
            </div>
            <SimpleSignaturePad
              onSave={handleSignatureComplete}
              onCancel={() => {
                setShowSignature(false);
                setFormData({});
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
