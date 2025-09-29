import { AIProviderInterface, AIProvider, AIResponse } from './types';
import { ai, createAI } from '../genkit';

export class GeminiProvider implements AIProviderInterface {
  private apiKey?: string;
  private aiInstance: any;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.aiInstance = apiKey ? createAI(apiKey) : ai;
  }

  async generateContent(prompt: string, model: string = 'googleai/gemini-2.0-flash-exp'): Promise<AIResponse> {
    if (!this.apiKey && !process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Please provide an API key.');
    }

    try {
      // Use the configured AI instance
      const response = await this.aiInstance.generate({
        model: model,
        prompt: prompt,
      });

      return {
        content: response.text || '',
        provider: 'gemini' as AIProvider,
        model: model
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConfigured(): boolean {
    // Check if API key is available from environment or provided
    return !!(this.apiKey || process.env.GOOGLE_GENAI_API_KEY);
  }

  getModels(): string[] {
    return [
      'googleai/gemini-2.0-flash-exp',
      'googleai/gemini-1.5-pro',
      'googleai/gemini-1.5-flash',
    ];
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    // Recreate AI instance with new API key
    this.aiInstance = createAI(apiKey);
  }
}