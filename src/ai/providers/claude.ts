import Anthropic from '@anthropic-ai/sdk';
import { AIProviderInterface, AIProvider, AIResponse } from './types';

export class ClaudeProvider implements AIProviderInterface {
  private client?: Anthropic;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = new Anthropic({ 
        apiKey,
        dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
      });
    }
  }

  async generateContent(prompt: string, model: string = 'claude-3-5-haiku-20241022'): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Claude client not configured. Please provide an API key.');
    }

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Extract text content from Claude's response format
      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('');

      return {
        content,
        provider: 'claude' as AIProvider,
        model
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Claude generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConfigured(): boolean {
    // Only rely on the provided API key for client-side usage
    return !!this.apiKey;
  }

  getModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new Anthropic({ 
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }
}