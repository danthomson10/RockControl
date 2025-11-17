import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Phone, PhoneOff, Loader2, CheckCircle2, Circle } from "lucide-react";
import { SimpleSignaturePad } from "@/components/SimpleSignaturePad";
import { useToast } from "@/hooks/use-toast";

interface VoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: string;
  onFormComplete: (formData: any, signature?: string, conversationTranscript?: any[]) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  extractedFields?: Record<string, any>;
}

interface FormSection {
  name: string;
  label: string;
  fields: string[];
  completed: boolean;
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
  const [formSections, setFormSections] = useState<FormSection[]>([]);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>("");
  const [conversationTranscript, setConversationTranscript] = useState<Array<{
    role: 'user' | 'assistant';
    message: string;
    timestamp: string;
    extractedFields?: Record<string, any>;
  }>>([]);
  
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

  useEffect(() => {
    if (formSchema) {
      buildFormSections();
    }
  }, [formSchema]);

  useEffect(() => {
    if (formSchema) {
      updateSectionCompletion();
    }
  }, [formData, formSchema]);

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

  const buildFormSections = () => {
    if (!formSchema?.fields) return;

    const sections: FormSection[] = [];
    const sectionMap = new Map<string, string[]>();

    formSchema.fields.forEach((field: any) => {
      const sectionName = field.section || 'General Information';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      sectionMap.get(sectionName)!.push(field.name);
    });

    sectionMap.forEach((fieldNames, sectionLabel) => {
      sections.push({
        name: sectionLabel.toLowerCase().replace(/\s+/g, '_'),
        label: sectionLabel,
        fields: fieldNames,
        completed: false,
      });
    });

    setFormSections(sections);
  };

  const updateSectionCompletion = () => {
    if (formSections.length === 0) return;

    const updatedSections = formSections.map((section) => {
      const requiredFieldsInSection = formSchema.fields
        .filter((f: any) => section.fields.includes(f.name) && f.required)
        .map((f: any) => f.name);

      const allRequiredFilled = requiredFieldsInSection.every(
        (fieldName: string) => formData[fieldName] !== undefined && formData[fieldName] !== ''
      );

      return { ...section, completed: allRequiredFilled };
    });

    setFormSections(updatedSections);
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
      const sdpResponse = await fetch(`${baseUrl}?model=gpt-realtime-mini-2025-10-06`, {
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
              name: "update_form_fields",
              description: "Extract and update form fields in real-time as the user speaks. Call this IMMEDIATELY when you identify field values from their response, even if they mention multiple fields at once (e.g., 'I fell at Site 3 and hurt my back' should extract both location and injury type).",
              parameters: {
                type: "object",
                properties: getFormProperties(),
                required: [],
              },
            },
            {
              type: "function",
              name: "submit_form",
              description: "Submit the completed form after ALL required fields have been collected via update_form_fields. Only call this when you have all required information.",
              parameters: {
                type: "object",
                properties: {
                  confirmed: {
                    type: "boolean",
                    description: "Always set to true",
                  },
                },
                required: ["confirmed"],
              },
            },
          ],
          tool_choice: "auto",
        },
      });

      // Start conversation - don't say "I want to fill out", just start directly
      sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{
            type: "input_text",
            text: `Start form`
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

    const requiredFields = formSchema.fields.filter((f: any) => f.required);
    const optionalFields = formSchema.fields.filter((f: any) => !f.required);
    const radioFields = formSchema.fields.filter((f: any) => f.type === "radio");
    
    const isIncidentReport = formType.includes('incident');

    if (isIncidentReport) {
      return `You are a form data extraction system. You are NOT a conversational assistant.

ABSOLUTE RULES - VIOLATION TERMINATES SESSION:
- FORBIDDEN: Greetings, pleasantries, empathy, rapport-building, questions about wellbeing
- FORBIDDEN: "How are you?", "I hope you're okay", "Thank you for calling", "Have a nice day"
- FORBIDDEN: Repeating back their full story or recapping information
- REQUIRED: Ask ONLY about specific missing form fields - nothing else

Required fields to collect:
${requiredFields.map((f: any) => `- ${f.name}: ${f.label}${f.options ? ` (options: ${f.options.join(', ')})` : ''}`).join("\n")}

EXECUTION PROTOCOL:
1. First response: "What happened?" - NOTHING MORE
2. User speaks → call update_form_fields immediately with ALL extractable values
3. Check missing required fields → ask ONLY "What about [field]?" for each missing field
4. All required fields collected → call submit_form - NO confirmation, NO recap
5. Extract dates as YYYY-MM-DD, times as HH:MM
6. For radio fields: ${radioFields.map((f: any) => `${f.name}=[${f.options?.join('|')}]`).join(', ')}

Multi-field extraction (MANDATORY):
User: "I fell at Site 3 and hurt my back around 2pm"
→ update_form_fields({location: "Site 3", incidentType: "Fall", injuryDescription: "hurt my back", incidentTime: "14:00"})

STAY FOCUSED. COLLECT DATA. NO CONVERSATION.`;
    }

    // Generic form instructions
    return `You are a form data extraction system. FORBIDDEN: greetings, small talk, confirmation.

Required fields:
${requiredFields.map((f: any) => `- ${f.name}: ${f.label}${f.options ? ` (${f.options.join(', ')})` : ''}`).join("\n")}

PROTOCOL:
1. First: "What information do you have?" - NOTHING ELSE
2. Extract all available fields → call update_form_fields
3. Ask ONLY "What about [missing field]?" for each missing required field
4. All required collected → call submit_form immediately
5. Dates: YYYY-MM-DD, Times: HH:MM
6. Extract multiple fields per response (MANDATORY)

NO conversation. Data collection ONLY.`;
  };

  const handleServerEvent = (event: any) => {
    console.log("Server event:", event.type, event);

    switch (event.type) {
      case "response.audio_transcript.delta":
        // Accumulate assistant's response in real-time
        if (event.delta) {
          setCurrentAssistantMessage((prev) => prev + event.delta);
        }
        break;
        
      case "response.audio_transcript.done":
        // Complete assistant message
        if (event.transcript) {
          addMessage("assistant", event.transcript);
          setCurrentAssistantMessage("");
        }
        break;

      case "conversation.item.input_audio_transcription.completed":
      case "input_audio_buffer.speech_stopped":
        // User finished speaking - check for transcript
        if (event.transcript) {
          addMessage("user", event.transcript);
        }
        break;

      case "conversation.item.created":
        // Handle user input when transcript becomes available
        if (event.item?.role === "user" && event.item?.content) {
          const audioContent = event.item.content.find((c: any) => c.type === "input_audio");
          if (audioContent?.transcript) {
            addMessage("user", audioContent.transcript);
          }
        }
        break;

      case "response.function_call_arguments.done":
        if (event.name === "update_form_fields") {
          try {
            const extractedFields = JSON.parse(event.arguments);
            console.log("Extracted fields:", extractedFields);
            
            // Update form data with extracted fields
            setFormData((prev: any) => ({
              ...prev,
              ...extractedFields,
            }));

            // Track extracted fields in conversation transcript
            setConversationTranscript((prev) => {
              const lastEntry = prev[prev.length - 1];
              if (lastEntry && lastEntry.role === 'assistant') {
                return prev.slice(0, -1).concat({
                  ...lastEntry,
                  extractedFields,
                });
              }
              return prev;
            });
          } catch (error) {
            console.error("Error parsing extracted fields:", error);
          }
        } else if (event.name === "submit_form") {
          try {
            // Use accumulated formData instead of event arguments
            if (formSchema?.requiresSignature) {
              setShowSignature(true);
              sendEvent({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "assistant",
                  content: [{
                    type: "text",
                    text: "Perfect! I've collected all the information. Please provide your digital signature to complete the form."
                  }]
                }
              });
            } else {
              handleSubmit(formData);
            }
          } catch (error) {
            console.error("Error submitting form:", error);
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
    const timestamp = new Date();
    setMessages((prev) => [...prev, { role, content, timestamp }]);
    
    // Also add to conversation transcript
    setConversationTranscript((prev) => [
      ...prev,
      {
        role,
        message: content,
        timestamp: timestamp.toISOString(),
      },
    ]);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const handleSubmit = (data: any) => {
    onFormComplete(data, signature, conversationTranscript);
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
    setCurrentAssistantMessage("");
    setConversationTranscript([]);
    setFormSections([]);
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
                        Typing...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Progress Tracker & Form Field Display */}
            {isConnected && (
              <div className="grid grid-cols-2 gap-4">
                {/* Section Progress */}
                <Card className="p-4">
                  <h4 className="font-semibold mb-3 text-sm">Form Progress</h4>
                  <div className="space-y-2">
                    {formSections.length > 0 ? (
                      formSections.map((section) => (
                        <div
                          key={section.name}
                          className="flex items-center gap-2"
                          data-testid={`section-${section.name}`}
                        >
                          {section.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" data-testid={`checkmark-${section.name}`} />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={`text-sm ${section.completed ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {section.label}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Start speaking to see progress...
                      </p>
                    )}
                  </div>
                </Card>

                {/* Real-time Form Fields */}
                <Card className="p-4">
                  <h4 className="font-semibold mb-3 text-sm">Captured Data</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {Object.keys(formData).length > 0 ? (
                      Object.entries(formData).map(([key, value]) => (
                        <div key={key} className="text-xs" data-testid={`field-${key}`}>
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>{" "}
                          <span className="font-medium text-foreground">
                            {Array.isArray(value) ? value.join(", ") : String(value)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No data captured yet...
                      </p>
                    )}
                  </div>
                </Card>
              </div>
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
