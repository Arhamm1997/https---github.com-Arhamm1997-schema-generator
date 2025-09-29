export type AIProvider = 'gemini' | 'openai' | 'claude';

export interface AIProviderConfig {
  name: string;
  displayName: string;
  apiKey?: string;
  models: string[];
  defaultModel: string;
  enabled: boolean;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
}

export interface AIProviderInterface {
  generateContent(prompt: string, model?: string): Promise<AIResponse>;
  isConfigured(): boolean;
  getModels(): string[];
}

export interface PageContentData {
  h1?: string;
  title?: string;
  content: string;
  footerContent?: string;
  headerContent?: string;
  images?: Array<{src: string, alt?: string, title?: string}>;
  faqs?: Array<{question: string, answer: string}>;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
    footerAddress?: string;
    fullAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    }
  };
  businessHours?: string;
  services?: string[];
  socialLinks?: string[];
  reviews?: {rating?: number, count?: number};
  metaDescription?: string;
  keywords?: string;
  priceRange?: string;
  businessType?: string;
  location?: {latitude?: number, longitude?: number, address?: string};
  awards?: string[];
}

export interface SchemaGenerationInput {
  url: string;
  pageContent?: PageContentData;
}

export interface SchemaGenerationOutput {
  schema: any;
  provider: AIProvider;
  model: string;
}