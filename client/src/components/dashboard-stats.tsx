import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  activeJobs: number;
  formsPending: number;
  openIncidents: number;
  complianceRate: number;
  jobs?: { total: number; active: number; completed: number };
  forms?: { total: number; pending: number; completed: number };
  incidents?: { total: number; open: number; resolved: number };
  sites?: { total: number; active: number; completed: number; archived: number };
}

export function DashboardStats() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Jobs",
      value: stats?.activeJobs?.toString() || "0",
      icon: Briefcase,
    },
    {
      title: "Forms Pending",
      value: stats?.formsPending?.toString() || "0",
      icon: FileText,
    },
    {
      title: "Open Incidents",
      value: stats?.openIncidents?.toString() || "0",
      icon: AlertTriangle,
    },
    {
      title: "Compliance Rate",
      value: `${stats?.complianceRate || 0}%`,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title} data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid={`stat-value-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}