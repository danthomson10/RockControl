import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Incident } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const severityVariant: Record<string, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  critical: "destructive",
  medium: "warning",
  low: "secondary",
};

export function IncidentAlerts() {
  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    queryFn: () => fetch("/api/incidents?limit=3").then(r => r.json()),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Recent Incidents</CardTitle>
        <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-incidents">
          View all
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {incidents?.map((incident) => (
              <div
                key={incident.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
                data-testid={`incident-${incident.incidentCode}`}
              >
                <div className={`p-2 rounded-md ${
                  incident.severity === "high" || incident.severity === "critical"
                    ? "bg-destructive/10" 
                    : incident.severity === "medium" 
                    ? "bg-warning/10" 
                    : "bg-muted"
                }`}>
                  <AlertTriangle className={`h-4 w-4 ${
                    incident.severity === "high" || incident.severity === "critical"
                      ? "text-destructive" 
                      : incident.severity === "medium" 
                      ? "text-warning" 
                      : "text-muted-foreground"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{incident.incidentCode}</span>
                      <Badge variant={severityVariant[incident.severity]} className="text-xs">
                        {incident.severity}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs">{incident.status}</Badge>
                  </div>
                  <p className="font-medium text-sm mb-1">{incident.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}