import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import RequestAccess from "@/pages/request-access";
import Dashboard from "@/pages/dashboard";
import Forms from "@/pages/forms";
import FillForm from "@/pages/fill-form";
import FormBuilder from "@/pages/form-builder";
import Take5Form from "@/pages/take-5-form";
import VariationForm from "@/pages/variation-form";
import Submissions from "@/pages/submissions";
import Jobs from "@/pages/jobs";
import Sites from "@/pages/sites";
import JobDetailByCode from "@/pages/job-detail-by-code";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/request-access" component={RequestAccess} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/forms" component={Forms} />
      <Route path="/forms/:id" component={FillForm} />
      <Route path="/submissions" component={Submissions} />
      <Route path="/form-builder" component={FormBuilder} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/jobs/:code" component={JobDetailByCode} />
      <Route path="/sites" component={Sites} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthWrapper sidebarStyle={sidebarStyle}>
          <Router />
        </AuthWrapper>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthWrapper({ children, sidebarStyle }: { children: React.ReactNode; sidebarStyle: any }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show sidebar layout only for authenticated users
  if (isLoading || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}