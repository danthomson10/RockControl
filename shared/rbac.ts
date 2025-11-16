export type UserRole = 
  | 'OrgAdmin'
  | 'ProjectManager'
  | 'HSEManager'
  | 'SiteSupervisor'
  | 'FieldTech'
  | 'ClientViewer'
  | 'Subcontractor';

export type Capability = 
  | 'canManageJobs'
  | 'canManageForms'
  | 'canManageIncidents'
  | 'canManageUsers'
  | 'canManageIntegrations'
  | 'canViewAll';

export const ROLE_CAPABILITIES: Record<UserRole, Record<Capability, boolean>> = {
  OrgAdmin: {
    canManageJobs: true,
    canManageForms: true,
    canManageIncidents: true,
    canManageUsers: true,
    canManageIntegrations: true,
    canViewAll: true,
  },
  ProjectManager: {
    canManageJobs: true,
    canManageForms: true,
    canManageIncidents: true,
    canManageUsers: false,
    canManageIntegrations: false,
    canViewAll: true,
  },
  HSEManager: {
    canManageJobs: true,
    canManageForms: true,
    canManageIncidents: true,
    canManageUsers: false,
    canManageIntegrations: false,
    canViewAll: true,
  },
  SiteSupervisor: {
    canManageJobs: false,
    canManageForms: true,
    canManageIncidents: true,
    canManageUsers: false,
    canManageIntegrations: false,
    canViewAll: true,
  },
  FieldTech: {
    canManageJobs: false,
    canManageForms: true,
    canManageIncidents: true,
    canManageUsers: false,
    canManageIntegrations: false,
    canViewAll: false,
  },
  ClientViewer: {
    canManageJobs: false,
    canManageForms: false,
    canManageIncidents: false,
    canManageUsers: false,
    canManageIntegrations: false,
    canViewAll: true,
  },
  Subcontractor: {
    canManageJobs: false,
    canManageForms: true,
    canManageIncidents: true,
    canManageUsers: false,
    canManageIntegrations: false,
    canViewAll: false,
  },
} as const;

export function hasCapability(role: UserRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.[capability] ?? false;
}

export function hasAnyCapability(role: UserRole, capabilities: Capability[]): boolean {
  return capabilities.some(cap => hasCapability(role, cap));
}

export function hasAllCapabilities(role: UserRole, capabilities: Capability[]): boolean {
  return capabilities.every(cap => hasCapability(role, cap));
}
