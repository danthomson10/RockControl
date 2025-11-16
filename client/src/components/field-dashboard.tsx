import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList, AlertTriangle, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { IncidentAlerts } from "@/components/incident-alerts";

interface Submission {
  id: number;
  formCode: string;
  status: string;
  submittedAt: string | null;
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
  const { data: mySubmissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['/api/submissions'],
  });

  const recentSubmissions = mySubmissions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
        <p className="text-lg text-muted-foreground">Safety starts with you</p>
      </div>

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
          ) : recentSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No submissions yet. Start by filling out a form above!
            </div>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                  data-testid={`submission-${submission.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{submission.formCode}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(submission.submittedAt!).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      submission.status === 'approved' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : submission.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {submission.status}
                    </span>
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
