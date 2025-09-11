'use server';
/**
 * @fileOverview A flow for generating a JSON-LD schema from a given URL.
 *
 * - generateSchemaFromUrl - Fetches content from a URL and uses AI to generate a schema.
 * - GenerateSchemaInput - The input type for the flow.
 * - GenerateSchemaOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { load } from 'cheerio';

const GenerateSchemaInputSchema = z.object({
  url: z.string().url().describe('The URL of the webpage to analyze.'),
});
export type GenerateSchemaInput = z.infer<typeof GenerateSchemaInputSchema>;

const GenerateSchemaOutputSchema = z.object({
    schema: z.any().describe("The generated JSON-LD schema object."),
});
export type GenerateSchemaOutput = z.infer<typeof GenerateSchemaOutputSchema>;


const fetchPageContentTool = ai.defineTool(
    {
        name: 'fetchPageContent',
        description: 'Fetches the HTML content of a given URL and extracts the main text content.',
        inputSchema: z.object({ url: z.string().url() }),
        outputSchema: z.string(),
    },
    async ({ url }) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            // Use cheerio to parse the HTML and extract text from the body
            const $ = load(html);
            // Attempt to find the main content area, otherwise fallback to the whole body
            const mainContent = $('main').text() || $('body').text();
            // Clean up the text by removing excessive whitespace
            return mainContent.replace(/\s\s+/g, ' ').trim();
        } catch (error) {
            console.error('Error fetching page content:', error);
            return 'Failed to fetch or process page content.';
        }
    }
);


const generateSchemaFromUrlFlow = ai.defineFlow(
  {
    name: 'generateSchemaFromUrlFlow',
    inputSchema: GenerateSchemaInputSchema,
    outputSchema: GenerateSchemaOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
      name: 'schemaFromUrlPrompt',
      input: { schema: z.object({url: z.string()}) },
      output: { schema: GenerateSchemaOutputSchema },
      tools: [fetchPageContentTool],
      prompt: `
        You are an expert at creating voice-search-optimized JSON-LD schema markup, following schema.org standards.
        Your task is to analyze the content of the given URL and generate a comprehensive and accurate JSON-LD schema.

        1.  **Fetch Content**: Use the 'fetchPageContent' tool to get the text content of the URL: ${input.url}.
        2.  **Identify Entity Type**: From the content, identify the most appropriate schema.org type for the 'mainEntity'. You MUST choose from this list: [LocalBusiness, Restaurant, HVACBusiness, ProfessionalService, HomeAndConstructionBusiness, MedicalBusiness, LegalService, AutomotiveBusiness, Article]. Default to 'LocalBusiness' if unsure.
        3.  **Extract Information**: Extract all relevant information for the main entity: name, description, address, phone number, email, services offered, opening hours, etc.
        4.  **Create Voice-Optimized Description**: The 'description' field for the main entity should be conversational and concise (20-30 words), suitable for a voice assistant to read aloud.
        5.  **Construct Schema**: Build a valid JSON-LD schema. The root object MUST be of '@type': 'WebPage'. The business/article information should be nested inside the 'mainEntity' property. This is crucial for validation.
        6.  **Add Speakable Property**: To the root 'WebPage' object, add a 'speakable' property with a "SpeakableSpecification" type. For the 'cssSelector' field, suggest some likely CSS selectors where the main content can be found (e.g., ["#main-content", ".article-body", "[role=main]"]). Do not invent specific, complex selectors that are unlikely to exist. Base your suggestions on the content you analyzed.
        
        Return only the generated JSON object. Do not include any explanatory text.
      `,
    });
    
    const { output } = await prompt({url: input.url});
    if (!output) {
      throw new Error('Failed to generate schema from URL.');
    }
    return output;
  }
);


export async function generateSchemaFromUrl(input: GenerateSchemaInput): Promise<GenerateSchemaOutput> {
  return await generateSchemaFromUrlFlow(input);
}
