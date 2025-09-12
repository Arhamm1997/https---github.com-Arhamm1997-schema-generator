'use server';
/**
 * @fileOverview Enhanced flow for generating comprehensive JSON-LD schema from a given URL.
 * Now includes FAQ extraction, local SEO optimizations, and better content extraction.
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

const fetchPageContentTool = ai.defineTool(
    {
        name: 'fetchPageContent',
        description: 'Fetches the HTML content of a given URL and extracts comprehensive content including FAQs, contact info, business details, and images.',
        inputSchema: z.object({ url: z.string().url() }),
        outputSchema: z.object({
            h1: z.string().optional().describe('The content of the first h1 tag.'),
            title: z.string().optional().describe('The page title.'),
            content: z.string().describe('The main text content of the page.'),
            images: z.array(z.object({
                src: z.string(),
                alt: z.string().optional(),
                title: z.string().optional()
            })).optional().describe('Images found on the page.'),
            faqs: z.array(z.object({
                question: z.string(),
                answer: z.string()
            })).optional().describe('Extracted FAQ questions and answers.'),
            contactInfo: z.object({
                phone: z.string().optional(),
                email: z.string().optional(),
                address: z.string().optional()
            }).optional().describe('Contact information found on the page.'),
            businessHours: z.string().optional().describe('Business hours if found.'),
            services: z.array(z.string()).optional().describe('Services mentioned on the page.'),
            socialLinks: z.array(z.string()).optional().describe('Social media links found.'),
            reviews: z.object({
                rating: z.number().optional(),
                count: z.number().optional()
            }).optional().describe('Review rating and count if found.'),
            metaDescription: z.string().optional().describe('Meta description from the page.'),
            keywords: z.string().optional().describe('Meta keywords from the page.')
        }),
    },
    async ({ url }) => {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const $ = load(html);

            // Enhanced title extraction with multiple fallbacks
            const title = $('title').first().text().trim() || 
                         $('meta[property="og:title"]').attr('content') || 
                         $('meta[name="twitter:title"]').attr('content') || 
                         $('h1').first().text().trim() || 
                         '';

            // Enhanced H1 extraction with fallbacks
            const h1 = $('h1').first().text().trim() || 
                      $('h1').eq(1).text().trim() || 
                      $('.page-title, .entry-title, .post-title, .main-title').first().text().trim() ||
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
                '#content',
                '.container .content',
                'article'
            ];

            for (const selector of contentSelectors) {
                const selectedContent = $(selector).first().text();
                if (selectedContent && selectedContent.length > content.length) {
                    content = selectedContent;
                }
            }

            // Fallback to body if no main content found
            if (!content || content.length < 100) {
                content = $('body').text();
            }

            // Clean up content
            content = content.replace(/\s\s+/g, ' ').trim();

            // Extract meta description and keywords
            const metaDescription = $('meta[name="description"]').attr('content') || 
                                  $('meta[property="og:description"]').attr('content') || 
                                  '';
            
            const keywords = $('meta[name="keywords"]').attr('content') || '';

            // Enhanced image extraction
            const images: Array<{src: string, alt?: string, title?: string}> = [];
            const baseUrl = new URL(url);
            
            $('img').each((_, element) => {
                const $img = $(element);
                let src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
                
                if (src) {
                    // Convert relative URLs to absolute
                    if (src.startsWith('//')) {
                        src = baseUrl.protocol + src;
                    } else if (src.startsWith('/')) {
                        src = baseUrl.origin + src;
                    } else if (!src.startsWith('http')) {
                        src = new URL(src, url).href;
                    }
                    
                    const alt = $img.attr('alt') || '';
                    const title = $img.attr('title') || '';
                    
                    // Filter out small images (likely icons/logos)
                    const width = parseInt($img.attr('width') || '0');
                    const height = parseInt($img.attr('height') || '0');
                    
                    if ((width === 0 || width >= 200) && (height === 0 || height >= 150)) {
                        images.push({
                            src,
                            alt: alt || undefined,
                            title: title || undefined
                        });
                    }
                }
            });

            // Enhanced FAQ extraction
            const faqs: Array<{question: string, answer: string}> = [];
            
            // Try to extract from existing JSON-LD schema
            $('script[type="application/ld+json"]').each((_, element) => {
                try {
                    const jsonLD = JSON.parse($(element).html() || '');
                    const extractFAQsFromSchema = (schema: any) => {
                        if (schema['@type'] === 'FAQPage' && schema.mainEntity) {
                            const questions = Array.isArray(schema.mainEntity) ? schema.mainEntity : [schema.mainEntity];
                            questions.forEach((q: any) => {
                                if (q['@type'] === 'Question' && q.name && q.acceptedAnswer) {
                                    faqs.push({
                                        question: q.name,
                                        answer: q.acceptedAnswer.text || q.acceptedAnswer.name || 'Contact us for more information.'
                                    });
                                }
                            });
                        }
                    };

                    if (Array.isArray(jsonLD)) {
                        jsonLD.forEach(extractFAQsFromSchema);
                    } else if (jsonLD['@graph']) {
                        jsonLD['@graph'].forEach(extractFAQsFromSchema);
                    } else {
                        extractFAQsFromSchema(jsonLD);
                    }
                } catch (e) {
                    // Ignore invalid JSON
                }
            });

            // If no structured FAQs found, try to extract from HTML patterns
            if (faqs.length === 0) {
                const faqSelectors = [
                    '.faq',
                    '.frequently-asked-questions', 
                    '.questions',
                    '.qa-section',
                    '.accordion',
                    '[id*="faq"]',
                    '[class*="faq"]'
                ];

                faqSelectors.forEach(selector => {
                    $(selector).each((_, faqSection) => {
                        // Try different FAQ patterns
                        $(faqSection).find('details').each((_, item) => {
                            const question = $(item).find('summary').first().text().trim();
                            const answer = $(item).contents().not('summary').text().trim();
                            if (question && answer) {
                                faqs.push({ question, answer });
                            }
                        });

                        // Try div-based FAQs
                        $(faqSection).find('.faq-item, .question, .qa-item').each((_, item) => {
                            const $item = $(item);
                            const question = $item.find('.question, .faq-question, h3, h4, .q').first().text().trim();
                            const answer = $item.find('.answer, .faq-answer, .a, p').first().text().trim();
                            if (question && answer && question !== answer) {
                                faqs.push({ question, answer });
                            }
                        });
                    });
                });
            }

            // Enhanced contact information extraction
            const contactInfo: {phone?: string, email?: string, address?: string} = {};
            
            // Phone numbers - enhanced regex
            const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\(?[0-9]{3}\)?[-.\s]?[0-9]{2}[-.\s]?[0-9]{2}[-.\s]?[0-9]{3})/g;
            const phoneMatches = content.match(phoneRegex);
            if (phoneMatches && phoneMatches.length > 0) {
                // Take the first valid phone number
                contactInfo.phone = phoneMatches[0].trim();
            }

            // Also check specific phone selectors
            const phoneSelectors = ['.phone', '.telephone', '.contact-phone', '[href^="tel:"]', '.call-us'];
            phoneSelectors.forEach(selector => {
                if (!contactInfo.phone) {
                    const phoneText = $(selector).text().trim();
                    const phoneHref = $(selector).attr('href');
                    
                    if (phoneHref && phoneHref.startsWith('tel:')) {
                        contactInfo.phone = phoneHref.replace('tel:', '').trim();
                    } else if (phoneText && phoneRegex.test(phoneText)) {
                        contactInfo.phone = phoneText;
                    }
                }
            });

            // Email addresses - enhanced extraction
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            const emailMatches = content.match(emailRegex);
            if (emailMatches && emailMatches.length > 0) {
                // Filter out common non-business emails
                const filteredEmails = emailMatches.filter(email => 
                    !email.includes('example.com') && 
                    !email.includes('test.com') &&
                    !email.includes('placeholder')
                );
                if (filteredEmails.length > 0) {
                    contactInfo.email = filteredEmails[0];
                }
            }

            // Check email links
            const emailSelectors = ['[href^="mailto:"]', '.email', '.contact-email'];
            emailSelectors.forEach(selector => {
                if (!contactInfo.email) {
                    const emailHref = $(selector).attr('href');
                    const emailText = $(selector).text().trim();
                    
                    if (emailHref && emailHref.startsWith('mailto:')) {
                        contactInfo.email = emailHref.replace('mailto:', '').trim();
                    } else if (emailText && emailRegex.test(emailText)) {
                        contactInfo.email = emailText;
                    }
                }
            });

            // Enhanced address extraction with multiple attempts
            const addressSelectors = [
                '.address', 
                '.contact-address', 
                '.location', 
                '[itemtype*="PostalAddress"]', 
                '.street-address',
                '.postal-address',
                '.contact-info .address',
                '.footer .address',
                '.location-info',
                '.office-location'
            ];
            
            // Try multiple methods to extract address
            for (const selector of addressSelectors) {
                const addressText = $(selector).text().trim();
                if (addressText && addressText.length > 10 && addressText.length < 200) {
                    contactInfo.address = addressText;
                    break;
                }
            }

            // If no address found in specific selectors, try to extract from content using patterns
            if (!contactInfo.address) {
                const addressPatterns = [
                    /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl)\s*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}/gi,
                    /\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/gi
                ];

                for (const pattern of addressPatterns) {
                    const matches = content.match(pattern);
                    if (matches && matches.length > 0) {
                        contactInfo.address = matches[0].trim();
                        break;
                    }
                }
            }

            // Extract business hours - enhanced
            let businessHours = '';
            const hourSelectors = [
                '.hours', 
                '.business-hours', 
                '.opening-hours', 
                '.schedule',
                '.operating-hours',
                '.store-hours',
                '.office-hours',
                '.working-hours'
            ];
            
            for (const selector of hourSelectors) {
                const hoursText = $(selector).text().trim();
                if (hoursText && hoursText.length > 5) {
                    businessHours = hoursText;
                    break;
                }
            }

            // Extract services - enhanced
            const services: string[] = [];
            const serviceSelectors = [
                '.service', 
                '.services li', 
                '.service-item',
                '.services .item',
                '.service-list li',
                '.offerings li',
                '.what-we-do li'
            ];
            
            serviceSelectors.forEach(selector => {
                $(selector).each((_, element) => {
                    const serviceText = $(element).text().trim();
                    if (serviceText && serviceText.length < 100 && serviceText.length > 3) {
                        services.push(serviceText);
                    }
                });
            });

            // Extract social links - enhanced
            const socialLinks: string[] = [];
            const socialDomains = [
                'facebook.com', 
                'twitter.com', 
                'x.com',
                'linkedin.com', 
                'instagram.com', 
                'youtube.com',
                'tiktok.com',
                'pinterest.com',
                'snapchat.com'
            ];
            
            $('a[href]').each((_, element) => {
                const href = $(element).attr('href');
                if (href) {
                    for (const domain of socialDomains) {
                        if (href.includes(domain) && !socialLinks.includes(href)) {
                            socialLinks.push(href);
                            break;
                        }
                    }
                }
            });

            // Extract review information - enhanced
            const reviews: {rating?: number, count?: number} = {};
            
            // Try different rating selectors
            const ratingSelectors = [
                '.rating', 
                '.stars', 
                '.review-rating',
                '.star-rating',
                '[class*="rating"]',
                '[class*="stars"]'
            ];
            
            ratingSelectors.forEach(selector => {
                if (!reviews.rating) {
                    const ratingText = $(selector).text();
                    const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*(?:\/\s*5|out\s*of\s*5|stars?)?/i);
                    if (ratingMatch) {
                        const rating = parseFloat(ratingMatch[1]);
                        if (rating >= 1 && rating <= 5) {
                            reviews.rating = rating;
                        }
                    }
                }
            });
            
            // Try review count
            const reviewCountSelectors = [
                '.review-count', 
                '.total-reviews',
                '.reviews-count',
                '[class*="review"] [class*="count"]'
            ];
            
            reviewCountSelectors.forEach(selector => {
                if (!reviews.count) {
                    const countText = $(selector).text();
                    const countMatch = countText.match(/(\d+)\s*(?:reviews?|ratings?)/i);
                    if (countMatch) {
                        reviews.count = parseInt(countMatch[1]);
                    }
                }
            });

            return {
                h1: h1 || undefined,
                title: title || undefined,
                content,
                images: images.length > 0 ? images.slice(0, 10) : undefined, // Limit to 10 images
                faqs: faqs.length > 0 ? faqs : undefined,
                contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
                businessHours: businessHours || undefined,
                services: services.length > 0 ? services.slice(0, 20) : undefined, // Limit services
                socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
                reviews: Object.keys(reviews).length > 0 ? reviews : undefined,
                metaDescription: metaDescription || undefined,
                keywords: keywords || undefined
            };
        } catch (error) {
            console.error('Error fetching page content:', error);
            throw new Error(`Failed to fetch or process page content: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      name: 'enhancedSchemaFromUrlPrompt',
      input: { schema: z.object({url: z.string()}) },
      output: { schema: GenerateSchemaOutputSchema },
      tools: [fetchPageContentTool],
      prompt: `
        You are an expert at creating comprehensive, voice-search-optimized JSON-LD schema markup following schema.org standards with focus on local SEO.
        
        Your task is to analyze the content of the given URL and generate a complete, SEO-optimized JSON-LD schema.

        1. **Fetch Content**: Use the 'fetchPageContent' tool to get comprehensive data from the URL: ${input.url}.
        
        2. **Create Comprehensive Schema Structure**: Build a schema with the following structure:
           - Root @type: "WebPage" with the page URL
           - mainEntity: Primary business/organization information
           - Include FAQ schema if questions/answers are found
           - Add Organization schema with complete details
           - Include breadcrumbs if applicable
           - Add ImageObject schema for important images

        3. **Handle Missing Address Gracefully**:
           - If complete address information is not available, create a minimal address with available data
           - Use generic values like "Contact us for address details" if no address is found
           - Always include addressCountry as "US" if not specified
           - Ensure PostalAddress schema has at least addressLocality and addressCountry

        4. **Essential Local SEO Elements**:
           - Complete address with PostalAddress schema (use defaults if missing)
           - Contact information (telephone, email) - use fallbacks if not found
           - Business hours if available (openingHoursSpecification)
           - Service area (areaServed) - default to "Local Area" if not specified
           - Services offered (makesOffer with proper Offer/Service structure)
           - Social media profiles (sameAs)
           - Reviews and ratings (aggregateRating)
           - Geographic coordinates if extractable (geo with GeoCoordinates)
           - Images with proper ImageObject schema

        5. **FAQ Schema Integration**:
           - If FAQs are found, create proper Question/Answer schema
           - Each question should have @type: "Question"
           - Each answer should have @type: "Answer"
           - Include FAQs in mainEntity or as separate FAQPage

        6. **Image Schema Integration**:
           - Add relevant images as ImageObject schema
           - Include image URLs, alt text, and descriptions
           - Focus on business-relevant images (logos, products, facilities)

        7. **Business Type Detection**: Choose the most appropriate @type from:
           [LocalBusiness, Restaurant, ProfessionalService, LegalService, MedicalBusiness, 
           HomeAndConstructionBusiness, AutomotiveBusiness, Organization]

        8. **Voice Search Optimization**:
           - Conversational descriptions (20-30 words)
           - Include natural language patterns
           - Add speakable content selectors
           - Optimize for "near me" searches with location data

        9. **Schema Quality & Error Prevention**:
           - Remove any null, undefined, or empty values
           - Ensure all required properties are present with defaults if needed
           - Use proper schema.org types and properties
           - Include relevant structured data for rich snippets
           - Validate that all URLs are absolute and properly formatted
           - NEVER leave required address fields completely empty - use "Not specified" or similar defaults
           - Ensure telephone field has a value, even if it's "Contact us for phone number"

        10. **Default Values for Missing Data**:
            - If no business name found, use the page title or domain name
            - If no description found, create one from page content
            - If no phone found, use "Contact us for phone number"
            - If no address found, use: 
              - streetAddress: "Address available upon request"
              - addressLocality: "Local Area" 
              - addressRegion: "State"
              - addressCountry: "US"

        Return a complete, valid JSON-LD schema object that maximizes local SEO potential and voice search visibility while handling missing data gracefully.
      `,
    });
    
    const { output } = await prompt({url: input.url});
    if (!output) {
      throw new Error('Failed to generate enhanced schema from URL.');
    }
    return output;
  }
);

export async function generateSchemaFromUrl(input: GenerateSchemaInput): Promise<GenerateSchemaOutput> {
  return await generateSchemaFromUrlFlow(input);
}
