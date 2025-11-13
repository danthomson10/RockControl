import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, FileEdit, ClipboardCheck, Users, Shield, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const formTypes = [
  {
    id: "take-5",
    title: "Take-5 Safety Form",
    description: "Complete before starting work - identify hazards and control measures",
    icon: Shield,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    path: "/forms/take-5",
    badge: "Required",
    badgeVariant: "default" as const,
  },
  {
    id: "crew-briefing",
    title: "Crew Briefing",
    description: "Daily team briefing and safety discussion",
    icon: Users,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    path: "/forms/crew-briefing",
    badge: "Daily",
    badgeVariant: "secondary" as const,
  },
  {
    id: "incident-report",
    title: "Incident Report",
    description: "Report accidents, near-misses, or safety incidents",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    path: "/forms/incident-report",
    badge: "Urgent",
    badgeVariant: "destructive" as const,
  },
  {
    id: "variation",
    title: "Variation Form",
    description: "Document project variations and scope changes",
    icon: FileEdit,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    path: "/forms/variation",
    badge: "Contract",
    badgeVariant: "secondary" as const,
  },
  {
    id: "risk-assessment",
    title: "Risk Assessment",
    description: "Detailed risk control plan for high-risk activities",
    icon: ClipboardCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    path: "/forms/risk-assessment",
    badge: "Planning",
    badgeVariant: "secondary" as const,
  },
  {
    id: "site-inspection",
    title: "Site Inspection",
    description: "Regular site safety and compliance inspection",
    icon: FileText,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    path: "/forms/site-inspection",
    badge: "Weekly",
    badgeVariant: "secondary" as const,
  },
];

export default function FormsList() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Forms</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Select a form type to get started
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {formTypes.map((form) => {
          const Icon = form.icon;
          return (
            <Link key={form.id} href={form.path}>
              <Card className="hover-elevate cursor-pointer h-full" data-testid={`form-type-${form.id}`}>
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-3 rounded-lg ${form.bgColor}`}>
                      <Icon className={`h-6 w-6 ${form.color}`} />
                    </div>
                    <Badge variant={form.badgeVariant} className="text-xs">
                      {form.badge}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center justify-between gap-2">
                      <span>{form.title}</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm">
                      {form.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Need a different form?</h3>
              <p className="text-sm text-muted-foreground">
                Contact your administrator to request additional form types or custom templates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
