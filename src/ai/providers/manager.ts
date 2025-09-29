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
      defaultModel: 'gemini-2.0-flash-exp', // Most compatible model
      enabled: false
    });

    this.configs.set('openai', {
      name: 'openai',
      displayName: 'OpenAI GPT',
      models: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4-turbo', 'gpt-4'],
      defaultModel: 'gpt-4o-mini', // Most cost-effective model
      enabled: false
    });

    this.configs.set('claude', {
      name: 'claude',
      displayName: 'Anthropic Claude',
      models: ['claude-3-5-haiku-20241022', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
      defaultModel: 'claude-3-5-haiku-20241022', // Most cost-effective model
      enabled: false
    });

    // Initialize providers
    this.providers.set('gemini', new GeminiClientProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('claude', new ClaudeProvider());

    // Load saved configurations from localStorage if available
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
              // Merge saved config with current defaults, ensuring models list is up to date
              const mergedConfig = {
                ...existingConfig,
                ...config,
                models: existingConfig.models, // Always use the latest model list
                defaultModel: existingConfig.defaultModel // Use the corrected default model
              };
              this.configs.set(provider as AIProvider, mergedConfig);
            }
          });
        }

        const savedActiveProvider = localStorage.getItem('active-ai-provider');
        if (savedActiveProvider && this.configs.has(savedActiveProvider as AIProvider)) {
          this.activeProvider = savedActiveProvider as AIProvider;
        }

        // Update provider API keys
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
      
      // Update provider instance
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

    // First, fetch page content if not provided
    let pageContent = input.pageContent;
    if (!pageContent) {
      pageContent = await this.fetchPageContent(input.url);
    }

    // Generate comprehensive prompt
    const prompt = this.buildSchemaPrompt(input.url, pageContent);

    try {
      const response = await providerInstance.generateContent(prompt, selectedModel);
      
      // Parse the JSON schema from the response
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
      // Use the improved scraper that handles CORS issues
      const { scrapePageContent } = await import('@/lib/scraper');
      const scrapedContent = await scrapePageContent(url);
      
      // Convert scraped content to PageContentData format - comprehensive mapping
      return {
        // Basic content
        title: scrapedContent.title,
        h1: scrapedContent.h1,
        content: scrapedContent.content,
        metaDescription: scrapedContent.metaDescription,
        keywords: scrapedContent.keywords,
        
        // Enhanced business information
        businessName: scrapedContent.businessName,
        logo: scrapedContent.logo,
        websiteUrl: scrapedContent.websiteUrl,
        description: scrapedContent.description,
        
        // Geographic information
        geoCoordinates: scrapedContent.geoCoordinates,
        
        // Structured opening hours
        openingHoursSpecification: scrapedContent.openingHoursSpecification,
        
        // Enhanced ratings and reviews
        aggregateRating: scrapedContent.aggregateRating,
        individualReviews: scrapedContent.individualReviews,
        
        // Service areas and payment
        areaServed: scrapedContent.areaServed,
        paymentAccepted: scrapedContent.paymentAccepted,
        currenciesAccepted: scrapedContent.currenciesAccepted,
        
        // Amenities and features
        amenityFeature: scrapedContent.amenityFeature,
        
        // Restaurant specific fields
        servesCuisine: scrapedContent.servesCuisine,
        acceptsReservations: scrapedContent.acceptsReservations,
        hasMenu: scrapedContent.hasMenu,
        hasDelivery: scrapedContent.hasDelivery,
        hasTakeaway: scrapedContent.hasTakeaway,
        
        // Additional business information
        slogan: scrapedContent.slogan,
        foundingDate: scrapedContent.foundingDate,
        knowsLanguage: scrapedContent.knowsLanguage,
        hasMap: scrapedContent.hasMap,
        isAccessibleForFree: scrapedContent.isAccessibleForFree,
        smokingAllowed: scrapedContent.smokingAllowed,
        
        // Structured services
        servicesOffered: scrapedContent.servicesOffered,
        
        // Legacy fields (maintained for compatibility)
        contactInfo: scrapedContent.contactInfo,
        images: scrapedContent.images,
        socialLinks: scrapedContent.socialLinks,
        businessHours: scrapedContent.businessHours,
        faqs: scrapedContent.faqs,
        reviews: scrapedContent.reviews,
        priceRange: scrapedContent.priceRange,
        businessType: scrapedContent.businessType,
        
        // Validation metadata
        _validation: scrapedContent._validation
      };
    } catch (error) {
      console.warn('Scraping failed, using fallback content generation:', error instanceof Error ? error.message : error);
      
      // Provide minimal fallback content based on URL analysis
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const path = urlObj.pathname;
      
      // Try to extract business name from domain
      const domainParts = hostname.replace(/^www\./, '').split('.');
      const businessName = domainParts[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Analyze path for business type hints
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
        contactInfo: {
          // Will be filled by AI based on the URL and business context
        }
      };
    }
  }



  private buildSchemaPrompt(url: string, pageContent: PageContentData): string {
    const validationData = pageContent._validation;
    
    return `
CRITICAL CONTENT VALIDATION:
Before generating schema, you MUST validate that the fetched content matches the expected business from the URL.

URL TO ANALYZE: ${url}

VALIDATION RESULTS:
- Expected Business: "${validationData?.urlBusinessName || 'Unknown'}"
- Found Business Name: "${validationData?.extractedBusinessName || 'None'}"
- Content Matches URL: ${validationData?.contentMatchesUrl || false}
- Has Minimum Data: ${validationData?.hasMinimumData || false}
- Rejection Reason: ${validationData?.rejectionReason || 'None'}

VALIDATION RULES:
❌ If title/content is about "CORS Proxy", "API", "404", "Not Found" → RETURN ERROR
❌ If business name from URL doesn't appear anywhere in content → RETURN ERROR  
❌ If contentMatchesUrl is false AND no rejection reason → RETURN ERROR
❌ If hasMinimumData is false → RETURN ERROR
✅ Only proceed if content clearly matches the business from URL

${validationData?.rejectionReason ? `
🚨 VALIDATION FAILED: ${validationData.rejectionReason}

ERROR RESPONSE FORMAT:
{
  "schema": {
    "error": true,
    "message": "Content validation failed: ${validationData.rejectionReason}",
    "expected": "${validationData.urlBusinessName}",
    "found": {
      "title": "${pageContent.title || 'Not available'}",
      "businessName": "${pageContent.businessName || 'Not available'}",
      "h1": "${pageContent.h1 || 'Not available'}"
    },
    "reason": "${validationData.rejectionReason}",
    "suggestions": [
      "Check if URL is correct",
      "Page might require JavaScript rendering", 
      "Try direct business website URL instead of aggregator page"
    ]
  }
}

RETURN THE ERROR RESPONSE ABOVE - DO NOT GENERATE SCHEMA.
` : `
✅ VALIDATION PASSED - PROCEED WITH SCHEMA GENERATION

TASK: Generate complete LocalBusiness schema with ALL available data.

CRITICAL RULES:
1. ❌ NEVER make up or hallucinate data
2. ❌ NEVER invent addresses, phone numbers, or business details
3. ✅ ALWAYS use @type property for nested objects
4. ✅ ALWAYS include @context: "https://schema.org"
5. ✅ Use null or omit fields if data not found
6. ✅ Validate all phone numbers and URLs before including
7. ✅ Format dates as ISO 8601 (YYYY-MM-DD)
8. ✅ Use @graph array structure for multiple entities
9. ✅ For priceRange, ONLY use standard schema.org format: "$", "$$", "$$$", "$$$$" or omit entirely

URL: ${url}
`}

COMPREHENSIVE PAGE ANALYSIS:
- Title: ${pageContent.title || 'Not available'}
- Business Name: ${pageContent.businessName || 'Not available'}
- H1: ${pageContent.h1 || 'Not available'}
- Description: ${pageContent.description || pageContent.metaDescription || 'Not available'}
- Content: ${pageContent.content ? pageContent.content.substring(0, 2000) + '...' : 'Not available'}
- Logo: ${pageContent.logo || 'Not available'}
- Website URL: ${pageContent.websiteUrl || url}

CONTACT & LOCATION:
- Contact Info: ${JSON.stringify(pageContent.contactInfo || {})}
- Geo Coordinates: ${JSON.stringify(pageContent.geoCoordinates || {})}
- Area Served: ${JSON.stringify(pageContent.areaServed || [])}

BUSINESS OPERATIONS:
- Business Hours: ${pageContent.businessHours || 'Not available'}
- Structured Hours: ${JSON.stringify(pageContent.openingHoursSpecification || [])}
- Business Type: ${pageContent.businessType || 'LocalBusiness'}
- Price Range: ${pageContent.priceRange || 'Not detected'}
- Payment Accepted: ${JSON.stringify(pageContent.paymentAccepted || [])}
- Currencies: ${JSON.stringify(pageContent.currenciesAccepted || [])}

RATINGS & REVIEWS:
- Aggregate Rating: ${JSON.stringify(pageContent.aggregateRating || {})}
- Individual Reviews: ${JSON.stringify((pageContent.individualReviews || []).slice(0, 5))}
- Legacy Reviews: ${JSON.stringify(pageContent.reviews || {})}

RESTAURANT SPECIFIC (if applicable):
- Serves Cuisine: ${JSON.stringify(pageContent.servesCuisine || [])}
- Accepts Reservations: ${pageContent.acceptsReservations || 'Not available'}
- Has Menu: ${pageContent.hasMenu || 'Not available'}
- Has Delivery: ${pageContent.hasDelivery || 'Not available'}
- Has Takeaway: ${pageContent.hasTakeaway || 'Not available'}

AMENITIES & FEATURES:
- Amenity Features: ${JSON.stringify(pageContent.amenityFeature || [])}
- Services Offered: ${JSON.stringify((pageContent.servicesOffered || []).slice(0, 10))}

ADDITIONAL INFO:
- Slogan: ${pageContent.slogan || 'Not available'}
- Founding Date: ${pageContent.foundingDate || 'Not available'}
- Languages: ${JSON.stringify(pageContent.knowsLanguage || [])}
- Has Map: ${pageContent.hasMap || 'Not available'}
- Accessible for Free: ${pageContent.isAccessibleForFree || 'Not available'}
- Smoking Allowed: ${pageContent.smokingAllowed || 'Not available'}

MEDIA & SOCIAL:
- Images: ${JSON.stringify((pageContent.images || []).slice(0, 5))}
- Social Links: ${JSON.stringify(pageContent.socialLinks || [])}
- FAQs: ${JSON.stringify((pageContent.faqs || []).slice(0, 10))}

REQUIRED SCHEMA STRUCTURE:
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness", // or specific type like Restaurant/MedicalBusiness
      "@id": "${url}#business",
      "name": "", // REQUIRED - from businessName field
      "url": "${url}", // REQUIRED
      "logo": "", // From logo field
      "image": [], // From images array
      "description": "", // From description or metaDescription
      
      "address": { // REQUIRED - from contactInfo
        "@type": "PostalAddress",
        "streetAddress": "",
        "addressLocality": "", 
        "addressRegion": "",
        "postalCode": "",
        "addressCountry": ""
      },
      
      "geo": { // From geoCoordinates if available
        "@type": "GeoCoordinates",
        "latitude": "",
        "longitude": ""
      },
      
      "telephone": "", // REQUIRED - from contactInfo.phone
      "email": "", // From contactInfo.email
      "priceRange": "", // CRITICAL: ONLY "$", "$$", "$$$", "$$$$" or omit - NO other formats
      
      "openingHoursSpecification": [ // From openingHoursSpecification array
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Monday",
          "opens": "09:00",
          "closes": "17:00"
        }
      ],
      
      "aggregateRating": { // From aggregateRating object if available
        "@type": "AggregateRating",
        "ratingValue": "",
        "reviewCount": "",
        "bestRating": "5",
        "worstRating": "1"
      },
      
      "review": [ // From individualReviews array
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": ""
          },
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": ""
          },
          "reviewBody": "",
          "datePublished": ""
        }
      ],
      
      "sameAs": [], // From socialLinks array
      "areaServed": [], // From areaServed array
      "paymentAccepted": "", // Join paymentAccepted array with commas
      "currenciesAccepted": "", // Join currenciesAccepted array
      
      "amenityFeature": [ // From amenityFeature array
        {
          "@type": "LocationFeatureSpecification",
          "name": "",
          "value": true
        }
      ],
      
      "hasMap": "", // From hasMap field
      "slogan": "", // From slogan field
      "foundingDate": "", // From foundingDate field (YYYY format)
      "knowsLanguage": [], // From knowsLanguage array
      
      // RESTAURANT SPECIFIC (if businessType is Restaurant):
      "servesCuisine": [], // From servesCuisine array
      "acceptsReservations": true, // From acceptsReservations
      "hasMenu": "", // From hasMenu field
      
      // SERVICES (from servicesOffered):
      "makesOffer": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "",
            "description": ""
          },
          "price": "",
          "priceCurrency": "USD"
        }
      ]
    },
    
    // FAQPage Schema (if faqs exist):
    {
      "@type": "FAQPage",
      "@id": "${url}#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": ""
          }
        }
      ]
    },
    
    // WebPage Schema:
    {
      "@type": "WebPage",
      "@id": "${url}#webpage",
      "url": "${url}",
      "name": "", // From title
      "description": "", // From metaDescription
      "about": { "@id": "${url}#business" }
    }
  ]
}

FIELD HANDLING RULES:
1. Use null for missing required fields (name, address, telephone) 
2. Use empty array [] for missing array fields
3. Omit entire objects if all sub-fields are null (e.g., geo, aggregateRating)
4. Never use "null" as string - use actual null
5. If FAQPage mainEntity is empty, OMIT the entire FAQPage object from @graph

BUSINESS NAME EXTRACTION PRIORITY:
1. businessName field from fetched data
2. h1 tag content  
3. First part of title (before | or -)
4. If all fail, flag as uncertain but proceed

ADDRESS HANDLING:
- If contactInfo exists, use parsed address components
- Default addressCountry to "US" only if other address fields present
- If NO address data found, set entire address object to null

DATA QUALITY FLAGS (add as comments):
${!pageContent.businessName ? '// ⚠️ Business name extracted from URL, verify accuracy' : ''}
${!pageContent.contactInfo?.phone && !pageContent.contactInfo?.email ? '// ⚠️ No contact information found' : ''}
${!pageContent.geoCoordinates && !pageContent.contactInfo?.address ? '// ⚠️ No location data found' : ''}

FINAL VALIDATION BEFORE RETURN:
✅ Schema must have valid business name (not "CORS Proxy" or URL slug)
✅ At least one contact method (phone/email) OR address present
✅ Description matches the business, not a different service
✅ All URLs are properly formatted (https://)
✅ All required fields present (name, address, telephone, url)
✅ All nested objects have @type
✅ Phone numbers formatted correctly
✅ Dates in ISO format (YYYY-MM-DD)
✅ Ratings between 1-5
✅ priceRange is ONLY "$", "$$", "$$$", "$$$$" or omitted
✅ No made-up or placeholder text

Return only the complete, valid JSON-LD schema object OR error object. No markdown, no explanations, just pure JSON.
    `;
  }

  private validateLocalBusinessSchema(schema: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if it's @graph or single object
    const businesses = schema['@graph'] 
      ? schema['@graph'].filter((item: any) => 
          item['@type'] === 'LocalBusiness' || 
          item['@type']?.includes('Business'))
      : [schema];
    
    businesses.forEach((business: any, index: number) => {
      const prefix = businesses.length > 1 ? `Business ${index}: ` : '';
      
      // Required fields
      if (!business.name) errors.push(`${prefix}Missing required field: name`);
      if (!business.address) errors.push(`${prefix}Missing required field: address`);
      if (!business.telephone) errors.push(`${prefix}Missing required field: telephone`);
      if (!business.url) warnings.push(`${prefix}Missing recommended field: url`);
      
      // Address validation
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
      
      // Phone validation
      if (business.telephone) {
        const phonePattern = /[\d\s\-\(\)+]+/;
        if (!phonePattern.test(business.telephone)) {
          errors.push(`${prefix}Invalid telephone format`);
        }
      }
      
      // URL validation
      if (business.url && !business.url.startsWith('http')) {
        errors.push(`${prefix}Invalid URL format`);
      }
      
      // Geo validation
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
      
      // Rating validation
      if (business.aggregateRating) {
        const rating = parseFloat(business.aggregateRating.ratingValue);
        if (rating < 1 || rating > 5) {
          errors.push(`${prefix}Invalid rating value (must be 1-5)`);
        }
      }
      
      // Price range validation - this fixes the original issue
      if (business.priceRange) {
        const validPriceRanges = ['$', '$$', '$$$', '$$$$'];
        if (!validPriceRanges.includes(business.priceRange)) {
          errors.push(`${prefix}Invalid priceRange format. Must be $, $$, $$$, or $$$$`);
        }
      }
      
      // Opening hours validation
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
      
      // Recommended fields
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
      // Try to extract JSON from code blocks first
      const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
      const codeBlockMatch = response.match(codeBlockRegex);
      
      if (codeBlockMatch) {
        const schema = JSON.parse(codeBlockMatch[1]);
        this.logSchemaValidation(schema);
        return schema;
      }

      // Try to find JSON object in the response
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = response.match(jsonRegex);
      
      if (jsonMatch) {
        const schema = JSON.parse(jsonMatch[0]);
        this.logSchemaValidation(schema);
        return schema;
      }

      // If no JSON found, try to parse the entire response
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

// Export singleton instance
export const aiProviderManager = new AIProviderManager();