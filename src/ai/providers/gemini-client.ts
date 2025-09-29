import { AIProviderInterface, AIProvider, AIResponse } from './types';

export class GeminiClientProvider implements AIProviderInterface {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async generateContent(prompt: string, model: string = 'gemini-2.0-flash-exp'): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please provide an API key.');
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        content,
        provider: 'gemini' as AIProvider,
        model
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConfigured(): boolean {
    // Only rely on the provided API key, not environment variables for client-side usage
    return !!this.apiKey;
  }

  getModels(): string[] {
    return [
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ];
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }
}