'use server';
/**
 * @fileOverview Enhanced flow for generating comprehensive JSON-LD schema from a given URL.
 * Now includes enhanced footer address extraction and better handling of incomplete addresses.
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
        description: 'Fetches the HTML content of a given URL and extracts comprehensive content with enhanced footer address extraction.',
        inputSchema: z.object({ url: z.string().url() }),
        outputSchema: z.object({
            h1: z.string().optional().describe('The content of the first h1 tag.'),
            title: z.string().optional().describe('The page title.'),
            content: z.string().describe('The main text content of the page.'),
            footerContent: z.string().optional().describe('Content specifically from footer sections.'),
            headerContent: z.string().optional().describe('Content specifically from header sections.'),
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
                address: z.string().optional(),
                footerAddress: z.string().optional(),
                fullAddress: z.object({
                    street: z.string().optional(),
                    city: z.string().optional(),
                    state: z.string().optional(),
                    zip: z.string().optional(),
                    country: z.string().optional()
                }).optional()
            }).optional().describe('Contact information found on the page.'),
            businessHours: z.string().optional().describe('Business hours if found.'),
            services: z.array(z.string()).optional().describe('Services mentioned on the page.'),
            socialLinks: z.array(z.string()).optional().describe('Social media links found.'),
            reviews: z.object({
                rating: z.number().optional(),
                count: z.number().optional()
            }).optional().describe('Review rating and count if found.'),
            metaDescription: z.string().optional().describe('Meta description from the page.'),
            keywords: z.string().optional().describe('Meta keywords from the page.'),
            priceRange: z.string().optional().describe('Price range information if found.'),
            businessType: z.string().optional().describe('Type of business detected.'),
            location: z.object({
                latitude: z.number().optional(),
                longitude: z.number().optional(),
                address: z.string().optional()
            }).optional().describe('Location coordinates and address.'),
            awards: z.array(z.string()).optional().describe('Awards or certifications mentioned.')
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

            // Enhanced title extraction
            const title = $('title').first().text().trim() || 
                         $('meta[property="og:title"]').attr('content') || 
                         $('meta[name="twitter:title"]').attr('content') || 
                         $('h1').first().text().trim() || 
                         '';

            // Enhanced H1 extraction
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

            if (!content || content.length < 100) {
                content = $('body').text();
            }
            content = content.replace(/\s\s+/g, ' ').trim();

            // Extract footer content specifically
            let footerContent = '';
            const footerSelectors = [
                'footer',
                '.footer',
                '#footer',
                '.site-footer',
                '.page-footer',
                '.main-footer',
                '.footer-content',
                '.footer-section',
                '[role="contentinfo"]'
            ];

            for (const selector of footerSelectors) {
                const footerText = $(selector).text();
                if (footerText && footerText.length > footerContent.length) {
                    footerContent = footerText;
                }
            }
            footerContent = footerContent.replace(/\s\s+/g, ' ').trim();

            // Extract header content
            let headerContent = '';
            const headerSelectors = [
                'header',
                '.header',
                '#header',
                '.site-header',
                '.page-header',
                '.main-header',
                '.top-header',
                '[role="banner"]'
            ];

            for (const selector of headerSelectors) {
                const headerText = $(selector).text();
                if (headerText && headerText.length > headerContent.length) {
                    headerContent = headerText;
                }
            }
            headerContent = headerContent.replace(/\s\s+/g, ' ').trim();

            // Extract meta information
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
                    if (src.startsWith('//')) {
                        src = baseUrl.protocol + src;
                    } else if (src.startsWith('/')) {
                        src = baseUrl.origin + src;
                    } else if (!src.startsWith('http')) {
                        src = new URL(src, url).href;
                    }
                    
                    const alt = $img.attr('alt') || '';
                    const title = $img.attr('title') || '';
                    
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

            if (faqs.length === 0) {
                const faqSelectors = [
                    '.faq', '.frequently-asked-questions', '.questions',
                    '.qa-section', '.accordion', '[id*="faq"]', '[class*="faq"]'
                ];

                faqSelectors.forEach(selector => {
                    $(selector).each((_, faqSection) => {
                        $(faqSection).find('details').each((_, item) => {
                            const question = $(item).find('summary').first().text().trim();
                            const answer = $(item).contents().not('summary').text().trim();
                            if (question && answer) {
                                faqs.push({ question, answer });
                            }
                        });

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

            // Enhanced contact information extraction with footer focus
            const contactInfo: {
                phone?: string, 
                email?: string, 
                address?: string,
                footerAddress?: string,
                fullAddress?: {
                    street?: string,
                    city?: string,
                    state?: string,
                    zip?: string,
                    country?: string
                }
            } = {};

            // Combine content sources for contact extraction
            const allContent = `${content} ${footerContent} ${headerContent}`;
            
            // Phone extraction
            const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\(?[0-9]{3}\)?[-.\s]?[0-9]{2}[-.\s]?[0-9]{2}[-.\s]?[0-9]{3})/g;
            const phoneMatches = allContent.match(phoneRegex);
            if (phoneMatches && phoneMatches.length > 0) {
                contactInfo.phone = phoneMatches[0].trim();
            }

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

            // Email extraction
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            const emailMatches = allContent.match(emailRegex);
            if (emailMatches && emailMatches.length > 0) {
                const filteredEmails = emailMatches.filter(email => 
                    !email.includes('example.com') && 
                    !email.includes('test.com') &&
                    !email.includes('placeholder')
                );
                if (filteredEmails.length > 0) {
                    contactInfo.email = filteredEmails[0];
                }
            }

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

            // Enhanced address extraction with footer priority
            const addressSelectors = [
                'footer .address', 'footer .contact-address', 'footer .location',
                '.footer .address', '.footer .contact-address', '.footer .location',
                '.address', '.contact-address', '.location', 
                '[itemtype*="PostalAddress"]', '.street-address',
                '.postal-address', '.contact-info .address'
            ];
            
            for (const selector of addressSelectors) {
                const addressText = $(selector).text().trim();
                if (addressText && addressText.length > 10 && addressText.length < 300) {
                    if (selector.includes('footer')) {
                        contactInfo.footerAddress = addressText;
                        contactInfo.address = addressText; // Prefer footer address
                        break;
                    } else if (!contactInfo.address) {
                        contactInfo.address = addressText;
                    }
                }
            }

            // If no structured address found, try to extract from footer content
            if (!contactInfo.address && footerContent) {
                // Address patterns in footer
                const addressPatterns = [
                    /(\d+[\w\s,.-]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)[\w\s,.-]*(?:\d{5}|\w{2}\s*\d{5}))/gi,
                    /([A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/g,
                    /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl))/gi
                ];

                for (const pattern of addressPatterns) {
                    const matches = footerContent.match(pattern);
                    if (matches && matches.length > 0) {
                        contactInfo.footerAddress = matches[0].trim();
                        contactInfo.address = matches[0].trim();
                        break;
                    }
                }
            }

            // Parse address components if we have an address
            if (contactInfo.address) {
                const fullAddress: any = {};
                const addressText = contactInfo.address;

                // Extract zip code
                const zipMatch = addressText.match(/\b\d{5}(-\d{4})?\b/);
                if (zipMatch) {
                    fullAddress.zip = zipMatch[0];
                }

                // Extract state (2 letter code)
                const stateMatch = addressText.match(/\b[A-Z]{2}\b/);
                if (stateMatch) {
                    fullAddress.state = stateMatch[0];
                }

                // Extract city (word before state)
                const cityMatch = addressText.match(/([A-Za-z\s]+),\s*[A-Z]{2}/);
                if (cityMatch) {
                    fullAddress.city = cityMatch[1].trim();
                }

                // Extract street (everything before city)
                const streetMatch = addressText.match(/^([^,]+)/);
                if (streetMatch) {
                    fullAddress.street = streetMatch[1].trim();
                }

                // Default country
                fullAddress.country = 'US';

                if (Object.keys(fullAddress).length > 0) {
                    contactInfo.fullAddress = fullAddress;
                }
            }

            // Rest of the extraction code remains the same...
            let businessHours = '';
            const hourSelectors = [
                '.hours', '.business-hours', '.opening-hours', '.schedule',
                '.operating-hours', '.store-hours', '.office-hours', '.working-hours'
            ];
            
            for (const selector of hourSelectors) {
                const hoursText = $(selector).text().trim();
                if (hoursText && hoursText.length > 5) {
                    businessHours = hoursText;
                    break;
                }
            }

            const services: string[] = [];
            const serviceSelectors = [
                '.service', '.services li', '.service-item',
                '.services .item', '.service-list li', '.offerings li', '.what-we-do li'
            ];
            
            serviceSelectors.forEach(selector => {
                $(selector).each((_, element) => {
                    const serviceText = $(element).text().trim();
                    if (serviceText && serviceText.length < 100 && serviceText.length > 3) {
                        services.push(serviceText);
                    }
                });
            });

            const socialLinks: string[] = [];
            const socialDomains = [
                'facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 
                'instagram.com', 'youtube.com', 'tiktok.com', 'pinterest.com', 'snapchat.com'
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

            const reviews: {rating?: number, count?: number} = {};
            const ratingSelectors = [
                '.rating', '.stars', '.review-rating', '.star-rating',
                '[class*="rating"]', '[class*="stars"]'
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
            
            const reviewCountSelectors = [
                '.review-count', '.total-reviews', '.reviews-count',
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

            let priceRange = '';
            const priceSelectors = ['.price-range', '.pricing', '.cost', '.price'];
            priceSelectors.forEach(selector => {
                if (!priceRange) {
                    const priceText = $(selector).text().trim();
                    if (priceText.match(/\$+/)) {
                        priceRange = priceText;
                    }
                }
            });

            let businessType = 'LocalBusiness';
            const businessTypeKeywords = {
                'Restaurant': ['restaurant', 'cafe', 'diner', 'bistro', 'food', 'menu'],
                'MedicalBusiness': ['medical', 'doctor', 'clinic', 'hospital', 'health'],
                'LegalService': ['law', 'lawyer', 'attorney', 'legal'],
                'HVACBusiness': ['hvac', 'heating', 'cooling', 'air conditioning'],
                'HomeAndConstructionBusiness': ['construction', 'contractor', 'builder', 'renovation'],
                'ProfessionalService': ['consulting', 'service', 'professional'],
                'AutomotiveBusiness': ['auto', 'car', 'automotive', 'mechanic']
            };

            const lowerContent = allContent.toLowerCase();
            for (const [type, keywords] of Object.entries(businessTypeKeywords)) {
                if (keywords.some(keyword => lowerContent.includes(keyword))) {
                    businessType = type;
                    break;
                }
            }

            const location: {latitude?: number, longitude?: number, address?: string} = {};
            $('script[type="application/ld+json"]').each((_, element) => {
                try {
                    const jsonLD = JSON.parse($(element).html() || '');
                    const extractLocationFromSchema = (schema: any) => {
                        if (schema.geo && schema.geo.latitude && schema.geo.longitude) {
                            location.latitude = parseFloat(schema.geo.latitude);
                            location.longitude = parseFloat(schema.geo.longitude);
                        }
                        if (schema.address && typeof schema.address === 'string') {
                            location.address = schema.address;
                        } else if (schema.address && schema.address.streetAddress) {
                            location.address = `${schema.address.streetAddress}, ${schema.address.addressLocality}, ${schema.address.addressRegion}`;
                        }
                    };

                    if (Array.isArray(jsonLD)) {
                        jsonLD.forEach(extractLocationFromSchema);
                    } else if (jsonLD['@graph']) {
                        jsonLD['@graph'].forEach(extractLocationFromSchema);
                    } else {
                        extractLocationFromSchema(jsonLD);
                    }
                } catch (e) {
                    // Ignore invalid JSON
                }
            });

            const awards: string[] = [];
            const awardSelectors = ['.award', '.certification', '.accreditation', '.recognition'];
            awardSelectors.forEach(selector => {
                $(selector).each((_, element) => {
                    const awardText = $(element).text().trim();
                    if (awardText && awardText.length > 5 && awardText.length < 100) {
                        awards.push(awardText);
                    }
                });
            });

            return {
                h1: h1 || undefined,
                title: title || undefined,
                content,
                footerContent: footerContent || undefined,
                headerContent: headerContent || undefined,
                images: images.length > 0 ? images.slice(0, 10) : undefined,
                faqs: faqs.length > 0 ? faqs : undefined,
                contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
                businessHours: businessHours || undefined,
                services: services.length > 0 ? services.slice(0, 20) : undefined,
                socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
                reviews: Object.keys(reviews).length > 0 ? reviews : undefined,
                metaDescription: metaDescription || undefined,
                keywords: keywords || undefined,
                priceRange: priceRange || undefined,
                businessType: businessType || undefined,
                location: Object.keys(location).length > 0 ? location : undefined,
                awards: awards.length > 0 ? awards : undefined
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
        
        2. **Address Handling**: The tool now extracts addresses from footers and provides structured address components.
           - Use footerAddress if available (preferred)
           - Use fullAddress components if parsed successfully
           - If address is incomplete, create a valid PostalAddress with available information
           - NEVER fail schema generation due to incomplete address - use placeholders if needed

        3. **Create Comprehensive Schema Structure**: Build a schema with the following structure:
           - Root @type: "WebPage" with the page URL
           - mainEntity: Primary business/organization information with correct @type
           - Include FAQ schema if questions/answers are found
           - Add Organization schema with complete details
           - Include breadcrumbs if applicable
           - Add ImageObject schema for important images

        4. **Flexible Address Validation**:
           - If complete address found in footer, use it
           - If partial address found, supplement with placeholders:
             * streetAddress: Use extracted street or "Address available upon request"
             * addressLocality: Use extracted city or "Local Area"
             * addressRegion: Use extracted state or "State"
             * postalCode: Use extracted zip or leave undefined
             * addressCountry: Default to "US" or extracted country

        5. **Essential Local SEO Elements**:
           - Complete address with PostalAddress schema (using flexible validation above)
           - Contact information (telephone, email) - ensure proper formatting
           - Business hours if available (openingHoursSpecification with proper format)
           - Service area (areaServed) 
           - Services offered (makesOffer with proper Offer/Service structure)
           - Social media profiles (sameAs)
           - Reviews and ratings (aggregateRating) - validate rating is between 1-5
           - Geographic coordinates if extractable (geo with GeoCoordinates)
           - Images with proper ImageObject schema
           - Price range information if available

        6. **FAQ Schema Integration**:
           - If FAQs are found, create proper Question/Answer schema
           - Each question should have @type: "Question"
           - Each answer should have @type: "Answer"
           - Include FAQs in mainEntity or as separate FAQPage

        7. **Image Schema Integration**:
           - Add relevant images as ImageObject schema
           - Include image URLs, alt text, and descriptions
           - Focus on business-relevant images (logos, products, facilities)

        8. **Business Type Detection**: Choose the most appropriate @type from the detected businessType or use:
           [LocalBusiness, Restaurant, ProfessionalService, LegalService, MedicalBusiness, 
           HomeAndConstructionBusiness, AutomotiveBusiness, Organization]

        9. **Voice Search Optimization**:
           - Conversational descriptions (20-30 words)
           - Include natural language patterns
           - Optimize for "near me" searches with location data
           - DO NOT include speakable schema - this should be excluded

        10. **Schema Quality and Validation**:
           - Remove any null, undefined, or empty values
           - Ensure all required properties are present for the chosen @type
           - Use proper schema.org types and properties
           - Include relevant structured data for rich snippets
           - Validate that all URLs are absolute and properly formatted
           - Create valid PostalAddress even with incomplete data
           - Validate phone numbers are in proper format
           - Validate price range uses proper symbols ($, $$, $$$, $$$$)
           - Validate coordinates are valid numbers if present
           - Validate rating values are between 1 and 5

        11. **Enhanced Data Collection**:
           - Prioritize footer content for contact information
           - Collect all business information exactly as found
           - Include awards and certifications if found
           - Include all social media profiles
           - Include all services offered
           - Include complete business hours
           - Include price range information
           - Include location coordinates if available

        IMPORTANT: 
        - Do NOT include any speakable schema elements
        - NEVER fail schema generation due to incomplete address information
        - Use footer content as the primary source for contact details
        - Create valid schema even with partial data by using appropriate placeholders
        - Prioritize extracted footer address over general page content

        Return a complete, valid JSON-LD schema object that maximizes local SEO potential and voice search visibility without speakable elements.
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
