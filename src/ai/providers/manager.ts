import { AIProvider, AIProviderConfig, AIProviderInterface, SchemaGenerationInput, SchemaGenerationOutput, PageContentData } from './types';
import { GeminiClientProvider } from './gemini-client';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';

export class AIProviderManager {
  private providers: Map<AIProvider, AIProviderInterface> = new Map();
  private activeProvider: AIProvider = 'gemini';
  private configs: Map<AIProvider, AIProviderConfig> = new Map();

  constructor() {
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
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
      defaultModel: 'gpt-4o-mini',
      enabled: false
    });

    this.configs.set('claude', {
      name: 'claude',
      displayName: 'Anthropic Claude',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      defaultModel: 'claude-3-5-haiku-20241022',
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
          Object.entries(parsed).forEach(([provider, config]) => {
            this.configs.set(provider as AIProvider, config as AIProviderConfig);
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
      
      // Convert scraped content to PageContentData format
      return {
        title: scrapedContent.title,
        h1: scrapedContent.h1,
        content: scrapedContent.content,
        metaDescription: scrapedContent.metaDescription,
        keywords: scrapedContent.keywords,
        contactInfo: scrapedContent.contactInfo,
        images: scrapedContent.images,
        socialLinks: scrapedContent.socialLinks,
        businessHours: scrapedContent.businessHours,
        faqs: scrapedContent.faqs,
        reviews: scrapedContent.reviews,
        priceRange: scrapedContent.priceRange,
        businessType: scrapedContent.businessType
      };
    } catch (error) {
      console.error('Error fetching page content:', error);
      throw new Error(`Failed to fetch or process page content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parsePageContent(html: string, url: string): PageContentData {
    // Enhanced client-side content extraction with better parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Enhanced title extraction
    const title = doc.title || 
                 doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                 doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || 
                 doc.querySelector('h1')?.textContent || 
                 '';

    // Enhanced H1 extraction
    const h1 = doc.querySelector('h1')?.textContent || 
              doc.querySelector('.page-title, .entry-title, .post-title, .main-title')?.textContent ||
              '';

    // Enhanced content extraction
    let content = '';
    const contentSelectors = [
      'main', 
      '.main-content', 
      '.content', 
      '.post-content', 
      '.entry-content',
      '.article-content',
      '.page-content',
      '#content'
    ];

    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent && element.textContent.length > content.length) {
        content = element.textContent;
      }
    }

    if (!content || content.length < 100) {
      content = doc.body?.textContent || '';
    }
    content = content.replace(/\s\s+/g, ' ').trim();

    // Extract meta information
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                          doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || 
                          '';
    const keywords = doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';

    // Extract contact information
    const contactInfo: any = {};
    
    // Phone extraction
    const phoneElements = doc.querySelectorAll('a[href^="tel:"], .phone, .telephone, .contact-phone');
    if (phoneElements.length > 0) {
      const phoneText = Array.from(phoneElements)[0]?.textContent || 
                       Array.from(phoneElements)[0]?.getAttribute('href')?.replace('tel:', '');
      if (phoneText) contactInfo.phone = phoneText.trim();
    }

    // Email extraction
    const emailElements = doc.querySelectorAll('a[href^="mailto:"], .email, .contact-email');
    if (emailElements.length > 0) {
      const emailText = Array.from(emailElements)[0]?.getAttribute('href')?.replace('mailto:', '') ||
                       Array.from(emailElements)[0]?.textContent;
      if (emailText) contactInfo.email = emailText.trim();
    }

    // Address extraction
    const addressElements = doc.querySelectorAll('.address, .contact-address, .location, [itemtype*="PostalAddress"]');
    if (addressElements.length > 0) {
      const addressText = Array.from(addressElements)[0]?.textContent?.trim();
      if (addressText) contactInfo.address = addressText;
    }

    // Extract images
    const images: Array<{src: string, alt?: string, title?: string}> = [];
    const baseUrlObj = new URL(url);
    
    doc.querySelectorAll('img').forEach(img => {
      let src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src) {
        if (src.startsWith('//')) {
          src = baseUrlObj.protocol + src;
        } else if (src.startsWith('/')) {
          src = baseUrlObj.origin + src;
        } else if (!src.startsWith('http')) {
          try {
            src = new URL(src, url).href;
          } catch (e) {
            return; // Skip invalid URLs
          }
        }
        
        const alt = img.getAttribute('alt') || '';
        const title = img.getAttribute('title') || '';
        
        const width = parseInt(img.getAttribute('width') || '0');
        const height = parseInt(img.getAttribute('height') || '0');
        
        if ((width === 0 || width >= 200) && (height === 0 || height >= 150)) {
          images.push({
            src,
            alt: alt || undefined,
            title: title || undefined
          });
        }
      }
    });

    // Extract social links
    const socialLinks: string[] = [];
    const socialDomains = [
      'facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 
      'instagram.com', 'youtube.com', 'tiktok.com', 'pinterest.com'
    ];
    
    doc.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        for (const domain of socialDomains) {
          if (href.includes(domain) && !socialLinks.includes(href)) {
            socialLinks.push(href);
            break;
          }
        }
      }
    });

    // Extract business hours
    let businessHours = '';
    const hoursSelectors = [
      '.hours', '.business-hours', '.opening-hours', '.schedule',
      '.operating-hours', '.store-hours', '.office-hours'
    ];
    
    for (const selector of hoursSelectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent && element.textContent.length > 5) {
        businessHours = element.textContent.trim();
        break;
      }
    }

    return {
      title: title.trim(),
      h1: h1.trim(),
      content: content.substring(0, 3000), // Limit content size
      metaDescription,
      keywords,
      contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
      images: images.slice(0, 10),
      socialLinks: socialLinks.slice(0, 10),
      businessHours: businessHours || undefined
    };
  }

  private buildSchemaPrompt(url: string, pageContent: PageContentData): string {
    return `
You are an expert at creating comprehensive, voice-search-optimized JSON-LD schema markup following schema.org standards with enhanced address and price detection.

Your task is to analyze the content of the given URL and generate a complete, SEO-optimized JSON-LD schema with intelligent postal code and price range detection.

URL: ${url}

Page Content Analysis:
- Title: ${pageContent.title || 'Not available'}
- H1: ${pageContent.h1 || 'Not available'}
- Meta Description: ${pageContent.metaDescription || 'Not available'}
- Content: ${pageContent.content ? pageContent.content.substring(0, 2000) + '...' : 'Not available'}
- Contact Info: ${JSON.stringify(pageContent.contactInfo || {})}
- Business Hours: ${pageContent.businessHours || 'Not available'}
- Services: ${JSON.stringify(pageContent.services || [])}
- Reviews: ${JSON.stringify(pageContent.reviews || {})}
- Price Range: ${pageContent.priceRange || 'Not detected'}
- Business Type: ${pageContent.businessType || 'LocalBusiness'}
- Location: ${JSON.stringify(pageContent.location || {})}
- Images: ${JSON.stringify((pageContent.images || []).slice(0, 5))}
- FAQs: ${JSON.stringify((pageContent.faqs || []).slice(0, 10))}
- Social Links: ${JSON.stringify(pageContent.socialLinks || [])}

**Enhanced Address Processing**: Use advanced postal code detection:
- Multi-region postal code patterns (US, CA, UK, AU)
- Enhanced city and state extraction
- Better street address parsing
- Contextual address validation

**Intelligent Price Range Detection**:
- City-based price estimation (high-cost cities like NYC get $$$$, lower-cost get $)
- Content-based price range detection from text
- Service industry context-aware pricing
- Fallback to moderate pricing if unclear

**Create Comprehensive Schema Structure**: Build a schema with the following structure:
- Root @type: "WebPage" with the page URL
- mainEntity: Primary business/organization information with correct @type
- Include FAQ schema if questions/answers are found
- Add Organization schema with complete details
- Include breadcrumbs if applicable
- Add ImageObject schema for important images

**Address Validation with Auto-Fill**:
- Use extracted postal code with confidence
- Apply city-based price range intelligence
- Fill missing address components with contextual data:
  * streetAddress: Use extracted street or "Address available upon request"
  * addressLocality: Use extracted city or "Local Area"
  * addressRegion: Use extracted state or "State"
  * postalCode: Use detected postal code or leave undefined
  * addressCountry: Default to detected country or "US"

**Enhanced Local SEO Elements**:
- Complete address with improved PostalAddress schema
- Contact information (telephone, email) with proper formatting
- Business hours if available
- Intelligent price range based on location and content
- Service area (areaServed) 
- Services offered with proper structure
- Social media profiles (sameAs)
- Reviews and ratings with validation
- Geographic coordinates if available
- Images with proper ImageObject schema

**Important Guidelines**:
- Prioritize extracted postal codes and city-based price ranges
- Use intelligent defaults for missing address components
- Apply location-aware price estimation
- Create valid schema even with partial data
- Do NOT include speakable schema elements
- Ensure all phone numbers are properly formatted
- Validate email addresses and URLs
- Include comprehensive FAQ section if questions are found
- Add proper review schema with ratings between 1-5
- Include proper OpeningHoursSpecification for business hours

Return ONLY a valid JSON-LD schema object (without markdown code blocks or additional text). The schema should be comprehensive and ready for implementation.
    `;
  }

  private extractSchemaFromResponse(response: string): any {
    try {
      // Try to extract JSON from code blocks first
      const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
      const codeBlockMatch = response.match(codeBlockRegex);
      
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }

      // Try to find JSON object in the response
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = response.match(jsonRegex);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON found, try to parse the entire response
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse schema from response:', error);
      console.log('Raw response:', response);
      throw new Error('Failed to extract valid JSON schema from AI response');
    }
  }
}

// Export singleton instance
export const aiProviderManager = new AIProviderManager();