import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Activity, Building } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job, Form, Incident } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

interface AdminOverviewData {
  stats: {
    jobs: { total: number; active: number; completed: number };
    forms: { total: number; pending: number; completed: number };
    incidents: { total: number; open: number; resolved: number };
    sites: { total: number; active: number; completed: number; archived: number };
  };
  metrics: {
    averageProgress: number;
    completionRate: number;
    complianceRate: number;
  };
  recentActivity: {
    forms: Form[];
    incidents: Incident[];
  };
  activeJobs: Job[];
}

export function AdminOverview() {
  const { data: overview, isLoading } = useQuery<AdminOverviewData>({
    queryKey: ["/api/dashboard/overview"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { stats, metrics, activeJobs, recentActivity } = overview || {
    stats: { jobs: { total: 0, active: 0, completed: 0 }, forms: { total: 0, pending: 0, completed: 0 }, incidents: { total: 0, open: 0, resolved: 0 }, sites: { total: 0, active: 0, completed: 0, archived: 0 } },
    metrics: { averageProgress: 0, completionRate: 0, complianceRate: 0 },
    activeJobs: [],
    recentActivity: { forms: [], incidents: [] },
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card data-testid="metric-average-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Average Project Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.averageProgress}%</div>
            <Progress value={metrics.averageProgress} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              Across {stats.jobs.active} active jobs
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-completion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Job Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.completionRate}%</div>
            <Progress value={metrics.completionRate} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.jobs.completed} of {stats.jobs.total} jobs completed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-compliance-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.complianceRate}%</div>
            <Progress value={metrics.complianceRate} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              Forms completion and compliance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-active-sites">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sites.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.sites.total} total sites
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-active-jobs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.jobs.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.jobs.total} total jobs
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending-forms">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.forms.pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.forms.total} total forms
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-open-incidents">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidents.open}</div>
            <p className="text-xs text-muted-foreground">
              {stats.incidents.total} total incidents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs with Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Active Projects</CardTitle>
          <CardDescription>Current project status and progress</CardDescription>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active jobs
            </div>
          ) : (
            <div className="space-y-4">
              {activeJobs.slice(0, 5).map((job) => (
                <Link key={job.id} href={`/jobs/${job.code}`}>
                  <div
                    className="p-4 rounded-lg border hover-elevate cursor-pointer"
                    data-testid={`active-job-${job.code}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{job.code}</span>
                          <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                            {job.status}
                          </Badge>
                        </div>
                        <h3 className="font-medium mb-1">{job.name}</h3>
                        {job.siteLocation && (
                          <p className="text-sm text-muted-foreground">{job.siteLocation}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{job.progress}%</div>
                      </div>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                    {job.dueDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Due: {format(new Date(job.dueDate), 'PPP')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Forms */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Form Submissions</CardTitle>
            <CardDescription>Latest form activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.forms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent forms
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.forms.slice(0, 5).map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                    data-testid={`recent-form-${form.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{form.formCode}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(form.createdAt), 'PPp')}
                      </div>
                    </div>
                    <Badge variant={
                      form.status === 'completed' ? 'default' :
                      form.status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {form.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>Latest safety incidents</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent incidents
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.incidents.slice(0, 5).map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                    data-testid={`recent-incident-${incident.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{incident.incidentCode}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {incident.description}
                      </div>
                    </div>
                    <Badge variant={
                      incident.severity === 'critical' ? 'destructive' :
                      incident.severity === 'high' ? 'default' : 'secondary'
                    }>
                      {incident.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
