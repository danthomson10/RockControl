import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { FormTemplate } from "@shared/schema";

export default function FillForm() {
  const [, params] = useRoute("/forms/:id");
  const templateId = params?.id ? parseInt(params.id) : null;

  const { data: template, isLoading, error } = useQuery<any>({
    queryKey: ['/api/form-templates', templateId],
    enabled: !!templateId,
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

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {template.name}
        </h1>
        {template.description && (
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {template.description}
          </p>
        )}
      </div>

      <DynamicFormRenderer 
        template={{
          ...template,
          description: template.description || ''
        }}
        onSuccess={() => {
          // TODO: Navigate to reports page when implemented
          window.location.href = '/forms';
        }}
      />
    </div>
  );
}
