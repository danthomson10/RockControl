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
import { useAuth } from "@/hooks/useAuth";
import { getRoleGroup, NAVIGATION_CONFIG } from "@shared/rbac-config";
import { useMemo } from "react";

const iconMap: Record<string, any> = {
  Home,
  Briefcase,
  MapPin,
  Clipboard,
  CheckSquare,
  AlertTriangle,
  FileText,
  Users,
  Settings,
  HelpCircle,
  ClipboardList,
  HardHat,
  FilePlus,
  FolderCheck,
};

export function AppSidebar() {
  const { user } = useAuth();
  
  const navSections = useMemo(() => {
    if (!user) return [];
    const roleGroup = getRoleGroup(user.role);
    return NAVIGATION_CONFIG[roleGroup];
  }, [user]);

  const initials = useMemo(() => {
    if (!user) return 'U';
    const parts = user.name?.split(' ') || ['User'];
    return parts.length > 1 
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }, [user]);

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
        {navSections.map((section, sectionIndex) => (
          <SidebarGroup key={sectionIndex}>
            {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = iconMap[item.icon];
                  const testId = section.label 
                    ? `nav-${section.label.toLowerCase()}-${item.title.toLowerCase().replace(/\s/g, '-')}`
                    : `nav-${item.title.toLowerCase().replace(/\s/g, '-')}`;
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-testid={testId}>
                        <a href={item.url} className="hover-elevate">
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 hover-elevate rounded-lg p-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role || 'Worker'}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}