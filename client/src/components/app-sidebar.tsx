import { Home, Briefcase, MapPin, Clipboard, CheckSquare, AlertTriangle, FileText, Users, Settings, HelpCircle, ClipboardList, HardHat, FilePlus, FolderCheck, User as UserIcon, LogOut } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { getRoleGroup, NAVIGATION_CONFIG } from "@shared/rbac-config";
import { hasCapability } from "@/lib/rbac";
import { useMemo } from "react";
import { Link } from "wouter";

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
  const { user, logout } = useAuth();
  
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
        {navSections.map((section, sectionIndex) => {
          // Filter items based on user capabilities
          const filteredItems = section.items.filter((item) => {
            // If item has a capability requirement, check if user has it
            if (item.capability && user) {
              return hasCapability(user, item.capability as any);
            }
            // If no capability requirement, show the item
            return true;
          });

          // Don't render empty sections
          if (filteredItems.length === 0) return null;

          return (
            <SidebarGroup key={sectionIndex}>
              {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredItems.map((item) => {
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
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-3 hover-elevate rounded-lg p-2"
              data-testid="button-user-menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" data-testid="link-profile">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            {user && (hasCapability(user, 'canManageUsers') || hasCapability(user, 'canManageIntegrations')) && (
              <DropdownMenuItem asChild>
                <Link href="/settings" data-testid="link-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} data-testid="button-logout">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}