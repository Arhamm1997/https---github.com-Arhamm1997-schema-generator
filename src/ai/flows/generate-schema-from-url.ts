'use server';
/**
 * @fileOverview FIXED postal address fetching for comprehensive JSON-LD schema generation
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { load } from 'cheerio';

const GenerateSchemaInputSchema = z.object({
  url: z.string().url().describe('The URL of the webpage to analyze.'),
});
export type GenerateSchemaInput = z.infer<typeof GenerateSchemaInputSchema>;

const GenerateSchemaOutputSchema = z.object({
    schema: z.any().describe("The generated JSON-LD schema object."),
});
export type GenerateSchemaOutput = z.infer<typeof GenerateSchemaOutputSchema>;

// FIXED: Simplified and more aggressive postal code patterns
const POSTAL_PATTERNS = {
    // US ZIP codes - more flexible
    US_ZIP: /\b\d{5}(?:-\d{4})?\b/g,
    // Canadian postal codes
    CA_POSTAL: /\b[A-Za-z]\d[A-Za-z]\s*\d[A-Za-z]\d\b/g,
    // UK postcodes
    UK_POSTAL: /\b[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}\b/g,
    // General international
    GENERAL: /\b\d{4,6}(?:-\d{2,4})?\b/g
};

// FIXED: More comprehensive address patterns
const ADDRESS_PATTERNS = [
    // Full address with ZIP
    /\d+\s+[A-Za-z0-9\s,.-]+(Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?|Place|Pl\.?)[A-Za-z0-9\s,.-]*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi,
    // City, State ZIP
    /[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/g,
    // Street address only
    /\d+\s+[A-Za-z0-9\s]+(Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?|Place|Pl\.?)/gi,
    // Simple patterns
    /\d{5}(?:-\d{4})?\s*[A-Za-z\s,]+/g
];

// City-based price mapping
const cityPriceMapping: { [key: string]: string } = {
    'new york': '$$$$', 'manhattan': '$$$$', 'san francisco': '$$$$', 'palo alto': '$$$$',
    'los angeles': '$$$', 'seattle': '$$$', 'boston': '$$$', 'chicago': '$$$', 'miami': '$$$',
    'atlanta': '$$', 'denver': '$$', 'austin': '$$', 'dallas': '$$', 'houston': '$$', 'phoenix': '$$',
    'detroit': '$', 'cleveland': '$', 'kansas city': '$', 'memphis': '$'
};

const fetchPageContentTool = ai.defineTool(
    {
        name: 'fetchPageContent',
        description: 'Fetches HTML content with FIXED postal address extraction',
        inputSchema: z.object({ url: z.string().url() }),
        outputSchema: z.object({
            h1: z.string().optional(),
            title: z.string().optional(),
            content: z.string(),
            contactInfo: z.object({
                phone: z.string().optional(),
                email: z.string().optional(),
                address: z.string().optional(),
                fullAddress: z.object({
                    street: z.string().optional(),
                    city: z.string().optional(),
                    state: z.string().optional(),
                    zip: z.string().optional(),
                    country: z.string().optional()
                }).optional()
            }).optional(),
            businessHours: z.string().optional(),
            priceRange: z.string().optional(),
            rating: z.number().optional(),
            reviewCount: z.number().optional(),
            services: z.array(z.string()).optional(),
            socialLinks: z.array(z.string()).optional(),
            faqs: z.array(z.object({
                question: z.string(),
                answer: z.string()
            })).optional(),
            images: z.array(z.object({
                src: z.string(),
                alt: z.string().optional()
            })).optional(),
            businessType: z.string().optional(),
            location: z.object({
                latitude: z.number().optional(),
                longitude: z.number().optional()
            }).optional()
        }),
    },
    async ({ url }) => {
        try {
            // Faster fetch with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const $ = load(html);

            // Basic extraction
            const title = $('title').first().text().trim() || $('h1').first().text().trim() || '';
            const h1 = $('h1').first().text().trim() || '';
            
            // Content extraction - prioritize main content areas
            let content = '';
            const contentSelectors = ['main', '.main-content', '.content', 'article', 'body'];
            for (const selector of contentSelectors) {
                const selectedContent = $(selector).first().text();
                if (selectedContent && selectedContent.length > content.length) {
                    content = selectedContent;
                    break;
                }
            }
            content = content.replace(/\s+/g, ' ').trim();

            // FIXED: More aggressive footer content extraction
            const footerSelectors = [
                'footer', '.footer', '#footer', '.site-footer', '.page-footer', 
                '.contact', '.contact-info', '.address', '.location-info',
                '[class*="contact"]', '[class*="address"]', '[class*="location"]',
                '[role="contentinfo"]'
            ];
            
            let footerContent = '';
            footerSelectors.forEach(selector => {
                const text = $(selector).text();
                if (text && text.length > footerContent.length) {
                    footerContent = text;
                }
            });
            footerContent = footerContent.replace(/\s+/g, ' ').trim();

            // Combine all text for comprehensive extraction
            const allText = `${content} ${footerContent}`.replace(/\s+/g, ' ').trim();
            
            console.log('All extracted text length:', allText.length);
            console.log('Sample text:', allText.substring(0, 500));

            // FIXED: Contact info extraction with better patterns
            const contactInfo: any = {};

            // Phone extraction
            const phonePattern = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
            const phoneMatch = allText.match(phonePattern);
            if (phoneMatch) {
                contactInfo.phone = phoneMatch[0].trim();
                console.log('Found phone:', contactInfo.phone);
            }

            // Email extraction
            const emailPattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
            const emailMatch = allText.match(emailPattern);
            if (emailMatch) {
                const validEmails = emailMatch.filter(email => 
                    !email.includes('example.com') && 
                    !email.includes('test.com') &&
                    !email.includes('placeholder') &&
                    !email.includes('noreply')
                );
                if (validEmails.length > 0) {
                    contactInfo.email = validEmails[0];
                    console.log('Found email:', contactInfo.email);
                }
            }

            // FIXED: More aggressive address and postal code extraction
            let foundAddress = '';
            let foundZip = '';
            let foundCity = '';
            let foundState = '';

            console.log('Starting address extraction...');

            // 1. Try to find complete addresses first
            for (const pattern of ADDRESS_PATTERNS) {
                const matches = allText.match(pattern);
                if (matches && matches.length > 0) {
                    // Get the longest match as it's likely most complete
                    const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
                    if (longestMatch.length > foundAddress.length) {
                        foundAddress = longestMatch.trim();
                        console.log('Found address pattern:', foundAddress);
                    }
                }
            }

            // 2. Extract postal codes separately for better coverage
            for (const [region, pattern] of Object.entries(POSTAL_PATTERNS)) {
                const matches = allText.match(pattern);
                if (matches && matches.length > 0) {
                    foundZip = matches[0].trim();
                    console.log('Found ZIP from pattern', region + ':', foundZip);
                    break;
                }
            }

            // 3. Look for city, state combinations
            const cityStatePattern = /([A-Za-z\s]+),\s*([A-Z]{2})(?:\s*\d{5})?/g;
            const cityStateMatch = allText.match(cityStatePattern);
            if (cityStateMatch && cityStateMatch.length > 0) {
                const match = cityStateMatch[0];
                const parts = match.split(',');
                if (parts.length >= 2) {
                    foundCity = parts[0].trim();
                    foundState = parts[1].trim().substring(0, 2);
                    console.log('Found city/state:', foundCity, foundState);
                }
            }

            // 4. If still no ZIP, try simpler patterns
            if (!foundZip) {
                const simpleZipPattern = /\b\d{5}\b/g;
                const zipMatches = allText.match(simpleZipPattern);
                if (zipMatches) {
                    // Filter out phone numbers and other non-zip numbers
                    const potentialZips = zipMatches.filter(zip => {
                        const zipNum = parseInt(zip);
                        return zipNum >= 1000 && zipNum <= 99999; // Valid US ZIP range
                    });
                    if (potentialZips.length > 0) {
                        foundZip = potentialZips[0];
                        console.log('Found ZIP with simple pattern:', foundZip);
                    }
                }
            }

            // 5. Try structured data extraction
            $('script[type="application/ld+json"]').each((_, element) => {
                try {
                    const jsonLD = JSON.parse($(element).html() || '');
                    const extractAddress = (obj: any) => {
                        if (obj.address) {
                            if (typeof obj.address === 'string') {
                                if (obj.address.length > foundAddress.length) {
                                    foundAddress = obj.address;
                                    console.log('Found address in JSON-LD:', foundAddress);
                                }
                            } else if (obj.address.streetAddress || obj.address.addressLocality) {
                                const addr = obj.address;
                                if (addr.streetAddress && !foundAddress.includes(addr.streetAddress)) {
                                    foundAddress = `${addr.streetAddress}, ${addr.addressLocality}, ${addr.addressRegion} ${addr.postalCode}`.trim();
                                    console.log('Built address from JSON-LD:', foundAddress);
                                }
                                if (addr.postalCode && !foundZip) {
                                    foundZip = addr.postalCode;
                                    console.log('Found ZIP in JSON-LD:', foundZip);
                                }
                                if (addr.addressLocality && !foundCity) {
                                    foundCity = addr.addressLocality;
                                }
                                if (addr.addressRegion && !foundState) {
                                    foundState = addr.addressRegion;
                                }
                            }
                        }
                    };

                    if (Array.isArray(jsonLD)) {
                        jsonLD.forEach(extractAddress);
                    } else if (jsonLD['@graph']) {
                        jsonLD['@graph'].forEach(extractAddress);
                    } else {
                        extractAddress(jsonLD);
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
                }
            });

            // Build the final address and contact info
            if (foundAddress || foundCity || foundZip) {
                contactInfo.address = foundAddress || `${foundCity}, ${foundState} ${foundZip}`.trim();
                
                // Parse address components
                const fullAddress: any = {};
                
                if (foundZip) fullAddress.zip = foundZip;
                if (foundCity) fullAddress.city = foundCity;
                if (foundState) fullAddress.state = foundState;
                
                // Try to extract street from full address
                if (foundAddress) {
                    const streetMatch = foundAddress.match(/^([^,]+)/);
                    if (streetMatch) {
                        fullAddress.street = streetMatch[1].trim();
                    }
                    
                    // Parse city/state/zip from full address if not already found
                    if (!foundCity || !foundState) {
                        const cityStateZipMatch = foundAddress.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})/);
                        if (cityStateZipMatch) {
                            if (!foundCity) fullAddress.city = cityStateZipMatch[1].trim();
                            if (!foundState) fullAddress.state = cityStateZipMatch[2];
                            if (!foundZip) fullAddress.zip = cityStateZipMatch[3];
                        }
                    }
                }
                
                fullAddress.country = 'US'; // Default to US
                
                if (Object.keys(fullAddress).length > 0) {
                    contactInfo.fullAddress = fullAddress;
                }

                console.log('Final contact info:', contactInfo);
            }

            // Price range detection
            let priceRange = '';
            if (contactInfo.fullAddress?.city) {
                priceRange = cityPriceMapping[contactInfo.fullAddress.city.toLowerCase()] || '$$';
            } else {
                // Look for explicit price indicators
                const priceText = allText.toLowerCase();
                if (priceText.includes('luxury') || priceText.includes('premium')) {
                    priceRange = '$$$$';
                } else if (priceText.includes('expensive') || priceText.includes('upscale')) {
                    priceRange = '$$$';
                } else if (priceText.includes('affordable') || priceText.includes('budget')) {
                    priceRange = '$';
                } else {
                    priceRange = '$$';
                }
            }

            // Business hours
            let businessHours = '';
            const hourPatterns = [
                /([A-Za-z]+)\s*-?\s*([A-Za-z]+):\s*(\d{1,2}(?::\d{2})?\s*[APap][Mm]?)\s*-\s*(\d{1,2}(?::\d{2})?\s*[APap][Mm]?)/g,
                /([A-Za-z]+):\s*(\d{1,2}(?::\d{2})?\s*[APap][Mm]?)\s*-\s*(\d{1,2}(?::\d{2})?\s*[APap][Mm]?)/g
            ];
            
            for (const pattern of hourPatterns) {
                const match = allText.match(pattern);
                if (match) {
                    businessHours = match[0];
                    break;
                }
            }

            // Rating extraction
            let rating: number | undefined;
            let reviewCount: number | undefined;
            const ratingMatch = allText.match(/(\d+\.?\d*)\s*(?:\/\s*5|out\s*of\s*5|stars?)/i);
            if (ratingMatch) {
                const ratingVal = parseFloat(ratingMatch[1]);
                if (ratingVal >= 1 && ratingVal <= 5) {
                    rating = ratingVal;
                }
            }
            
            const reviewMatch = allText.match(/(\d+)\s*reviews?/i);
            if (reviewMatch) {
                reviewCount = parseInt(reviewMatch[1]);
            }

            // Services extraction
            const services: string[] = [];
            const serviceKeywords = ['service', 'services', 'offering', 'offerings', 'specializes in', 'provides'];
            serviceKeywords.forEach(keyword => {
                const regex = new RegExp(`${keyword}[^.]*`, 'gi');
                const matches = allText.match(regex);
                if (matches) {
                    matches.forEach(match => {
                        if (match.length < 100 && match.length > 10) {
                            services.push(match.trim());
                        }
                    });
                }
            });

            // Social links
            const socialLinks: string[] = [];
            const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com'];
            $('a[href]').each((_, element) => {
                const href = $(element).attr('href');
                if (href) {
                    socialDomains.forEach(domain => {
                        if (href.includes(domain) && !socialLinks.includes(href)) {
                            socialLinks.push(href);
                        }
                    });
                }
            });

            // Business type detection
            let businessType = 'LocalBusiness';
            const typeKeywords = {
                'Restaurant': ['restaurant', 'cafe', 'diner', 'food', 'menu', 'dining'],
                'MedicalBusiness': ['medical', 'doctor', 'clinic', 'health', 'hospital'],
                'LegalService': ['law', 'lawyer', 'attorney', 'legal'],
                'ProfessionalService': ['consulting', 'service', 'professional'],
                'HomeAndConstructionBusiness': ['construction', 'contractor', 'builder'],
                'AutomotiveBusiness': ['auto', 'car', 'automotive', 'mechanic']
            };
            
            const lowerContent = allText.toLowerCase();
            for (const [type, keywords] of Object.entries(typeKeywords)) {
                if (keywords.some(keyword => lowerContent.includes(keyword))) {
                    businessType = type;
                    break;
                }
            }

            return {
                h1: h1 || undefined,
                title: title || undefined,
                content: content.slice(0, 1000), // Limit content for performance
                contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
                businessHours: businessHours || undefined,
                priceRange: priceRange || undefined,
                rating: rating,
                reviewCount: reviewCount,
                services: services.length > 0 ? services.slice(0, 5) : undefined,
                socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
                businessType: businessType || undefined
            };
        } catch (error) {
            console.error('Error fetching page content:', error);
            throw new Error(`Failed to fetch page content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
);

const generateSchemaFromUrlFlow = ai.defineFlow(
  {
    name: 'generateSchemaFromUrlFlow',
    inputSchema: GenerateSchemaInputSchema,
    outputSchema: GenerateSchemaOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
      name: 'fixedAddressSchemaPrompt',
      input: { schema: z.object({url: z.string()}) },
      output: { schema: GenerateSchemaOutputSchema },
      tools: [fetchPageContentTool],
      prompt: `
        You are an expert at creating JSON-LD schema markup with FIXED postal address extraction.
        
        IMPORTANT INSTRUCTIONS:
        1. Use the 'fetchPageContent' tool to extract data from: ${input.url}
        2. The tool now has IMPROVED address and postal code detection
        3. Create a comprehensive LocalBusiness schema with proper address formatting
        4. Always include PostalAddress schema even if some fields are missing
        5. Use intelligent defaults for missing address components:
           - If no street address: "Address available upon request"  
           - If no city: "Local area"
           - If no state: "State"
           - Always include country as "US"
        6. Include price range based on city location or content analysis
        7. Add all available contact information, business hours, and services
        8. Create proper FAQ schema if any Q&A content is found
        9. Ensure all URLs are absolute and properly formatted
        10. Include social media links if found

        Generate a complete, valid JSON-LD schema for this business/organization.
      `,
    });
    
    const { output } = await prompt({url: input.url});
    if (!output) {
      throw new Error('Failed to generate schema with fixed address extraction.');
    }
    return output;
  }
);

export async function generateSchemaFromUrl(input: GenerateSchemaInput): Promise<GenerateSchemaOutput> {
  return await generateSchemaFromUrlFlow(input);
}
