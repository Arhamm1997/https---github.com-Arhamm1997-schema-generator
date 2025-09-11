import { config } from 'dotenv';
config();

import '@/ai/flows/generate-schema-from-url.ts';
import '@/ai/flows/generate-faq-answers.ts';
import '@/ai/flows/suggest-voice-search-keywords.ts';