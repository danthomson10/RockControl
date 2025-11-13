import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job, User } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { CreateJobDialog } from "@/components/create-job-dialog";

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const canManageJobs = user?.role === "OrgAdmin" || user?.role === "ProjectManager" || user?.role === "HSEManager";

  const jobsList = Array.isArray(jobs) ? jobs : [];
  const filteredJobs = jobsList.filter(job => 
    job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.siteLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "secondary";
      case "on-hold": return "warning";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage construction projects and sites
          </p>
        </div>
        {canManageJobs && (
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-job">
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, sites, or codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-jobs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "No jobs found matching your search" : "No jobs yet"}
            </p>
            {canManageJobs && !searchQuery && (
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => setCreateDialogOpen(true)}
                data-testid="button-create-first-job"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.code}`}>
              <Card className="hover-elevate cursor-pointer h-full" data-testid={`job-card-${job.code}`}>
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground" data-testid={`job-code-${job.code}`}>
                          {job.code}
                        </span>
                        <Badge variant={getStatusVariant(job.status) as any} className="text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{job.name}</CardTitle>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{job.siteLocation}</span>
                    </div>
                    {job.dueDate && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Due {format(new Date(job.dueDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Progress
                      </span>
                      <span className="font-medium">{job.progress}%</span>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!canManageJobs && jobsList.length > 0 && (
        <Card className="border-muted-foreground/20 bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              You have view-only access. Contact your administrator to create or edit jobs.
            </p>
          </CardContent>
        </Card>
      )}

      <CreateJobDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
