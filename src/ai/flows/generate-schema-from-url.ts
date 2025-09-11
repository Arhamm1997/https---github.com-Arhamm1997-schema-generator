'use server';

/**
 * @fileOverview A flow that generates schema markup from a given URL.
 *
 * - generateSchemaFromUrl - A function that takes a URL and generates schema markup for it.
 * - GenerateSchemaFromUrlInput - The input type for the generateSchemaFromUrl function.
 * - GenerateSchemaFromUrlOutput - The return type for the generateSchemaFromUrl function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSchemaFromUrlInputSchema = z.object({
  url: z.string().url().describe('The URL of the page to generate schema for.'),
});
export type GenerateSchemaFromUrlInput = z.infer<typeof GenerateSchemaFromUrlInputSchema>;

const GenerateSchemaFromUrlOutputSchema = z.object({
  schema: z.string().describe('The generated schema markup.'),
});
export type GenerateSchemaFromUrlOutput = z.infer<typeof GenerateSchemaFromUrlOutputSchema>;

export async function generateSchemaFromUrl(input: GenerateSchemaFromUrlInput): Promise<GenerateSchemaFromUrlOutput> {
  return generateSchemaFromUrlFlow(input);
}

const generateSchemaFromUrlPrompt = ai.definePrompt({
  name: 'generateSchemaFromUrlPrompt',
  input: {schema: GenerateSchemaFromUrlInputSchema},
  output: {schema: GenerateSchemaFromUrlOutputSchema},
  prompt: `You are an expert in generating schema markup for web pages.

  Given the content of the following URL, generate the most relevant schema markup.

  URL: {{{url}}}

  Consider all aspects of the page content to create a comprehensive schema.
  Ensure that the generated schema is valid and adheres to the latest standards.
  The schema should be a single string.
  `,  
});

const generateSchemaFromUrlFlow = ai.defineFlow(
  {
    name: 'generateSchemaFromUrlFlow',
    inputSchema: GenerateSchemaFromUrlInputSchema,
    outputSchema: GenerateSchemaFromUrlOutputSchema,
  },
  async input => {
    const {output} = await generateSchemaFromUrlPrompt(input);
    return output!;
  }
);
