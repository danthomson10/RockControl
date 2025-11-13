import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

export function ActiveJobs() {
  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs", { credentials: "include" });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const jobsList = Array.isArray(jobs) ? jobs : [];
  const activeJobs = jobsList.filter(job => job.status === 'active');

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
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No active jobs
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <Link key={job.code} href={`/jobs/${job.code}`}>
                <div
                  className="p-4 rounded-lg border hover-elevate cursor-pointer"
                  data-testid={`job-card-${job.code}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground" data-testid={`job-code-${job.code}`}>
                          {job.code}
                        </span>
                        <Badge 
                          variant={job.progress >= 80 ? "success" : job.progress >= 50 ? "secondary" : "warning"}
                          data-testid={`job-status-${job.code}`}
                        >
                          {job.status}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm mb-2">{job.name}</h4>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{job.siteLocation}</span>
                        </div>
                        {job.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Due {format(new Date(job.dueDate), "MMM d, yyyy")}</span>
                          </div>
                        )}
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
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}