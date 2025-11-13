import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileText, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";

// todo: remove mock functionality
const stats = [
  {
    title: "Active Jobs",
    value: "24",
    change: "+3 this week",
    trend: "up" as const,
    icon: Briefcase,
  },
  {
    title: "Forms Pending",
    value: "12",
    change: "-5 from yesterday",
    trend: "down" as const,
    icon: FileText,
  },
  {
    title: "Open Incidents",
    value: "3",
    change: "No change",
    trend: "neutral" as const,
    icon: AlertTriangle,
  },
  {
    title: "Compliance Rate",
    value: "98%",
    change: "+2% this month",
    trend: "up" as const,
    icon: CheckCircle2,
  },
];

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid={`stat-value-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
              {stat.value}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {stat.trend === "up" && <TrendingUp className="h-3 w-3 text-success" />}
              {stat.trend === "down" && <TrendingDown className="h-3 w-3 text-success" />}
              <p className={`text-xs ${stat.trend === "neutral" ? "text-muted-foreground" : "text-success"}`}>
                {stat.change}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}