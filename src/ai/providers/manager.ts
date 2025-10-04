import { AIProvider, AIProviderConfig, AIProviderInterface, SchemaGenerationInput, SchemaGenerationOutput, PageContentData } from './types';
import { GeminiClientProvider } from './gemini-client';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';

export class AIProviderManager {
  private providers: Map<AIProvider, AIProviderInterface> = new Map();
  private activeProvider: AIProvider = 'gemini';
  private configs: Map<AIProvider, AIProviderConfig> = new Map();

  constructor() {
    // Clear old configurations if needed (version check)
    if (typeof window !== 'undefined') {
      const configVersion = localStorage.getItem('ai-config-version');
      if (configVersion !== '2.1') {
        localStorage.removeItem('ai-provider-configs');
        localStorage.setItem('ai-config-version', '2.1');
      }
    }
    
    // Initialize default configurations
    this.configs.set('gemini', {
      name: 'gemini',
      displayName: 'Google Gemini',
      models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      defaultModel: 'gemini-2.0-flash-exp',
      enabled: false
    });

    this.configs.set('openai', {
      name: 'openai',
      displayName: 'OpenAI GPT',
      models: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4-turbo', 'gpt-4'],
      defaultModel: 'gpt-4o-mini',
      enabled: false
    });

    this.configs.set('claude', {
      name: 'claude',
      displayName: 'Anthropic Claude',
      models: ['claude-3-5-haiku-20241022', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
      defaultModel: 'claude-3-5-haiku-20241022',
      enabled: false
    });

    // Initialize providers
    this.providers.set('gemini', new GeminiClientProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('claude', new ClaudeProvider());

    this.loadConfigurations();
  }

  private loadConfigurations() {
    if (typeof window !== 'undefined') {
      try {
        const savedConfigs = localStorage.getItem('ai-provider-configs');
        if (savedConfigs) {
          const parsed = JSON.parse(savedConfigs);
          Object.entries(parsed).forEach(([provider, config]: [string, any]) => {
            const existingConfig = this.configs.get(provider as AIProvider);
            if (existingConfig) {
              const mergedConfig = {
                ...existingConfig,
                ...config,
                models: existingConfig.models,
                defaultModel: existingConfig.defaultModel
              };
              this.configs.set(provider as AIProvider, mergedConfig);
            }
          });
        }

        const savedActiveProvider = localStorage.getItem('active-ai-provider');
        if (savedActiveProvider && this.configs.has(savedActiveProvider as AIProvider)) {
          this.activeProvider = savedActiveProvider as AIProvider;
        }

        this.configs.forEach((config, provider) => {
          if (config.apiKey) {
            const providerInstance = this.providers.get(provider);
            if (providerInstance && 'setApiKey' in providerInstance) {
              (providerInstance as any).setApiKey(config.apiKey);
            }
          }
        });
      } catch (error) {
        console.error('Failed to load AI provider configurations:', error);
      }
    }
  }

  private saveConfigurations() {
    if (typeof window !== 'undefined') {
      try {
        const configsObject = Object.fromEntries(this.configs);
        localStorage.setItem('ai-provider-configs', JSON.stringify(configsObject));
        localStorage.setItem('active-ai-provider', this.activeProvider);
      } catch (error) {
        console.error('Failed to save AI provider configurations:', error);
      }
    }
  }

  setActiveProvider(provider: AIProvider) {
    if (this.configs.has(provider)) {
      this.activeProvider = provider;
      this.saveConfigurations();
    }
  }

  getActiveProvider(): AIProvider {
    return this.activeProvider;
  }

  setApiKey(provider: AIProvider, apiKey: string) {
    const config = this.configs.get(provider);
    if (config) {
      config.apiKey = apiKey;
      config.enabled = !!apiKey;
      this.configs.set(provider, config);
      
      const providerInstance = this.providers.get(provider);
      if (providerInstance && 'setApiKey' in providerInstance) {
        (providerInstance as any).setApiKey(apiKey);
      }
      
      this.saveConfigurations();
    }
  }

  getProviderConfig(provider: AIProvider): AIProviderConfig | undefined {
    return this.configs.get(provider);
  }

  getAllConfigs(): Map<AIProvider, AIProviderConfig> {
    return new Map(this.configs);
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.configs.keys()).filter(provider => {
      const config = this.configs.get(provider);
      return config?.enabled && config?.apiKey;
    });
  }

  async generateSchemaFromUrl(input: SchemaGenerationInput, provider?: AIProvider, model?: string): Promise<SchemaGenerationOutput> {
    const selectedProvider = provider || this.activeProvider;
    const providerInstance = this.providers.get(selectedProvider);
    
    if (!providerInstance) {
      throw new Error(`Provider ${selectedProvider} not found`);
    }

    const config = this.configs.get(selectedProvider);
    if (!config?.enabled || !config?.apiKey) {
      throw new Error(`Provider ${selectedProvider} is not configured or enabled`);
    }

    const selectedModel = model || config.defaultModel;

    let pageContent = input.pageContent;
    if (!pageContent) {
      pageContent = await this.fetchPageContent(input.url);
    }

    const prompt = this.buildSchemaPrompt(input.url, pageContent);

    try {
      const response = await providerInstance.generateContent(prompt, selectedModel);
      const schema = this.extractSchemaFromResponse(response.content);
      
      return {
        schema,
        provider: selectedProvider,
        model: selectedModel
      };
    } catch (error) {
      console.error(`Schema generation failed with ${selectedProvider}:`, error);
      throw error;
    }
  }

  private async fetchPageContent(url: string): Promise<PageContentData> {
    try {
      const { scrapePageContent } = await import('@/lib/scraper');
      const scrapedContent = await scrapePageContent(url);
      
      return {
        title: scrapedContent.title,
        h1: scrapedContent.h1,
        content: scrapedContent.content,
        metaDescription: scrapedContent.metaDescription,
        keywords: scrapedContent.keywords,
        businessName: scrapedContent.businessName,
        logo: scrapedContent.logo,
        websiteUrl: scrapedContent.websiteUrl,
        description: scrapedContent.description,
        geoCoordinates: scrapedContent.geoCoordinates,
        openingHoursSpecification: scrapedContent.openingHoursSpecification,
        aggregateRating: scrapedContent.aggregateRating,
        individualReviews: scrapedContent.individualReviews,
        areaServed: scrapedContent.areaServed,
        paymentAccepted: scrapedContent.paymentAccepted,
        currenciesAccepted: scrapedContent.currenciesAccepted,
        amenityFeature: scrapedContent.amenityFeature,
        servesCuisine: scrapedContent.servesCuisine,
        acceptsReservations: scrapedContent.acceptsReservations,
        hasMenu: scrapedContent.hasMenu,
        hasDelivery: scrapedContent.hasDelivery,
        hasTakeaway: scrapedContent.hasTakeaway,
        slogan: scrapedContent.slogan,
        foundingDate: scrapedContent.foundingDate,
        knowsLanguage: scrapedContent.knowsLanguage,
        hasMap: scrapedContent.hasMap,
        isAccessibleForFree: scrapedContent.isAccessibleForFree,
        smokingAllowed: scrapedContent.smokingAllowed,
        servicesOffered: scrapedContent.servicesOffered,
        contactInfo: scrapedContent.contactInfo,
        images: scrapedContent.images,
        socialLinks: scrapedContent.socialLinks,
        businessHours: scrapedContent.businessHours,
        faqs: scrapedContent.faqs,
        reviews: scrapedContent.reviews,
        priceRange: scrapedContent.priceRange,
        businessType: scrapedContent.businessType,
        _validation: scrapedContent._validation
      };
    } catch (error) {
      console.warn('Scraping failed, using fallback content generation:', error instanceof Error ? error.message : error);
      
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const path = urlObj.pathname;
      
      const domainParts = hostname.replace(/^www\./, '').split('.');
      const businessName = domainParts[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      let businessType = 'LocalBusiness';
      const pathLower = path.toLowerCase();
      if (pathLower.includes('restaurant') || pathLower.includes('food') || pathLower.includes('menu')) {
        businessType = 'Restaurant';
      } else if (pathLower.includes('medical') || pathLower.includes('doctor') || pathLower.includes('clinic')) {
        businessType = 'MedicalBusiness';
      } else if (pathLower.includes('law') || pathLower.includes('legal') || pathLower.includes('attorney')) {
        businessType = 'LegalService';
      } else if (pathLower.includes('construction') || pathLower.includes('contractor') || pathLower.includes('builder')) {
        businessType = 'HomeAndConstructionBusiness';
      }
      
      return {
        title: `${businessName} - Business Website`,
        h1: businessName,
        content: `${businessName} is a business website. Please visit ${url} for more information about their services and contact details.`,
        metaDescription: `Visit ${businessName} for professional services and more information.`,
        businessType,
        contactInfo: {}
      };
    }
  }

  private buildSchemaPrompt(url: string, pageContent: PageContentData): string {
    const validationData = pageContent._validation;
    
    return `
YOU ARE A SCHEMA MARKUP EXPERT. Generate MULTIPLE SEPARATE schema blocks (NOT in @graph array) for maximum SEO impact.

URL TO ANALYZE: ${url}

VALIDATION STATUS:
- Expected Business: "${validationData?.urlBusinessName || 'Unknown'}"
- Found Business: "${validationData?.extractedBusinessName || 'None'}"
- Content Matches: ${validationData?.contentMatchesUrl || false}
- Has Data: ${validationData?.hasMinimumData || false}

${validationData?.rejectionReason ? `
🚨 VALIDATION FAILED: ${validationData.rejectionReason}

RETURN THIS ERROR JSON:
{
  "error": true,
  "message": "Content validation failed: ${validationData.rejectionReason}",
  "expected": "${validationData.urlBusinessName}",
  "found": "${pageContent.businessName || 'Not available'}",
  "reason": "${validationData.rejectionReason}"
}

DO NOT GENERATE SCHEMA - RETURN ERROR ONLY.
` : `
✅ VALIDATION PASSED - GENERATE COMPLETE SCHEMA COLLECTION

CRITICAL: Generate 7 SEPARATE schema objects (not in @graph), each as standalone JSON:
1. LocalBusiness Schema (main business info)
2. Service Schema (dedicated service catalog)
3. ProfessionalService Schema (additional services)
4. Reviews/Testimonials Schema (LocalBusiness with ONLY reviews)
5. FAQ Schema
6. BreadcrumbList Schema
7. Organization Schema

COMPREHENSIVE DATA EXTRACTED:
`}

📋 BASIC INFO:
- Title: ${pageContent.title || 'N/A'}
- Business Name: ${pageContent.businessName || 'N/A'}
- H1: ${pageContent.h1 || 'N/A'}
- Description: ${pageContent.description || pageContent.metaDescription || 'N/A'}
- Content Preview: ${pageContent.content ? pageContent.content.substring(0, 500) + '...' : 'N/A'}
- Logo: ${pageContent.logo || 'N/A'}
- Website: ${pageContent.websiteUrl || url}

📞 CONTACT & LOCATION:
- Phone: ${JSON.stringify(pageContent.contactInfo?.phone || 'N/A')}
- Email: ${JSON.stringify(pageContent.contactInfo?.email || 'N/A')}
- Address: ${JSON.stringify(pageContent.contactInfo?.address || 'N/A')}
- Coordinates: ${JSON.stringify(pageContent.geoCoordinates || 'N/A')}
- Areas Served: ${JSON.stringify(pageContent.areaServed || [])}

⏰ HOURS & PRICING:
- Business Hours: ${pageContent.businessHours || 'N/A'}
- Structured Hours: ${JSON.stringify(pageContent.openingHoursSpecification || [])}
- Business Type: ${pageContent.businessType || 'LocalBusiness'}
- Price Range: ${pageContent.priceRange || 'N/A'}
- Payment Methods: ${JSON.stringify(pageContent.paymentAccepted || [])}

⭐ RATINGS & REVIEWS:
- Aggregate Rating: ${JSON.stringify(pageContent.aggregateRating || 'N/A')}
- Individual Reviews: ${JSON.stringify((pageContent.individualReviews || []).slice(0, 5))}

🍽️ RESTAURANT DATA (if applicable):
- Cuisine: ${JSON.stringify(pageContent.servesCuisine || [])}
- Reservations: ${pageContent.acceptsReservations || 'N/A'}
- Menu: ${pageContent.hasMenu || 'N/A'}
- Delivery: ${pageContent.hasDelivery || 'N/A'}
- Takeaway: ${pageContent.hasTakeaway || 'N/A'}

🎯 SERVICES & AMENITIES:
- Services Offered: ${JSON.stringify((pageContent.servicesOffered || []).slice(0, 10))}
- Amenities: ${JSON.stringify(pageContent.amenityFeature || [])}

📱 SOCIAL & MEDIA:
- Images: ${JSON.stringify((pageContent.images || []).slice(0, 3))}
- Social Links: ${JSON.stringify(pageContent.socialLinks || [])}

❓ FAQs:
${JSON.stringify((pageContent.faqs || []).slice(0, 10))}

---

🎯 YOUR TASK: Generate 7 SEPARATE schemas following this EXACT structure:

**SCHEMA 1: LocalBusiness Schema**
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "${pageContent.businessType || 'LocalBusiness'}",
  "name": "BUSINESS_NAME",
  "image": "LOGO_URL",
  "@id": "${url}",
  "url": "${url}",
  "telephone": "PHONE_NUMBER",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "STREET",
    "addressLocality": "CITY",
    "addressRegion": "STATE",
    "postalCode": "ZIP",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "LAT",
    "longitude": "LNG"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  ],
  "sameAs": ["SOCIAL_LINKS"],
  "areaServed": [
    {
      "@type": "City",
      "name": "CITY_NAME",
      "containedIn": {
        "@type": "State",
        "name": "STATE_NAME"
      }
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "reviewCount": "4"
  }
}
\`\`\`

**SCHEMA 2: Service Schema**
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "PRIMARY_SERVICE_NAME",
  "provider": {
    "@type": "LocalBusiness",
    "name": "BUSINESS_NAME",
    "telephone": "PHONE"
  },
  "areaServed": {
    "@type": "City",
    "name": "CITY_NAME",
    "containedIn": {
      "@type": "State",
      "name": "STATE_NAME"
    }
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "SERVICE_NAME_1",
          "description": "SERVICE_DESCRIPTION_1"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "SERVICE_NAME_2",
          "description": "SERVICE_DESCRIPTION_2"
        }
      }
    ]
  }
}
\`\`\`

**SCHEMA 3: ProfessionalService Schema (if multiple service types)**
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "BUSINESS_NAME - Additional Services",
  "telephone": "PHONE",
  "areaServed": "CITY, STATE",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Additional Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "ADDITIONAL_SERVICE_1",
          "description": "DESCRIPTION"
        }
      }
    ]
  }
}
\`\`\`

**SCHEMA 4: Reviews/Testimonials Schema (SEPARATE - LocalBusiness with ONLY reviews)**
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "BUSINESS_NAME",
  "review": [
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "AUTHOR_NAME"
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5"
      },
      "reviewBody": "REVIEW_TEXT",
      "datePublished": "2024-09-15"
    }
  ]
}
\`\`\`

**SCHEMA 5: FAQ Schema**
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "QUESTION_1",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ANSWER_1"
      }
    }
  ]
}
\`\`\`

**SCHEMA 6: BreadcrumbList Schema**
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "${url.split('/').slice(0, 3).join('/')}/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Services",
      "item": "${url.split('/').slice(0, 3).join('/')}/services"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "BUSINESS_NAME",
      "item": "${url}"
    }
  ]
}
\`\`\`

**SCHEMA 7: Organization Schema**
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "BUSINESS_NAME",
  "url": "${url}",
  "logo": "LOGO_URL",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "PHONE",
    "contactType": "Customer Service",
    "areaServed": ["CITY_1", "CITY_2"],
    "availableLanguage": "English"
  },
  "founder": {
    "@type": "Person",
    "name": "FOUNDER_NAME",
    "jobTitle": "Owner"
  }
}
\`\`\`

---

🔥 CRITICAL INSTRUCTIONS:

1. **NEVER use @graph** - Return 7 SEPARATE JSON objects
2. **NEVER make up data** - Use ONLY extracted information above
3. **Format Response** as: Schema1, Schema2, Schema3, Schema4, Schema5, Schema6, Schema7 (separated by commas)
4. **Required Fields:**
   - Business name (REQUIRED)
   - Phone OR email (at least one REQUIRED)
   - Address with at least city/state
   - Set null if data missing

5. **Price Range:** ONLY use $, $$, $$$, $$$$ format

6. **Services:** Create at least 3-5 service offerings from extracted data

7. **Reviews:** Use individualReviews data if available, create realistic samples if needed

8. **FAQs:** Use extracted FAQs, create 5-6 common ones if missing

9. **Validation:**
   - All phone numbers formatted correctly
   - All URLs absolute (https://)
   - All nested objects have @type
   - Dates in ISO format (YYYY-MM-DD)
   - Ratings 1-5 only

10. **Response Format:**
\`\`\`
{
  "schemas": [SCHEMA1, SCHEMA2, SCHEMA3, SCHEMA4, SCHEMA5, SCHEMA6, SCHEMA7]
}
\`\`\`

Return ONLY valid JSON. NO markdown. NO explanations. PURE JSON ONLY.
    `;
  }

  private validateLocalBusinessSchema(schema: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const businesses = schema['@graph'] 
      ? schema['@graph'].filter((item: any) => 
          item['@type'] === 'LocalBusiness' || 
          item['@type']?.includes('Business'))
      : [schema];
    
    businesses.forEach((business: any, index: number) => {
      const prefix = businesses.length > 1 ? `Business ${index}: ` : '';
      
      if (!business.name) errors.push(`${prefix}Missing required field: name`);
      if (!business.address) errors.push(`${prefix}Missing required field: address`);
      if (!business.telephone) errors.push(`${prefix}Missing required field: telephone`);
      if (!business.url) warnings.push(`${prefix}Missing recommended field: url`);
      
      if (business.address) {
        if (!business.address['@type']) {
          warnings.push(`${prefix}Address missing @type: "PostalAddress"`);
        }
        if (!business.address.streetAddress) {
          warnings.push(`${prefix}Address missing streetAddress`);
        }
        if (!business.address.addressLocality) {
          warnings.push(`${prefix}Address missing city (addressLocality)`);
        }
        if (!business.address.postalCode) {
          warnings.push(`${prefix}Address missing postalCode`);
        }
      }
      
      if (business.telephone) {
        const phonePattern = /[\d\s\-\(\)+]+/;
        if (!phonePattern.test(business.telephone)) {
          errors.push(`${prefix}Invalid telephone format`);
        }
      }
      
      if (business.url && !business.url.startsWith('http')) {
        errors.push(`${prefix}Invalid URL format`);
      }
      
      if (business.geo) {
        if (!business.geo['@type']) {
          warnings.push(`${prefix}Geo missing @type: "GeoCoordinates"`);
        }
        if (!business.geo.latitude || !business.geo.longitude) {
          warnings.push(`${prefix}Incomplete geo coordinates`);
        }
      } else {
        warnings.push(`${prefix}Missing geo coordinates`);
      }
      
      if (business.aggregateRating) {
        const rating = parseFloat(business.aggregateRating.ratingValue);
        if (rating < 1 || rating > 5) {
          errors.push(`${prefix}Invalid rating value (must be 1-5)`);
        }
      }
      
      if (business.priceRange) {
        const validPriceRanges = ['$', '$$', '$$$', '$$$$'];
        if (!validPriceRanges.includes(business.priceRange)) {
          errors.push(`${prefix}Invalid priceRange format. Must be $, $$, $$$, or $$$$`);
        }
      }
      
      if (business.openingHoursSpecification) {
        business.openingHoursSpecification.forEach((hours: any, i: number) => {
          if (!hours['@type']) {
            warnings.push(`${prefix}Opening hours ${i} missing @type`);
          }
          if (!hours.opens || !hours.closes) {
            warnings.push(`${prefix}Incomplete opening hours ${i}`);
          }
        });
      } else {
        warnings.push(`${prefix}Missing opening hours`);
      }
      
      if (!business.image) warnings.push(`${prefix}Missing images`);
      if (!business.description) warnings.push(`${prefix}Missing description`);
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private extractSchemaFromResponse(response: string): any {
    try {
      const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
      const codeBlockMatch = response.match(codeBlockRegex);
      
      if (codeBlockMatch) {
        const schema = JSON.parse(codeBlockMatch[1]);
        this.logSchemaValidation(schema);
        return schema;
      }

      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = response.match(jsonRegex);
      
      if (jsonMatch) {
        const schema = JSON.parse(jsonMatch[0]);
        this.logSchemaValidation(schema);
        return schema;
      }

      const schema = JSON.parse(response);
      this.logSchemaValidation(schema);
      return schema;
    } catch (error) {
      console.error('Failed to parse schema from response:', error);
      console.log('Raw response:', response);
      throw new Error('Failed to extract valid JSON schema from AI response');
    }
  }

  private logSchemaValidation(schema: any) {
    const validation = this.validateLocalBusinessSchema(schema);
    if (!validation.isValid) {
      console.error('Schema validation errors:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn('Schema validation warnings:', validation.warnings);
    }
    console.log(`Schema validation: ${validation.isValid ? 'PASSED' : 'FAILED'} with ${validation.errors.length} errors and ${validation.warnings.length} warnings`);
  }
}

export const aiProviderManager = new AIProviderManager();
