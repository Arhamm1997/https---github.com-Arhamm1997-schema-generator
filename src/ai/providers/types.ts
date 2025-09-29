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
  title?: string;
  h1?: string;
  content: string;
  metaDescription?: string;
  keywords?: string;
  
  // Enhanced business information
  businessName?: string;
  logo?: string;
  websiteUrl?: string;
  description?: string;
  
  // Geographic information
  geoCoordinates?: {
    latitude?: string;
    longitude?: string;
  };
  
  // Structured opening hours
  openingHoursSpecification?: Array<{
    dayOfWeek: string;
    opens: string;
    closes: string;
  }>;
  
  // Enhanced contact and location
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
  
  // Enhanced ratings and reviews
  aggregateRating?: {
    ratingValue?: string;
    reviewCount?: string;
    bestRating?: string;
    worstRating?: string;
  };
  
  individualReviews?: Array<{
    author: string;
    reviewBody: string;
    reviewRating: number;
    datePublished?: string;
  }>;
  
  // Service areas and payment
  areaServed?: string[];
  paymentAccepted?: string[];
  currenciesAccepted?: string[];
  
  // Amenities and features
  amenityFeature?: Array<{
    name: string;
    value: boolean;
  }>;
  
  // Restaurant specific fields
  servesCuisine?: string[];
  acceptsReservations?: boolean;
  hasMenu?: string;
  hasDelivery?: boolean;
  hasTakeaway?: boolean;
  
  // Additional business information
  slogan?: string;
  foundingDate?: string;
  knowsLanguage?: string[];
  hasMap?: string;
  isAccessibleForFree?: boolean;
  smokingAllowed?: boolean;
  
  // Structured services
  servicesOffered?: Array<{
    name: string;
    description?: string;
    price?: string;
  }>;
  
  // Legacy fields (maintained for compatibility)
  footerContent?: string;
  headerContent?: string;
  images?: Array<{src: string, alt?: string, title?: string}>;
  faqs?: Array<{question: string, answer: string}>;
  businessHours?: string;
  services?: string[];
  socialLinks?: string[];
  reviews?: {rating?: number, count?: number};
  priceRange?: string;
  businessType?: string;
  location?: {latitude?: number, longitude?: number, address?: string};
  awards?: string[];
  
  // Validation metadata
  _validation?: {
    urlBusinessName?: string;
    extractedBusinessName?: string;
    contentMatchesUrl: boolean;
    hasMinimumData: boolean;
    rejectionReason?: string;
  };
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