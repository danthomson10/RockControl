import { DashboardStats } from "@/components/dashboard-stats";
import { RecentForms } from "@/components/recent-forms";
import { ActiveJobs } from "@/components/active-jobs";
import { IncidentAlerts } from "@/components/incident-alerts";

export default function Dashboard() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Welcome back, John. Here's what's happening today.</p>
      </div>

      <DashboardStats />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <RecentForms />
        <IncidentAlerts />
      </div>

      <ActiveJobs />
    </div>
  );
}