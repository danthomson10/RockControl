import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Form } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, "warning" | "success" | "secondary"> = {
  pending: "warning",
  approved: "success",
  completed: "secondary",
  draft: "secondary",
  rejected: "destructive",
};

const formTypeLabels: Record<string, string> = {
  "take-5": "Take-5",
  "variation": "Variation",
  "crew-briefing": "Crew Briefing",
  "risk-control-plan": "Risk Control",
};

export function RecentForms() {
  const { data: forms, isLoading } = useQuery<Form[]>({
    queryKey: ["/api/forms"],
    queryFn: async () => {
      const res = await fetch("/api/forms?limit=4", { credentials: "include" });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const formsList = Array.isArray(forms) ? forms : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Recent Forms</CardTitle>
        <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-forms">
          View all
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : formsList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No forms yet
          </div>
        ) : (
          <div className="space-y-3">
            {formsList.map((form) => (
              <div
                key={form.id}
                className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                data-testid={`form-item-${form.formCode}`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-md bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm" data-testid={`form-id-${form.formCode}`}>{form.formCode}</p>
                      <Badge variant="secondary" className="text-xs">{formTypeLabels[form.type]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(form.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge variant={statusColors[form.status] as any} data-testid={`form-status-${form.formCode}`}>
                  {form.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}