// src/ai/flows/suggest-voice-search-keywords.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting conversational keywords relevant to a business and location for voice search optimization.
 *
 * - suggestVoiceSearchKeywords - A function that suggests voice search keywords.
 * - SuggestVoiceSearchKeywordsInput - The input type for the suggestVoiceSearchKeywords function.
 * - SuggestVoiceSearchKeywordsOutput - The return type for the suggestVoiceSearchKeywords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestVoiceSearchKeywordsInputSchema = z.object({
  businessType: z.string().describe('The type of business (e.g., restaurant, plumber).'),
  location: z.string().describe('The location of the business (e.g., city, state).'),
  businessName: z.string().describe('The name of the business (e.g. "Acme Burgers").'),
});
export type SuggestVoiceSearchKeywordsInput = z.infer<typeof SuggestVoiceSearchKeywordsInputSchema>;

const SuggestVoiceSearchKeywordsOutputSchema = z.object({
  keywords: z.array(
    z.string().describe('A conversational keyword relevant to the business and location.')
  ).describe('A list of suggested conversational keywords for voice search optimization.'),
});
export type SuggestVoiceSearchKeywordsOutput = z.infer<typeof SuggestVoiceSearchKeywordsOutputSchema>;

export async function suggestVoiceSearchKeywords(input: SuggestVoiceSearchKeywordsInput): Promise<SuggestVoiceSearchKeywordsOutput> {
  return suggestVoiceSearchKeywordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestVoiceSearchKeywordsPrompt',
  input: {schema: SuggestVoiceSearchKeywordsInputSchema},
  output: {schema: SuggestVoiceSearchKeywordsOutputSchema},
  prompt: `You are an expert in voice search optimization. Your task is to suggest a list of conversational keywords that people might use when searching for a business like the one described in the input. The keywords should be relevant to the business type, location, and business name.

Business Type: {{{businessType}}}
Location: {{{location}}}
Business Name: {{{businessName}}}

Please provide a list of conversational keywords that people might use when searching for this business via voice search.  These keywords should target near me queries and contain conversational keywords.

For example, a good keyword for "Acme Burgers" in "Los Angeles" might be:

"Where is the best burger near me in Los Angeles?"

Keywords:`, // Ensure the 'Keywords:' prefix is present
});

const suggestVoiceSearchKeywordsFlow = ai.defineFlow(
  {
    name: 'suggestVoiceSearchKeywordsFlow',
    inputSchema: SuggestVoiceSearchKeywordsInputSchema,
    outputSchema: SuggestVoiceSearchKeywordsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
