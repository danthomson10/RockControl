import { Search, Plus, WifiOff, Bell, ChevronDown, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import SearchCommand from "@/components/search-command";

export function TopBar() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isOffline] = useState(false); // todo: remove mock functionality
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-4">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      
      {/* Tenant Switcher - Hidden for now */}
      {/* <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 hidden sm:flex" data-testid="button-tenant-switcher">
            <span className="font-semibold">Acme Construction</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="tenant-acme">Acme Construction</DropdownMenuItem>
          <DropdownMenuItem data-testid="tenant-builders">Elite Builders Ltd</DropdownMenuItem>
          <DropdownMenuItem data-testid="tenant-infrastructure">Infrastructure Co</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu> */}

      <Button 
        variant="ghost" 
        size="icon" 
        className="sm:hidden" 
        data-testid="button-mobile-search"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search jobs, forms, incidents... (⌘K)"
            className="pl-9 cursor-pointer"
            data-testid="input-global-search"
            onClick={() => setSearchOpen(true)}
            readOnly
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="icon" className="sm:hidden" data-testid="button-quick-add-mobile">
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild data-testid="quick-add-take5">
              <a href="/forms" className="cursor-pointer">Take-5 Form</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild data-testid="quick-add-variation">
              <a href="/variations" className="cursor-pointer">Variation</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild data-testid="quick-add-incident">
              <a href="/forms" className="cursor-pointer">Incident Report</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="quick-add-photo" disabled>Upload Photo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="gap-2 hidden sm:flex" data-testid="button-quick-add">
              <Plus className="h-4 w-4" />
              <span>Quick Add</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild data-testid="quick-add-take5">
              <a href="/forms" className="cursor-pointer">Take-5 Form</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild data-testid="quick-add-variation">
              <a href="/variations" className="cursor-pointer">Variation</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild data-testid="quick-add-incident">
              <a href="/forms" className="cursor-pointer">Incident Report</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="quick-add-photo" disabled>Upload Photo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isOffline && (
          <Badge variant="secondary" className="gap-1 hidden sm:flex" data-testid="badge-offline">
            <WifiOff className="h-3 w-3" />
            <span className="hidden md:inline">Offline</span>
          </Badge>
        )}

        <Button variant="ghost" size="icon" className="relative hidden sm:flex" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
            3
          </span>
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden sm:flex" data-testid="button-theme-toggle">
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden" data-testid="button-user-menu-mobile">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">john.doe@acme.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-profile">Profile</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings">Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === "light" ? "Dark mode" : "Light mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-logout">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 hidden sm:flex" data-testid="button-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">JD</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">john.doe@acme.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-profile">Profile</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings">Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-logout">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}