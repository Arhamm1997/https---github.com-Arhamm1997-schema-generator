'use server';

/**
 * @fileOverview A flow to generate answers for FAQ questions.
 *
 * - generateFaqAnswers - A function that generates answers for FAQ questions.
 * - GenerateFaqAnswersInput - The input type for the generateFaqAnswers function.
 * - GenerateFaqAnswersOutput - The return type for the generateFaqAnswers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFaqAnswersInputSchema = z.object({
  questions: z
    .string()
    .describe('A list of FAQ questions, separated by newlines.'),
});

export type GenerateFaqAnswersInput = z.infer<typeof GenerateFaqAnswersInputSchema>;

const GenerateFaqAnswersOutputSchema = z.object({
  answers: z
    .string()
    .describe('A list of answers corresponding to the input questions, separated by newlines.'),
});

export type GenerateFaqAnswersOutput = z.infer<typeof GenerateFaqAnswersOutputSchema>;

export async function generateFaqAnswers(input: GenerateFaqAnswersInput): Promise<GenerateFaqAnswersOutput> {
  return generateFaqAnswersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFaqAnswersPrompt',
  input: {schema: GenerateFaqAnswersInputSchema},
  output: {schema: GenerateFaqAnswersOutputSchema},
  prompt: `You are an expert at answering frequently asked questions.

  Given the following questions, generate detailed answers. The answers should be clear, concise, and helpful.
  Separate each answer with a newline.

  Questions:\n{{questions}}`,
});

const generateFaqAnswersFlow = ai.defineFlow(
  {
    name: 'generateFaqAnswersFlow',
    inputSchema: GenerateFaqAnswersInputSchema,
    outputSchema: GenerateFaqAnswersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
