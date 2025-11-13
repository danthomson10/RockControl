import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// todo: remove mock functionality
const activeJobs = [
  { 
    code: "WEL-TUN-001", 
    name: "Wellington Tunnel Project", 
    site: "Mt Victoria, Wellington", 
    progress: 67,
    dueDate: "Mar 15, 2024",
    status: "on-track",
  },
  { 
    code: "AKL-BRG-023", 
    name: "Auckland Bridge Maintenance", 
    site: "Harbour Bridge, Auckland", 
    progress: 42,
    dueDate: "Apr 2, 2024",
    status: "at-risk",
  },
  { 
    code: "CHC-RD-156", 
    name: "Christchurch Roadworks", 
    site: "Main South Road, Christchurch", 
    progress: 89,
    dueDate: "Feb 28, 2024",
    status: "on-track",
  },
];

export function ActiveJobs() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Active Jobs</CardTitle>
        <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-jobs">
          View all
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeJobs.map((job) => (
            <div
              key={job.code}
              className="p-4 rounded-lg border hover-elevate"
              data-testid={`job-card-${job.code}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground" data-testid={`job-code-${job.code}`}>
                      {job.code}
                    </span>
                    <Badge 
                      variant={job.status === "on-track" ? "success" : "warning"}
                      data-testid={`job-status-${job.code}`}
                    >
                      {job.status === "on-track" ? "On Track" : "At Risk"}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm mb-2">{job.name}</h4>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{job.site}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Due {job.dueDate}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{job.progress}%</span>
                </div>
                <Progress value={job.progress} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}