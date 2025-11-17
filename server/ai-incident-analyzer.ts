import OpenAI from 'openai';

interface IncidentData {
  formData: Record<string, any>;
  formCode: string;
  type: string;
}

interface AnalysisResult {
  summary: string;
  recommendations: {
    immediateActions: string[];
    preventiveMeasures: string[];
    followUpTasks: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export class AIIncidentAnalyzer {
  private client: OpenAI | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.isConfigured = true;
      console.log('✅ AI Incident Analyzer initialized');
    } else {
      console.warn('⚠️  OpenAI API key not found - AI analysis will be disabled');
    }
  }

  async analyzeIncident(data: IncidentData): Promise<AnalysisResult | null> {
    if (!this.client || !this.isConfigured) {
      console.warn('⚠️  AI analysis skipped - service not configured');
      return null;
    }

    try {
      const { formData, formCode, type } = data;

      const prompt = `You are an expert Health & Safety analyst reviewing an incident report from a construction site. Analyze the following incident and provide actionable insights.

**Incident Report ${formCode}**

${this.formatIncidentData(formData)}

Please provide:
1. A concise executive summary (2-3 sentences)
2. Immediate actions required
3. Preventive measures to avoid recurrence
4. Follow-up tasks for management
5. Overall risk level assessment

Respond in JSON format matching this structure:
{
  "summary": "Brief executive summary",
  "recommendations": {
    "immediateActions": ["action 1", "action 2"],
    "preventiveMeasures": ["measure 1", "measure 2"],
    "followUpTasks": ["task 1", "task 2"],
    "riskLevel": "low|medium|high|critical"
  }
}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Health & Safety analyst specializing in construction site incident analysis. Provide clear, actionable recommendations based on industry best practices.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(content) as AnalysisResult;
      console.log(`✅ AI analysis completed for ${formCode}`);
      
      return analysis;
    } catch (error: any) {
      console.error('❌ AI analysis failed:', error.message);
      return null;
    }
  }

  private formatIncidentData(formData: Record<string, any>): string {
    const lines: string[] = [];

    if (formData.dateOfIncident || formData.incidentDate) {
      lines.push(`Date: ${formData.dateOfIncident || formData.incidentDate}`);
    }
    if (formData.timeOfIncident || formData.time) {
      lines.push(`Time: ${formData.timeOfIncident || formData.time}`);
    }
    if (formData.location) {
      lines.push(`Location: ${formData.location}`);
    }
    if (formData.incidentType) {
      lines.push(`Type: ${formData.incidentType}`);
    }
    if (formData.severity) {
      lines.push(`Severity: ${formData.severity}`);
    }
    if (formData.description || formData.incidentDescription) {
      lines.push(`\nDescription:\n${formData.description || formData.incidentDescription}`);
    }
    if (formData.peopleInvolved) {
      lines.push(`\nPeople Involved:\n${formData.peopleInvolved}`);
    }
    if (formData.wereThereInjuries) {
      lines.push(`\nInjuries: ${formData.wereThereInjuries}`);
    }
    if (formData.injuryDetails) {
      lines.push(`Injury Details: ${formData.injuryDetails}`);
    }
    if (formData.witnesses) {
      lines.push(`\nWitnesses:\n${formData.witnesses}`);
    }
    if (formData.immediateActionTaken || formData.immediateActions) {
      lines.push(`\nImmediate Actions Taken:\n${formData.immediateActionTaken || formData.immediateActions}`);
    }
    if (formData.equipmentInvolved) {
      lines.push(`\nEquipment Involved:\n${formData.equipmentInvolved}`);
    }

    return lines.join('\n');
  }
}

export const aiIncidentAnalyzer = new AIIncidentAnalyzer();
