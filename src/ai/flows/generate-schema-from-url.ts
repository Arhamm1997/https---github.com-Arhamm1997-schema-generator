'use server';
/**
 * @fileOverview Enhanced flow for generating comprehensive JSON-LD schema from a given URL.
 * Now includes FAQ extraction and local SEO optimizations.
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
        description: 'Fetches the HTML content of a given URL and extracts comprehensive content including FAQs, contact info, and business details.',
        inputSchema: z.object({ url: z.string().url() }),
        outputSchema: z.object({
            h1: z.string().optional().describe('The content of the first h1 tag.'),
            title: z.string().optional().describe('The page title.'),
            content: z.string().describe('The main text content of the page.'),
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
            }).optional().describe('Review rating and count if found.')
        }),
    },
    async ({ url }) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            const $ = load(html);

            // Extract basic content
            const h1 = $('h1').first().text().trim();
            const title = $('title').text().trim();
            const mainContent = $('main').text() || $('body').text();
            const content = mainContent.replace(/\s\s+/g, ' ').trim();

            // Extract FAQs from various possible structures
            const faqs: Array<{question: string, answer: string}> = [];
            
            // Try to extract from FAQ schema if present
            $('script[type="application/ld+json"]').each((_, element) => {
                try {
                    const jsonLD = JSON.parse($(element).html() || '');
                    if (jsonLD['@type'] === 'FAQPage' || (jsonLD.mainEntity && Array.isArray(jsonLD.mainEntity))) {
                        const questions = Array.isArray(jsonLD.mainEntity) ? jsonLD.mainEntity : [jsonLD.mainEntity];
                        questions.forEach((q: any) => {
                            if (q['@type'] === 'Question' && q.name && q.acceptedAnswer) {
                                faqs.push({
                                    question: q.name,
                                    answer: q.acceptedAnswer.text || q.acceptedAnswer.name || 'Contact us for more information.'
                                });
                            }
                        });
                    }
                    // Handle graph structure
                    if (jsonLD['@graph']) {
                        jsonLD['@graph'].forEach((item: any) => {
                            if (item['@type'] === 'FAQPage' || (item.mainEntity && Array.isArray(item.mainEntity))) {
                                const questions = Array.isArray(item.mainEntity) ? item.mainEntity : [item.mainEntity];
                                questions.forEach((q: any) => {
                                    if (q['@type'] === 'Question' && q.name && q.acceptedAnswer) {
                                        faqs.push({
                                            question: q.name,
                                            answer: q.acceptedAnswer.text || 'Contact us for more information.'
                                        });
                                    }
                                });
                            }
                        });
                    }
                } catch (e) {
                    // Ignore invalid JSON
                }
            });

            // If no structured FAQs found, try to extract from HTML
            if (faqs.length === 0) {
                // Look for common FAQ patterns
                $('.faq, .frequently-asked-questions, .questions').each((_, faqSection) => {
                    $(faqSection).find('details, .faq-item, .question').each((_, item) => {
                        const question = $(item).find('summary, .question, .faq-question, h3, h4').first().text().trim();
                        const answer = $(item).find('.answer, .faq-answer, p').first().text().trim();
                        if (question && answer) {
                            faqs.push({ question, answer });
                        }
                    });
                });
            }

            // Extract contact information
            const contactInfo: {phone?: string, email?: string, address?: string} = {};
            
            // Phone numbers
            const phoneRegex = /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
            const phoneMatch = content.match(phoneRegex);
            if (phoneMatch) {
                contactInfo.phone = phoneMatch[0].trim();
            }

            // Email addresses
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            const emailMatch = content.match(emailRegex);
            if (emailMatch) {
                contactInfo.email = emailMatch[0];
            }

            // Address (look for common patterns)
            const addressSelectors = [
                '.address', '.contact-address', '.location', 
                '[itemtype*="PostalAddress"]', '.street-address'
            ];
            for (const selector of addressSelectors) {
                const addressText = $(selector).text().trim();
                if (addressText && addressText.length > 10) {
                    contactInfo.address = addressText;
                    break;
                }
            }

            // Extract business hours
            let businessHours = '';
            const hourSelectors = ['.hours', '.business-hours', '.opening-hours', '.schedule'];
            for (const selector of hourSelectors) {
                const hoursText = $(selector).text().trim();
                if (hoursText) {
                    businessHours = hoursText;
                    break;
                }
            }

            // Extract services
            const services: string[] = [];
            $('.service, .services li, .service-item').each((_, element) => {
                const serviceText = $(element).text().trim();
                if (serviceText && serviceText.length < 100) {
                    services.push(serviceText);
                }
            });

            // Extract social links
            const socialLinks: string[] = [];
            $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="youtube.com"]').each((_, element) => {
                const href = $(element).attr('href');
                if (href && !socialLinks.includes(href)) {
                    socialLinks.push(href);
                }
            });

            // Extract review information
            const reviews: {rating?: number, count?: number} = {};
            const ratingText = $('.rating, .stars, .review-rating').first().text();
            const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
            if (ratingMatch) {
                reviews.rating = parseFloat(ratingMatch[1]);
            }
            
            const reviewCountText = $('.review-count, .total-reviews').first().text();
            const countMatch = reviewCountText.match(/(\d+)/);
            if (countMatch) {
                reviews.count = parseInt(countMatch[1]);
            }

            return {
                h1,
                title,
                content,
                faqs: faqs.length > 0 ? faqs : undefined,
                contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
                businessHours: businessHours || undefined,
                services: services.length > 0 ? services : undefined,
                socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
                reviews: Object.keys(reviews).length > 0 ? reviews : undefined
            };
        } catch (error) {
            console.error('Error fetching page content:', error);
            throw new Error('Failed to fetch or process page content.');
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

        3. **Essential Local SEO Elements**:
           - Complete address with PostalAddress schema
           - Contact information (telephone, email)
           - Business hours if available (openingHoursSpecification)
           - Service area (areaServed)
           - Services offered (makesOffer with proper Offer/Service structure)
           - Social media profiles (sameAs)
           - Reviews and ratings (aggregateRating)
           - Geographic coordinates if extractable (geo with GeoCoordinates)

        4. **FAQ Schema Integration**:
           - If FAQs are found, create proper Question/Answer schema
           - Each question should have @type: "Question"
           - Each answer should have @type: "Answer"
           - Include FAQs in mainEntity or as separate FAQPage

        5. **Business Type Detection**: Choose the most appropriate @type from:
           [LocalBusiness, Restaurant, ProfessionalService, LegalService, MedicalBusiness, 
           HomeAndConstructionBusiness, AutomotiveBusiness, Organization]

        6. **Voice Search Optimization**:
           - Conversational descriptions (20-30 words)
           - Include natural language patterns
           - Add speakable content selectors
           - Optimize for "near me" searches with location data

        7. **Schema Quality**:
           - Remove any null, undefined, or empty values
           - Ensure all required properties are present
           - Use proper schema.org types and properties
           - Include relevant structured data for rich snippets

        Return a complete, valid JSON-LD schema object that maximizes local SEO potential and voice search visibility.
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
