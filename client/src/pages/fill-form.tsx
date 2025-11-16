import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Mic } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import VoiceFormModal from "@/components/VoiceFormModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { FormTemplate } from "@shared/schema";

export default function FillForm() {
  const [, params] = useRoute("/forms/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const templateId = params?.id ? parseInt(params.id) : null;
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const { data: template, isLoading, error } = useQuery<any>({
    queryKey: ['/api/form-templates', templateId],
    enabled: !!templateId,
  });

  const submitFormMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest('/api/forms', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Form submitted successfully",
      });
      setLocation('/forms');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit form",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/forms">
            <Button variant="ghost" size="sm" data-testid="button-back-to-forms">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
          </Link>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Form not found</h3>
              <p className="text-sm text-muted-foreground">
                The form template you're looking for doesn't exist or you don't have access to it.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const handleVoiceFormComplete = (formData: any, signature?: string) => {
    // Generate unique form code
    const formCode = `VOICE-WEB-${template.type.toUpperCase()}-${Date.now()}`;
    
    // Add signature to form data if present
    const completeFormData = signature 
      ? { ...formData, signature } 
      : formData;
    
    // Submit to backend
    submitFormMutation.mutate({
      jobId: 1, // Default job for now - could be selected by user
      formCode,
      type: template.type,
      source: 'voice',
      formData: completeFormData,
      status: 'pending',
    });
    
    setShowVoiceModal(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/forms">
          <Button variant="ghost" size="sm" data-testid="button-back-to-forms">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {template.name}
          </h1>
          {template.description && (
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {template.description}
            </p>
          )}
        </div>
        <Button
          onClick={() => setShowVoiceModal(true)}
          variant="outline"
          className="gap-2"
          data-testid="button-fill-with-voice"
        >
          <Mic className="h-4 w-4" />
          Fill with Voice
        </Button>
      </div>

      <DynamicFormRenderer 
        template={{
          ...template,
          description: template.description || ''
        }}
        onSubmit={(data) => {
          console.log('Form submitted:', data);
          window.location.href = '/forms';
        }}
      />

      <VoiceFormModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        formType={template.type}
        onFormComplete={handleVoiceFormComplete}
      />
    </div>
  );
}
