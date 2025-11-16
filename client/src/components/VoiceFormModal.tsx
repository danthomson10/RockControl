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
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

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
    // Prevent multiple simultaneous connection attempts
    if (isConnecting || isConnected) {
      return;
    }

    try {
      setIsConnecting(true);

      // Request microphone permission first
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
      } catch (micError: any) {
        throw new Error(
          micError.name === "NotAllowedError" || micError.name === "PermissionDeniedError"
            ? "Microphone permission denied. Please allow microphone access to use voice forms."
            : "Could not access microphone. Please check your microphone settings."
        );
      }

      // Get ephemeral token from backend
      const tokenResponse = await fetch("/api/realtime/session", {
        method: "POST",
      });
      if (!tokenResponse.ok) throw new Error("Failed to create session");
      const { client_secret } = await tokenResponse.json();

      // Setup WebRTC
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Create audio element for playback
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioElementRef.current = audioEl;
      
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // Add local audio track to peer connection
      pc.addTrack(stream.getTracks()[0]);

      // Setup data channel for events
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.addEventListener("message", (e) => {
        handleServerEvent(JSON.parse(e.data));
      });

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI
      const baseUrl = "https://api.openai.com/v1/realtime";
      const sdpResponse = await fetch(`${baseUrl}?model=gpt-4o-mini-realtime-preview-2024-12-17`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${client_secret.value}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) throw new Error("Failed to establish connection");

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      setIsConnected(true);
      setIsConnecting(false);

      // Send initial session configuration
      sendEvent({
        type: "session.update",
        session: {
          voice: "cedar",
          instructions: getAIInstructions(),
          input_audio_transcription: { model: "whisper-1" },
          tools: [
            {
              type: "function",
              name: "submit_form",
              description: "Submit the completed form data after collecting all required fields from the user",
              parameters: {
                type: "object",
                properties: getFormProperties(),
                required: formSchema.fields
                  .filter((f: any) => f.required)
                  .map((f: any) => f.name),
              },
            },
          ],
          tool_choice: "auto",
        },
      });

      // Start conversation
      sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{
            type: "input_text",
            text: `I want to fill out a ${formSchema?.title}. Please guide me through the form.`
          }]
        }
      });

      sendEvent({ type: "response.create" });

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

  const getFormProperties = () => {
    if (!formSchema) return {};
    
    const properties: any = {};
    formSchema.fields.forEach((field: any) => {
      let fieldSchema: any = { description: field.label };
      
      switch (field.type) {
        case "text":
        case "textarea":
          fieldSchema.type = "string";
          break;
        case "number":
          fieldSchema.type = "number";
          break;
        case "date":
          fieldSchema.type = "string";
          fieldSchema.format = "date";
          break;
        case "time":
          fieldSchema.type = "string";
          fieldSchema.pattern = "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$";
          break;
        case "radio":
          fieldSchema.type = "string";
          if (field.options) {
            fieldSchema.enum = field.options;
          }
          break;
        case "checkbox":
          fieldSchema.type = "array";
          fieldSchema.items = { type: "string" };
          if (field.options) {
            fieldSchema.items.enum = field.options;
          }
          break;
        default:
          fieldSchema.type = "string";
      }
      
      properties[field.name] = fieldSchema;
    });
    
    return properties;
  };

  const getAIInstructions = () => {
    if (!formSchema) return "";

    return `You are a helpful assistant helping users fill out a "${formSchema.title}" form through natural conversation.

Form Description: ${formSchema.description}

Required Fields:
${formSchema.fields.map((f: any) => `- ${f.label} (${f.type})${f.required ? " [REQUIRED]" : ""}`).join("\n")}

Instructions:
1. Greet the user warmly and explain you'll help them fill out this form
2. Ask conversational questions to gather information for each field
3. Listen carefully to their responses and extract relevant information
4. Confirm important details back to them
5. When you've collected all required information, call the submit_form function
6. Be patient and helpful if they need clarification

Important:
- Extract dates in YYYY-MM-DD format
- Extract times in HH:MM format
- For radio fields, choose from: ${formSchema.fields.filter((f: any) => f.type === "radio").map((f: any) => f.options?.join(", ")).join("; ")}
- Be conversational and natural, don't read field names robotically
${formSchema.requiresSignature ? "- After collecting all information, inform the user they'll need to provide a digital signature" : ""}`;
  };

  const handleServerEvent = (event: any) => {
    console.log("Server event:", event.type, event);

    switch (event.type) {
      case "response.audio_transcript.delta":
      case "response.text.delta":
        // Accumulate assistant's response
        break;
        
      case "response.audio_transcript.done":
        if (event.transcript) {
          addMessage("assistant", event.transcript);
        }
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          addMessage("user", event.transcript);
        }
        break;

      case "response.function_call_arguments.done":
        if (event.name === "submit_form") {
          try {
            const data = JSON.parse(event.arguments);
            setFormData(data);
            
            if (formSchema?.requiresSignature) {
              setShowSignature(true);
              sendEvent({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "assistant",
                  content: [{
                    type: "text",
                    text: "Great! I've collected all the information. Please provide your digital signature to complete the form."
                  }]
                }
              });
            } else {
              handleSubmit(data);
            }
          } catch (error) {
            console.error("Error parsing form data:", error);
          }
        }
        break;

      case "error":
        console.error("OpenAI error:", event.error);
        toast({
          title: "Error",
          description: event.error.message || "An error occurred",
          variant: "destructive",
        });
        break;
    }
  };

  const sendEvent = (event: any) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(event));
    }
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }
    dataChannelRef.current = null;
    setIsConnected(false);
    setMessages([]);
    setFormData({});
    setShowSignature(false);
    setSignature("");
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
