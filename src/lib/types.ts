export type HistoryItem = {
  id: string;
  timestamp: string;
  schema: string;
  name: string;
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  cleanedData?: any;
};

export type SchemaValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
};

export interface FormData {
  contentType: string;
  name: string;
  websiteUrl: string;
  description: string;
  pageTitle: string;
  pageH1: string;
  headline: string;
  authorName: string;
  authorType: string;
  publisherName: string;
  publisherLogoUrl: string;
  datePublished: string;
  dateModified: string;
  howToName: string;
  howToDescription: string;
  telephone: string;
  email: string;
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
  voiceSummary: string;
  voiceKeywords: string;
  faqQuestions: string;
  faqAnswers: string;
  serviceAreas: string;
  ratingValue: string;
  reviewCount: string;
  latitude: string;
  longitude: string;
  googleMap: string;
  servicesOffered: string;
  businessHours: string;
  priceRange: string;
  alternativeNames: string;
  foundingDate: string;
  paymentMethods: string;
  awards: string;
  specialOffers: string;
}
