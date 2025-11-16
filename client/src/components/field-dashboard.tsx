import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ClipboardList, AlertTriangle, Clock, CheckCircle, ArrowRight, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { IncidentAlerts } from "@/components/incident-alerts";
import type { Job, Form, Incident } from "@shared/schema";
import { format } from "date-fns";

interface MyActivityData {
  assignedJobs: Job[];
  myForms: Form[];
  myIncidents: Incident[];
  stats: {
    assignedJobsCount: number;
    activeAssignments: number;
    formsSubmitted: number;
    incidentsReported: number;
  };
}

const quickFormCards = [
  {
    id: "TAKE5",
    title: "Take-5",
    description: "Quick safety check",
    icon: CheckCircle,
    color: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
    iconColor: "text-green-600 dark:text-green-500",
  },
  {
    id: "CREW_BRIEFING",
    title: "Crew Briefing",
    description: "Daily team briefing",
    icon: ClipboardList,
    color: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
    iconColor: "text-blue-600 dark:text-blue-500",
  },
  {
    id: "INCIDENT",
    title: "Incident Report",
    description: "Report safety incident",
    icon: AlertTriangle,
    color: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
    iconColor: "text-red-600 dark:text-red-500",
  },
];

export function FieldDashboard() {
  const { data: myActivity, isLoading } = useQuery<MyActivityData>({
    queryKey: ['/api/dashboard/my-activity'],
  });

  const assignedJobs = myActivity?.assignedJobs || [];
  const recentForms = myActivity?.myForms?.slice(0, 5) || [];
  const stats = myActivity?.stats;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
        <p className="text-lg text-muted-foreground">Safety starts with you</p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="stat-card-active-assignments">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAssignments}</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-card-forms-submitted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forms Submitted</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.formsSubmitted}</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-card-incidents-reported">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incidents Reported</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.incidentsReported}</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-card-total-assignments">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assignedJobsCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Primary CTA */}
      <div className="flex justify-center">
        <Link href="/forms">
          <Button size="lg" className="h-14 px-8 text-lg gap-2" data-testid="button-start-form">
            <FileText className="h-5 w-5" />
            Start Form
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Quick Form Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Forms</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickFormCards.map((form) => (
            <Link key={form.id} href={`/forms/${form.id}`}>
              <Card className={`cursor-pointer hover-elevate active-elevate-2 ${form.color}`} data-testid={`card-quick-form-${form.id.toLowerCase()}`}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`rounded-lg p-3 ${form.iconColor}`}>
                    <form.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{form.title}</h3>
                    <p className="text-sm text-muted-foreground">{form.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* My Assigned Jobs */}
      {assignedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              My Assigned Jobs
            </CardTitle>
            <CardDescription>Jobs you're currently working on</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignedJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.code}`}>
                  <div
                    className="flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer"
                    data-testid={`assigned-job-${job.code}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{job.name}</div>
                      <div className="text-sm text-muted-foreground">{job.code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Your Recent Submissions
          </CardTitle>
          <CardDescription>Last 5 forms you've submitted</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : recentForms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No submissions yet. Start by filling out a form above!
            </div>
          ) : (
            <div className="space-y-2">
              {recentForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                  data-testid={`submission-${form.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{form.formCode}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(form.createdAt), 'PPP')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      form.status === 'completed' ? 'default' :
                      form.status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {form.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Essential Safety Alerts */}
      <IncidentAlerts />
    </div>
  );
}
