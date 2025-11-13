import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight, Clock } from "lucide-react";

// todo: remove mock functionality
const incidents = [
  { 
    id: "INC-2024-047", 
    severity: "high",
    title: "Near-miss: Falling debris", 
    job: "Wellington Tunnel",
    time: "2 hours ago",
    status: "investigating",
  },
  { 
    id: "INC-2024-046", 
    severity: "medium",
    title: "Equipment malfunction", 
    job: "Auckland Bridge",
    time: "5 hours ago",
    status: "resolved",
  },
  { 
    id: "INC-2024-045", 
    severity: "low",
    title: "Minor first aid required", 
    job: "Christchurch Roadworks",
    time: "Yesterday",
    status: "closed",
  },
];

const severityVariant: Record<string, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export function IncidentAlerts() {
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
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
              data-testid={`incident-${incident.id}`}
            >
              <div className={`p-2 rounded-md ${
                incident.severity === "high" 
                  ? "bg-destructive/10" 
                  : incident.severity === "medium" 
                  ? "bg-warning/10" 
                  : "bg-muted"
              }`}>
                <AlertTriangle className={`h-4 w-4 ${
                  incident.severity === "high" 
                    ? "text-destructive" 
                    : incident.severity === "medium" 
                    ? "text-warning" 
                    : "text-muted-foreground"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
                    <Badge variant={severityVariant[incident.severity]} className="text-xs">
                      {incident.severity}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="text-xs">{incident.status}</Badge>
                </div>
                <p className="font-medium text-sm mb-1">{incident.title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{incident.job}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{incident.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}