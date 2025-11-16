import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { FormTemplate } from "@shared/schema";

const getFormIcon = (type: string) => {
  switch (type) {
    case 'incident-report':
      return { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30" };
    default:
      return { icon: FileText, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30" };
  }
};

export default function FormsList() {
  const { data: templates, isLoading } = useQuery<FormTemplate[]>({
    queryKey: ['/api/form-templates/available'],
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Forms</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Select a form type to get started
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading forms...</p>
          </div>
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.filter(t => t.active).map((template) => {
            const { icon: Icon, color, bgColor } = getFormIcon(template.type);
            const questionCount = (template.schema as any).questions?.length || 0;
            
            return (
              <Link key={template.id} href={`/forms/${template.id}`}>
                <Card className="hover-elevate cursor-pointer h-full" data-testid={`form-template-${template.id}`}>
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`p-3 rounded-lg ${bgColor}`}>
                        <Icon className={`h-6 w-6 ${color}`} />
                      </div>
                      {template.type === 'incident-report' && (
                        <Badge variant="destructive" className="text-xs">
                          Safety
                        </Badge>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center justify-between gap-2">
                        <span>{template.name}</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardTitle>
                      <CardDescription className="mt-2 text-sm">
                        {template.description || `${questionCount} questions`}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-2">No forms available</h3>
              <p className="text-sm text-muted-foreground">
                Contact your administrator to create form templates.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Need a different form?</h3>
              <p className="text-sm text-muted-foreground">
                Contact your administrator to request additional form types or custom templates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
