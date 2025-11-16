import type { UserRole } from './rbac';

export type RoleGroup = 'Management' | 'Supervisor' | 'Field' | 'Viewer';

export const ROLE_TO_GROUP: Record<UserRole, RoleGroup> = {
  OrgAdmin: 'Management',
  ProjectManager: 'Management',
  HSEManager: 'Management',
  SiteSupervisor: 'Supervisor',
  FieldTech: 'Field',
  Subcontractor: 'Field',
  ClientViewer: 'Viewer',
};

/**
 * Normalizes role strings to match UserRole enum
 * Handles case-insensitive matching for session-auth vs OAuth differences
 */
export function normalizeRole(role: string): UserRole {
  const roleLower = role.toLowerCase();
  
  // Map lowercase variants to canonical UserRole
  const roleMap: Record<string, UserRole> = {
    'orgadmin': 'OrgAdmin',
    'projectmanager': 'ProjectManager',
    'hsemanager': 'HSEManager',
    'sitesupervisor': 'SiteSupervisor',
    'fieldtech': 'FieldTech',
    'subcontractor': 'Subcontractor',
    'clientviewer': 'ClientViewer',
  };
  
  return roleMap[roleLower] || role as UserRole;
}

export function getRoleGroup(role: UserRole): RoleGroup {
  // Normalize role to handle session-auth vs OAuth differences
  const normalizedRole = normalizeRole(role);
  return ROLE_TO_GROUP[normalizedRole] || 'Field';
}

export type DashboardWidget = 
  | 'stats'
  | 'activeJobs'
  | 'recentForms'
  | 'incidentAlerts'
  | 'quickFormActions'
  | 'mySubmissions';

export const DASHBOARD_WIDGETS: Record<RoleGroup, DashboardWidget[]> = {
  Management: ['stats', 'activeJobs', 'recentForms', 'incidentAlerts'],
  Supervisor: ['stats', 'activeJobs', 'recentForms', 'incidentAlerts'],
  Field: ['quickFormActions', 'mySubmissions', 'incidentAlerts'],
  Viewer: ['stats', 'incidentAlerts'],
};

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export interface NavItem {
  title: string;
  icon: string;
  url: string;
  capability?: string;
}

export const NAVIGATION_CONFIG: Record<RoleGroup, NavSection[]> = {
  Management: [
    {
      items: [
        { title: 'Dashboard', icon: 'Home', url: '/' },
        { title: 'Jobs', icon: 'Briefcase', url: '/jobs' },
        { title: 'Sites', icon: 'MapPin', url: '/sites' },
      ],
    },
    {
      label: 'Work',
      items: [
        { title: 'Today', icon: 'Clipboard', url: '/today' },
        { title: 'Forms', icon: 'FileText', url: '/forms' },
        { title: 'Submissions', icon: 'FolderCheck', url: '/submissions' },
        { title: 'Variations', icon: 'ClipboardList', url: '/variations' },
        { title: 'Incidents', icon: 'AlertTriangle', url: '/incidents' },
      ],
    },
    {
      label: 'Safety',
      items: [
        { title: 'Inspections', icon: 'CheckSquare', url: '/safety/inspections' },
        { title: 'Training', icon: 'HardHat', url: '/safety/training' },
      ],
    },
    {
      label: 'Admin',
      items: [
        { title: 'Reports', icon: 'FileText', url: '/submissions' },
        { title: 'Form Builder', icon: 'FilePlus', url: '/form-builder' },
        { title: 'Users & Roles', icon: 'Users', url: '/admin/users', capability: 'canManageUsers' },
        { title: 'Settings', icon: 'Settings', url: '/settings', capability: 'canManageUsers' },
      ],
    },
  ],
  Supervisor: [
    {
      items: [
        { title: 'Dashboard', icon: 'Home', url: '/' },
        { title: 'Jobs', icon: 'Briefcase', url: '/jobs' },
        { title: 'Sites', icon: 'MapPin', url: '/sites' },
      ],
    },
    {
      label: 'Work',
      items: [
        { title: 'Today', icon: 'Clipboard', url: '/today' },
        { title: 'Forms', icon: 'FileText', url: '/forms' },
        { title: 'Submissions', icon: 'FolderCheck', url: '/submissions' },
        { title: 'Variations', icon: 'ClipboardList', url: '/variations' },
        { title: 'Incidents', icon: 'AlertTriangle', url: '/incidents' },
      ],
    },
    {
      label: 'Safety',
      items: [
        { title: 'Inspections', icon: 'CheckSquare', url: '/safety/inspections' },
        { title: 'Training', icon: 'HardHat', url: '/safety/training' },
      ],
    },
  ],
  Field: [
    {
      items: [
        { title: 'Forms', icon: 'FileText', url: '/forms' },
        { title: 'Today', icon: 'Clipboard', url: '/today' },
        { title: 'My Submissions', icon: 'FolderCheck', url: '/submissions' },
      ],
    },
    {
      label: 'Support',
      items: [
        { title: 'Help', icon: 'HelpCircle', url: '/help' },
      ],
    },
  ],
  Viewer: [
    {
      items: [
        { title: 'Dashboard', icon: 'Home', url: '/' },
        { title: 'Jobs', icon: 'Briefcase', url: '/jobs' },
        { title: 'Sites', icon: 'MapPin', url: '/sites' },
      ],
    },
    {
      label: 'Reports',
      items: [
        { title: 'Submissions', icon: 'FolderCheck', url: '/submissions' },
        { title: 'Incidents', icon: 'AlertTriangle', url: '/incidents' },
      ],
    },
  ],
};
