import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { canManageJobs } from "@/lib/rbac";
import { Plus, Search, MapPin, Building2, User } from "lucide-react";
import type { Site } from "@shared/schema";

export default function SitesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });
  
  const canManageSites = canManageJobs(user);
  
  const filteredSites = sites?.filter(site => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      site.name.toLowerCase().includes(query) ||
      site.address.toLowerCase().includes(query) ||
      site.description?.toLowerCase().includes(query)
    );
  });
  
  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      archived: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    };
    return variants[status as keyof typeof variants] || variants.active;
  };
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
          <p className="text-muted-foreground mt-1">
            Manage construction sites and locations
          </p>
        </div>
        
        {canManageSites && (
          <Button data-testid="button-new-site">
            <Plus className="w-4 h-4 mr-2" />
            New Site
          </Button>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            data-testid="input-search-sites"
            placeholder="Search sites by name, address, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSites && filteredSites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSites.map((site) => (
            <Link
              key={site.id}
              href={`/sites/${site.id}`}
              data-testid={`link-site-${site.id}`}
            >
              <Card className="hover-elevate active-elevate-2 h-full transition-all cursor-pointer">
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-1">
                      {site.name}
                    </CardTitle>
                    <Badge
                      data-testid={`badge-status-${site.id}`}
                      className={getStatusBadge(site.status)}
                    >
                      {site.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-1">{site.address}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {site.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {site.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {site.clientId && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>Client Assigned</span>
                      </div>
                    )}
                    {site.projectManagerId && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>PM Assigned</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No sites found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? "Try adjusting your search" : "Get started by creating a new site"}
            </p>
            {canManageSites && !searchQuery && (
              <Button className="mt-4" data-testid="button-new-site-empty">
                <Plus className="w-4 h-4 mr-2" />
                New Site
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
