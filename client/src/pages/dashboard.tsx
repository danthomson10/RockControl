import { useAuth } from "@/hooks/useAuth";
import { getRoleGroup } from "@shared/rbac-config";
import { AdminOverview } from "@/components/admin-overview";
import { FieldDashboard } from "@/components/field-dashboard";
import { IncidentAlerts } from "@/components/incident-alerts";
import { DashboardStats } from "@/components/dashboard-stats";

function ManagementDashboard() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Welcome back. Here's what's happening today.</p>
      </div>

      <AdminOverview />
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