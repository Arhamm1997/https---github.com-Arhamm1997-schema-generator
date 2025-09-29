import { AIProviderInterface, AIProvider, AIResponse } from './types';
import { ai } from '../genkit';

export class GeminiProvider implements AIProviderInterface {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async generateContent(prompt: string, model: string = 'googleai/gemini-2.5-flash'): Promise<AIResponse> {
    try {
      // Create a flow using the existing genkit setup
      const response = await ai.generate({
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
      'googleai/gemini-2.5-flash',
      'googleai/gemini-1.5-pro',
      'googleai/gemini-1.5-flash',
    ];
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }
}