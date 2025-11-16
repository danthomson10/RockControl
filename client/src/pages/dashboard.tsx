import { useAuth } from "@/hooks/useAuth";
import { getRoleGroup } from "@shared/rbac-config";
import { DashboardStats } from "@/components/dashboard-stats";
import { RecentForms } from "@/components/recent-forms";
import { ActiveJobs } from "@/components/active-jobs";
import { IncidentAlerts } from "@/components/incident-alerts";
import { FieldDashboard } from "@/components/field-dashboard";

function ManagementDashboard() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Welcome back. Here's what's happening today.</p>
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

function ViewerDashboard() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Project overview and insights</p>
      </div>

      <DashboardStats />

      <IncidentAlerts />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  
  if (!user) {
    return null;
  }

  const roleGroup = getRoleGroup(user.role);

  switch (roleGroup) {
    case 'Field':
      return <FieldDashboard />;
    case 'Viewer':
      return <ViewerDashboard />;
    case 'Management':
    case 'Supervisor':
    default:
      return <ManagementDashboard />;
  }
}