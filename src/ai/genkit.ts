import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Create a function to initialize the AI with API key
export function createAI(apiKey?: string) {
  // If API key is provided, set it as environment variable for genkit
  if (apiKey && typeof process !== 'undefined' && process.env) {
    process.env.GOOGLE_GENAI_API_KEY = apiKey;
  }
  
  return genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.0-flash-exp',
  });
}

// Default export with no API key (will use environment variables)
export const ai = createAI();
