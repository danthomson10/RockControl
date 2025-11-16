import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { VariationFormBuilder } from "@/components/variation-form-builder";
import { SignaturePad } from "@/components/signature-pad";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Mic } from "lucide-react";
import { Link } from "wouter";
import VoiceFormModal from "@/components/VoiceFormModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function VariationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const submitFormMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest('/api/variations', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Variation request submitted successfully",
      });
      setLocation('/variations');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit variation",
        variant: "destructive",
      });
    },
  });

  const handleVoiceFormComplete = (formData: any, signature?: string) => {
    // Add signature to form data if present
    const completeFormData = signature 
      ? { ...formData, signature } 
      : formData;
    
    // Submit to backend
    submitFormMutation.mutate({
      jobCode: 'DEFAULT-001', // Default job code - could be selected by user
      formData: completeFormData,
      sendToTeams: false,
    });
    
    setShowVoiceModal(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/forms">
          <Button variant="ghost" size="icon" data-testid="button-back-to-forms">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Variation Request</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Document project variations and scope changes</p>
        </div>
        <Button
          onClick={() => setShowVoiceModal(true)}
          variant="outline"
          className="gap-2"
          data-testid="button-fill-with-voice"
        >
          <Mic className="h-4 w-4" />
          <span className="hidden sm:inline">Fill with Voice</span>
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <VariationFormBuilder />
        <SignaturePad />
      </div>

      <VoiceFormModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        formType="variation"
        onFormComplete={handleVoiceFormComplete}
      />
    </div>
  );
}
