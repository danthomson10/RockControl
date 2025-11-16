import axios from 'axios';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

class MicrosoftGraphClient {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private cachedToken: CachedToken | null = null;

  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID || '';
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
    this.tenantId = process.env.MICROSOFT_TENANT_ID || '';

    if (!this.clientId || !this.clientSecret || !this.tenantId) {
      console.warn('Microsoft Graph credentials not configured');
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    try {
      const response = await axios.post<TokenResponse>(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const expiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
      this.cachedToken = {
        token: response.data.access_token,
        expiresAt,
      };

      return this.cachedToken.token;
    } catch (error: any) {
      console.error('Failed to get Microsoft Graph access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Microsoft Graph');
    }
  }

  async getSiteId(siteUrl: string): Promise<string> {
    const token = await this.getAccessToken();
    
    const hostname = new URL(siteUrl).hostname;
    const sitePath = new URL(siteUrl).pathname;
    
    try {
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.id;
    } catch (error: any) {
      console.error('Failed to get SharePoint site ID:', error.response?.data || error.message);
      throw new Error('Failed to access SharePoint site');
    }
  }

  async getListId(siteId: string, listTitle: string): Promise<string> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const list = response.data.value.find((l: any) => 
        l.displayName === listTitle || l.name === listTitle
      );
      
      if (!list) {
        throw new Error(`List "${listTitle}" not found`);
      }
      
      return list.id;
    } catch (error: any) {
      console.error('Failed to get SharePoint list ID:', error.response?.data || error.message);
      throw new Error('Failed to access SharePoint list');
    }
  }

  async createListItem(siteId: string, listId: string, fields: Record<string, any>): Promise<any> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.post(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
        {
          fields,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to create SharePoint list item:', error.response?.data || error.message);
      throw new Error('Failed to create item in SharePoint');
    }
  }

  async updateListItem(
    siteId: string,
    listId: string,
    itemId: string,
    fields: Record<string, any>
  ): Promise<any> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.patch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}`,
        {
          fields,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to update SharePoint list item:', error.response?.data || error.message);
      throw new Error('Failed to update item in SharePoint');
    }
  }

  async getListItem(siteId: string, listId: string, itemId: string): Promise<any> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}?expand=fields`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to get SharePoint list item:', error.response?.data || error.message);
      throw new Error('Failed to get item from SharePoint');
    }
  }

  async getListColumns(siteId: string, listId: string): Promise<any[]> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/columns`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      return response.data.value;
    } catch (error: any) {
      console.error('Failed to get SharePoint list columns:', error.response?.data || error.message);
      throw new Error('Failed to get list schema from SharePoint');
    }
  }
}

export const graphClient = new MicrosoftGraphClient();
