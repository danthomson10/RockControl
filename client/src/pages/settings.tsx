import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings as SettingsIcon, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { hasCapability } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateOrganizationSchema, type UpdateOrganization, type User, type Organization } from "@shared/schema";
import { ROLE_CAPABILITIES, type UserRole, type Capability } from "@shared/rbac";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Check authorization - only users with canManageUsers can access settings
  useEffect(() => {
    if (currentUser && !hasCapability(currentUser, "canManageUsers")) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access settings.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [currentUser, setLocation, toast]);

  // If user is not authorized, don't render anything
  if (!currentUser || !hasCapability(currentUser, "canManageUsers")) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold" data-testid="heading-settings">Settings</h1>
      </div>

      <Tabs defaultValue="organization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organization" data-testid="tab-trigger-organization">
            Organization
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-trigger-users">
            User Management
          </TabsTrigger>
          <TabsTrigger value="permissions" data-testid="tab-trigger-permissions">
            Role Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" data-testid="tab-organization">
          <OrganizationTab />
        </TabsContent>

        <TabsContent value="users" data-testid="tab-users">
          <UserManagementTab currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="permissions" data-testid="tab-permissions">
          <RolePermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrganizationTab() {
  const { toast } = useToast();

  const { data: organization, isLoading } = useQuery<Organization>({
    queryKey: ["/api/settings/organization"],
  });

  const form = useForm<UpdateOrganization>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: "",
      domain: "",
    },
  });

  // Update form when organization data loads
  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        domain: organization.domain,
      });
    }
  }, [organization, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateOrganization) => {
      return await apiRequest("/api/settings/organization", {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/organization"] });
      toast({
        title: "Success",
        description: "Organization details updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateOrganization) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-organization-title">Organization Details</CardTitle>
        <CardDescription>
          Manage your organization's basic information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-organization-name"
                      placeholder="Enter organization name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-organization-domain"
                      placeholder="Enter domain"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {organization && (
              <div className="flex items-center gap-2">
                <Label>Status:</Label>
                <span
                  className="text-sm font-medium"
                  data-testid="text-organization-status"
                >
                  {organization.active ? "Active" : "Inactive"}
                </span>
              </div>
            )}

            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save-organization"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function UserManagementTab({ currentUser }: { currentUser: User }) {
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/settings/users"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: { role?: string; active?: boolean } }) => {
      return await apiRequest(`/api/settings/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/users"] });
      toast({
        title: "Success",
        description: "User settings updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user settings.",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: number, role: string) => {
    updateUserMutation.mutate({ userId, data: { role, active: users?.find(u => u.id === userId)?.active } });
  };

  const handleActiveToggle = (userId: number, active: boolean) => {
    updateUserMutation.mutate({ userId, data: { active, role: users?.find(u => u.id === userId)?.role } });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-user-management-title">User Management</CardTitle>
        <CardDescription>
          Manage user roles and access for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead data-testid="header-name">Name</TableHead>
                <TableHead data-testid="header-email">Email</TableHead>
                <TableHead data-testid="header-role">Role</TableHead>
                <TableHead data-testid="header-status">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => {
                  const isCurrentUser = user.id === currentUser.id;
                  return (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell data-testid={`text-user-name-${user.id}`}>
                        {user.name}
                        {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
                      </TableCell>
                      <TableCell data-testid={`text-user-email-${user.id}`}>
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={isCurrentUser || updateUserMutation.isPending}
                        >
                          <SelectTrigger
                            className="w-48"
                            data-testid={`select-user-role-${user.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OrgAdmin">Org Admin</SelectItem>
                            <SelectItem value="ProjectManager">Project Manager</SelectItem>
                            <SelectItem value="HSEManager">HSE Manager</SelectItem>
                            <SelectItem value="SiteSupervisor">Site Supervisor</SelectItem>
                            <SelectItem value="FieldTech">Field Tech</SelectItem>
                            <SelectItem value="ClientViewer">Client Viewer</SelectItem>
                            <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.active}
                            onCheckedChange={(checked) => handleActiveToggle(user.id, checked)}
                            disabled={isCurrentUser || updateUserMutation.isPending}
                            data-testid={`switch-user-active-${user.id}`}
                          />
                          <span
                            className="text-sm"
                            data-testid={`text-user-status-${user.id}`}
                          >
                            {user.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function RolePermissionsTab() {
  const roles: UserRole[] = ['OrgAdmin', 'ProjectManager', 'HSEManager', 'SiteSupervisor', 'FieldTech', 'ClientViewer', 'Subcontractor'];
  const capabilities: Capability[] = ['canManageJobs', 'canManageForms', 'canManageIncidents', 'canManageUsers', 'canManageIntegrations', 'canViewAll'];

  const formatCapabilityName = (cap: string): string => {
    return cap
      .replace(/^can/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  };

  const formatRoleName = (role: string): string => {
    return role
      .replace(/([A-Z])/g, ' $1')
      .trim();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-permissions-title">Role Permissions Matrix</CardTitle>
        <CardDescription>
          View the capabilities assigned to each role (read-only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold" data-testid="header-capability">
                  Capability
                </TableHead>
                {roles.map((role) => (
                  <TableHead
                    key={role}
                    className="text-center font-bold"
                    data-testid={`header-role-${role}`}
                  >
                    {formatRoleName(role)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {capabilities.map((capability) => (
                <TableRow key={capability} data-testid={`row-capability-${capability}`}>
                  <TableCell className="font-medium" data-testid={`text-capability-${capability}`}>
                    {formatCapabilityName(capability)}
                  </TableCell>
                  {roles.map((role) => {
                    const hasPermission = ROLE_CAPABILITIES[role][capability];
                    return (
                      <TableCell
                        key={`${role}-${capability}`}
                        className="text-center"
                        data-testid={`cell-permission-${role}-${capability}`}
                      >
                        {hasPermission ? (
                          <Check className="h-5 w-5 text-success mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
