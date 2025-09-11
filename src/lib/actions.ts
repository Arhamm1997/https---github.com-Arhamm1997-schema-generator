'use server';

import { z } from 'zod';
import { generateFaqAnswers } from '@/ai/flows/generate-faq-answers';
import { generateSchemaFromUrl } from '@/ai/flows/generate-schema-from-url';
import { suggestVoiceSearchKeywords } from '@/ai/flows/suggest-voice-search-keywords';

const urlSchema = z.string().url();
const faqSchema = z.object({ questions: z.string().min(1) });
const voiceSearchSchema = z.object({
  businessType: z.string().min(1),
  location: z.string().min(1),
  businessName: z.string().min(1),
});

export async function getSchemaFromUrlAction(prevState: any, formData: FormData) {
  const url = formData.get('url');
  const validatedUrl = urlSchema.safeParse(url);

  if (!validatedUrl.success) {
    return { success: false, error: 'Please provide a valid URL.' };
  }

  try {
    const result = await generateSchemaFromUrl({ url: validatedUrl.data });
    return { success: true, data: result.schema };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to generate schema from URL.' };
  }
}

export async function generateFaqAnswersAction(prevState: any, formData: FormData) {
    const questions = formData.get('questions');
    const validatedFaq = faqSchema.safeParse({ questions });

    if (!validatedFaq.success) {
        return { success: false, error: 'Please provide at least one question.' };
    }

    try {
        const result = await generateFaqAnswers({ questions: validatedFaq.data.questions });
        return { success: true, data: result.answers };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to generate FAQ answers.' };
    }
}

export async function suggestKeywordsAction(prevState: any, formData: FormData) {
    const businessType = formData.get('businessType');
    const location = formData.get('location');
    const businessName = formData.get('businessName');

    const validatedVoiceSearch = voiceSearchSchema.safeParse({
        businessType,
        location,
        businessName,
    });

    if (!validatedVoiceSearch.success) {
        return { success: false, error: 'Please fill in all fields.' };
    }
    
    try {
        const result = await suggestVoiceSearchKeywords(validatedVoiceSearch.data);
        return { success: true, data: result.keywords };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to suggest keywords.' };
    }
}
