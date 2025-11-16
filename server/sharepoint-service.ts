import { graphClient } from './microsoft-graph';
import type { SharePointConfig } from '@shared/schema';

export interface IncidentReportData {
  'incident-date'?: string;
  'incident-time'?: string;
  'location'?: string;
  'incident-type'?: string;
  'severity'?: string;
  'description'?: string;
  'people-involved'?: string;
  'injuries'?: string;
  'injury-details'?: string;
  'witnesses'?: string;
  'immediate-actions'?: string;
  'equipment-involved'?: string;
  'weather-conditions'?: string[];
  'root-cause-category'?: string;
  'root-cause-analysis'?: string;
  'corrective-actions'?: string;
  'preventive-measures'?: string;
  'reported-by'?: string;
  'contact-number'?: string;
  signature?: string;
}

export interface CrewBriefingData {
  'project-site'?: string;
  'construction-pack-no'?: string;
  'drawings'?: string;
  'permit-worksafe'?: string[];
  'permit-height'?: string[];
  'permit-hotworks'?: string[];
  'site-engineer'?: string;
  'foreman'?: string;
  'vehicle-prestarts'?: string[];
  'machine-prestarts'?: string[];
  'toolbox-talk'?: string[];
  'additional-check'?: string[];
  'critical-risks'?: string;
  'site-plan'?: string;
  'key-tasks'?: string;
  'quality-tasks'?: string;
  'medical-centre'?: string;
  'site-address'?: string;
  'site-access'?: string;
  'first-aider'?: string;
  'rescue-procedure'?: string;
  'traffic-management'?: string;
  'site-communications'?: string;
  'environmental-hazards'?: string;
  'engineer-signoff'?: string;
  'foreman-signoff'?: string;
  'briefing-date'?: string;
}

export class SharePointService {
  private mapFieldsToSharePoint(formData: IncidentReportData, customMappings?: Record<string, string>): Record<string, any> {
    const defaultMappings: Record<string, string> = {
      'incident-date': 'IncidentDate',
      'incident-time': 'IncidentTime',
      'location': 'Location',
      'incident-type': 'IncidentType',
      'severity': 'Severity',
      'description': 'Description',
      'people-involved': 'PeopleInvolved',
      'injuries': 'Injuries',
      'injury-details': 'InjuryDetails',
      'witnesses': 'Witnesses',
      'immediate-actions': 'ImmediateActions',
      'equipment-involved': 'EquipmentInvolved',
      'weather-conditions': 'WeatherConditions',
      'root-cause-category': 'RootCauseCategory',
      'root-cause-analysis': 'RootCauseAnalysis',
      'corrective-actions': 'CorrectiveActions',
      'preventive-measures': 'PreventiveMeasures',
      'reported-by': 'ReportedBy',
      'contact-number': 'ContactNumber',
    };

    const mappings = customMappings || defaultMappings;
    const sharepointFields: Record<string, any> = {};

    for (const [rockControlField, sharepointField] of Object.entries(mappings)) {
      const value = formData[rockControlField as keyof IncidentReportData];
      
      if (value !== undefined && value !== null && value !== '') {
        if (rockControlField === 'incident-date') {
          sharepointFields[sharepointField] = this.formatDate(value as string);
        } else if (rockControlField === 'weather-conditions' && Array.isArray(value)) {
          sharepointFields[sharepointField] = value.join(', ');
        } else {
          sharepointFields[sharepointField] = value;
        }
      }
    }

    sharepointFields['Title'] = `Incident - ${formData.location || 'Unknown Location'} - ${formData['incident-date'] || new Date().toISOString().split('T')[0]}`;

    return sharepointFields;
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }

  async createIncidentInSharePoint(
    config: SharePointConfig,
    formData: IncidentReportData
  ): Promise<string> {
    if (!config.enabled) {
      throw new Error('SharePoint integration is not enabled for this organization');
    }

    if (!config.siteId || !config.incidentListId) {
      throw new Error('SharePoint site or list not configured');
    }

    const customMappings = config.fieldMappings as Record<string, string> | undefined;
    const fields = this.mapFieldsToSharePoint(formData, customMappings);

    try {
      const result = await graphClient.createListItem(
        config.siteId,
        config.incidentListId,
        fields
      );

      return result.id;
    } catch (error: any) {
      console.error('Failed to create incident in SharePoint:', error);
      throw new Error(`SharePoint sync failed: ${error.message}`);
    }
  }

  async updateIncidentInSharePoint(
    config: SharePointConfig,
    sharepointItemId: string,
    formData: IncidentReportData
  ): Promise<void> {
    if (!config.enabled) {
      throw new Error('SharePoint integration is not enabled for this organization');
    }

    if (!config.siteId || !config.incidentListId) {
      throw new Error('SharePoint site or list not configured');
    }

    const customMappings = config.fieldMappings as Record<string, string> | undefined;
    const fields = this.mapFieldsToSharePoint(formData, customMappings);

    try {
      await graphClient.updateListItem(
        config.siteId,
        config.incidentListId,
        sharepointItemId,
        fields
      );
    } catch (error: any) {
      console.error('Failed to update incident in SharePoint:', error);
      throw new Error(`SharePoint update failed: ${error.message}`);
    }
  }

  async initializeSharePointConfig(
    siteUrl: string,
    organizationId: number
  ): Promise<{ siteId: string; listId?: string; listName?: string }> {
    try {
      const siteId = await graphClient.getSiteId(siteUrl);
      
      return {
        siteId,
      };
    } catch (error: any) {
      console.error('Failed to initialize SharePoint config:', error);
      throw new Error(`Failed to connect to SharePoint: ${error.message}`);
    }
  }

  async discoverIncidentList(siteId: string, listNameHint?: string): Promise<{ listId: string; listName: string }> {
    try {
      const listId = await graphClient.getListId(siteId, listNameHint || 'Incident Reports');
      
      return {
        listId,
        listName: listNameHint || 'Incident Reports',
      };
    } catch (error: any) {
      console.error('Failed to discover incident list:', error);
      throw new Error(`Failed to find SharePoint list: ${error.message}`);
    }
  }

  async getListSchema(siteId: string, listId: string): Promise<any[]> {
    try {
      const columns = await graphClient.getListColumns(siteId, listId);
      return columns;
    } catch (error: any) {
      console.error('Failed to get SharePoint list schema:', error);
      throw new Error(`Failed to retrieve list schema: ${error.message}`);
    }
  }

  // ====== Crew Briefing Support ======

  private mapCrewBriefingFieldsToSharePoint(formData: CrewBriefingData): Record<string, any> {
    // Fixed mappings for Crew Briefing - do not accept custom mappings
    // to prevent incident report field mappings from clobbering these defaults.
    // Future: Add dedicated crewBriefingFieldMappings config key if customization needed
    const mappings: Record<string, string> = {
      'project-site': 'ProjectSite',
      'construction-pack-no': 'ConstructionPackNo',
      'drawings': 'Drawings',
      'permit-worksafe': 'PermitWorksafe',
      'permit-height': 'PermitHeight',
      'permit-hotworks': 'PermitHotworks',
      'site-engineer': 'SiteEngineer',
      'foreman': 'Foreman',
      'vehicle-prestarts': 'VehiclePrestarts',
      'machine-prestarts': 'MachinePrestarts',
      'toolbox-talk': 'ToolboxTalk',
      'additional-check': 'AdditionalCheck',
      'critical-risks': 'CriticalRisks',
      'site-plan': 'SitePlan',
      'key-tasks': 'KeyTasks',
      'quality-tasks': 'QualityTasks',
      'medical-centre': 'MedicalCentre',
      'site-address': 'SiteAddress',
      'site-access': 'SiteAccess',
      'first-aider': 'FirstAider',
      'rescue-procedure': 'RescueProcedure',
      'traffic-management': 'TrafficManagement',
      'site-communications': 'SiteCommunications',
      'environmental-hazards': 'EnvironmentalHazards',
      'engineer-signoff': 'EngineerSignoff',
      'foreman-signoff': 'ForemanSignoff',
      'briefing-date': 'BriefingDate',
    };

    const sharepointFields: Record<string, any> = {};

    for (const [rockControlField, sharepointField] of Object.entries(mappings)) {
      const value = formData[rockControlField as keyof CrewBriefingData];
      
      if (value !== undefined && value !== null && value !== '') {
        if (rockControlField === 'briefing-date') {
          sharepointFields[sharepointField] = this.formatDate(value as string);
        } else if (Array.isArray(value)) {
          // Checkbox fields come as arrays, convert to boolean for SharePoint Yes/No columns
          sharepointFields[sharepointField] = value.length > 0;
        } else {
          sharepointFields[sharepointField] = value;
        }
      }
    }

    sharepointFields['Title'] = `Crew Briefing - ${formData['project-site'] || 'Unknown Site'} - ${formData['briefing-date'] || new Date().toISOString().split('T')[0]}`;

    return sharepointFields;
  }

  async createCrewBriefingInSharePoint(
    config: SharePointConfig,
    formData: CrewBriefingData
  ): Promise<string> {
    if (!config.enabled) {
      throw new Error('SharePoint integration is not enabled for this organization');
    }

    if (!config.siteId) {
      throw new Error('SharePoint site not configured');
    }

    if (!config.crewBriefingListId) {
      throw new Error('Crew Briefing list ID is required. Please configure a SharePoint list for Crew Briefings with appropriate columns (ProjectSite, ConstructionPackNo, SiteEngineer, etc.)');
    }

    // Crew Briefing uses its own default mappings, not incident report custom mappings
    // Future: Add dedicated crewBriefingFieldMappings to config if custom mapping is needed
    const fields = this.mapCrewBriefingFieldsToSharePoint(formData);

    try {
      const result = await graphClient.createListItem(
        config.siteId,
        config.crewBriefingListId,
        fields
      );

      return result.id;
    } catch (error: any) {
      console.error('Failed to create crew briefing in SharePoint:', error);
      throw new Error(`SharePoint sync failed: ${error.message}`);
    }
  }
}

export const sharepointService = new SharePointService();
