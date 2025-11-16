import { Home, Briefcase, MapPin, Clipboard, CheckSquare, AlertTriangle, FileText, Users, Settings, HelpCircle, ClipboardList, HardHat, FilePlus, FolderCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { title: "Dashboard", icon: Home, url: "/" },
  { title: "Jobs", icon: Briefcase, url: "/jobs" },
  { title: "Sites", icon: MapPin, url: "/sites" },
];

const workItems = [
  { title: "Today", icon: Clipboard, url: "/today" },
  { title: "Forms", icon: FileText, url: "/forms" },
  { title: "Submissions", icon: FolderCheck, url: "/submissions" },
  { title: "Variations", icon: ClipboardList, url: "/variations" },
  { title: "Incidents", icon: AlertTriangle, url: "/incidents" },
];

const safetyItems = [
  { title: "Incidents", icon: AlertTriangle, url: "/safety/incidents" },
  { title: "Inspections", icon: CheckSquare, url: "/safety/inspections" },
  { title: "Training", icon: HardHat, url: "/safety/training" },
];

const adminItems = [
  { title: "Form Builder", icon: FilePlus, url: "/form-builder" },
  { title: "Users & Roles", icon: Users, url: "/admin/users" },
  { title: "Settings", icon: Settings, url: "/admin/settings" },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-primary">ROCK</span>
            <span className="text-xl font-bold text-foreground">CONTROL</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Safety & Project Management</p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={`nav-${item.title.toLowerCase()}`}>
                    <a href={item.url} className="hover-elevate">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Work</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={`nav-${item.title.toLowerCase()}`}>
                    <a href={item.url} className="hover-elevate">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Safety</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {safetyItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={`nav-safety-${item.title.toLowerCase()}`}>
                    <a href={item.url} className="hover-elevate">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={`nav-admin-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                    <a href={item.url} className="hover-elevate">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-testid="nav-help">
                  <a href="/help" className="hover-elevate">
                    <HelpCircle className="h-4 w-4" />
                    <span>Help</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 hover-elevate rounded-lg p-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">JD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">Site Supervisor</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}