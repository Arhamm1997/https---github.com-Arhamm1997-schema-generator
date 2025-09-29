import OpenAI from 'openai';
import { AIProviderInterface, AIProvider, AIResponse } from './types';

export class OpenAIProvider implements AIProviderInterface {
  private client?: OpenAI;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = new OpenAI({ 
        apiKey,
        dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
      });
    }
  }

  async generateContent(prompt: string, model: string = 'gpt-4o-mini'): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not configured. Please provide an API key.');
    }

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        content,
        provider: 'openai' as AIProvider,
        model
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConfigured(): boolean {
    // Only rely on the provided API key for client-side usage  
    return !!this.apiKey;
  }

  getModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini', 
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ];
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }
}