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

export function getRoleGroup(role: UserRole): RoleGroup {
  return ROLE_TO_GROUP[role] || 'Field';
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
        { title: 'Users & Roles', icon: 'Users', url: '/admin/users' },
        { title: 'Settings', icon: 'Settings', url: '/admin/settings' },
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
