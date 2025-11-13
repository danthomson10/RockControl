import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronRight } from "lucide-react";

// todo: remove mock functionality
const recentForms = [
  { id: "TK5-2847", type: "Take-5", job: "Wellington Tunnel", status: "pending", date: "Today, 2:30 PM" },
  { id: "VAR-1923", type: "Variation", job: "Auckland Bridge", status: "approved", date: "Today, 11:15 AM" },
  { id: "CB-5612", type: "Crew Briefing", job: "Christchurch Roadworks", status: "completed", date: "Yesterday" },
  { id: "TK5-2846", type: "Take-5", job: "Wellington Tunnel", status: "completed", date: "Yesterday" },
];

const statusColors: Record<string, "warning" | "success" | "secondary"> = {
  pending: "warning",
  approved: "success",
  completed: "secondary",
};

export function RecentForms() {
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
        <div className="space-y-3">
          {recentForms.map((form) => (
            <div
              key={form.id}
              className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
              data-testid={`form-item-${form.id}`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-md bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm" data-testid={`form-id-${form.id}`}>{form.id}</p>
                    <Badge variant="secondary" className="text-xs">{form.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">{form.job}</p>
                  <p className="text-xs text-muted-foreground mt-1">{form.date}</p>
                </div>
              </div>
              <Badge variant={statusColors[form.status]} data-testid={`form-status-${form.id}`}>
                {form.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}