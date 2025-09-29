'use server';
/**
 * @fileOverview Enhanced flow for generating comprehensive JSON-LD schema from a given URL.
 * Enhanced with better postal code and price range detection based on location context.
 * Now supports multiple AI providers (Gemini, OpenAI, Claude) with unified interface.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { load } from 'cheerio';
// Dynamic import to avoid client-side issues

const GenerateSchemaInputSchema = z.object({
  url: z.string().url().describe('The URL of the webpage to analyze.'),
});
export type GenerateSchemaInput = z.infer<typeof GenerateSchemaInputSchema>;

const GenerateSchemaOutputSchema = z.object({
    schema: z.any().describe("The generated JSON-LD schema object."),
});
export type GenerateSchemaOutput = z.infer<typeof GenerateSchemaOutputSchema>;

// Enhanced postal code patterns by region
const postalCodePatterns = {
    US: /\b\d{5}(-\d{4})?\b/g,
    CA: /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/gi,
    UK: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi,
    AU: /\b\d{4}\b/g
};

// City-based price range mapping (can be expanded)
const cityPriceMapping: { [key: string]: string } = {
    // High-cost cities
    'new york': '$$$$',
    'san francisco': '$$$$',
    'los angeles': '$$$',
    'seattle': '$$$',
    'boston': '$$$',
    'washington': '$$$',
    'chicago': '$$$',
    'miami': '$$$',
    
    // Mid-cost cities
    'atlanta': '$$',
    'denver': '$$',
    'austin': '$$',
    'dallas': '$$',
    'houston': '$$',
    'phoenix': '$$',
    'portland': '$$',
    'nashville': '$$',
    
    // Lower-cost cities
    'detroit': '$',
    'cleveland': '$',
    'kansas city': '$',
    'oklahoma city': '$',
    'memphis': '$',
};

const fetchPageContentTool = ai.defineTool(
    {
        name: 'fetchPageContent',
        description: 'Fetches the HTML content of a given URL and extracts comprehensive content with enhanced address and price detection.',
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

            // Enhanced contact information extraction with better postal code detection
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

            // Enhanced address extraction with better postal code detection
            const addressSelectors = [
                'footer .address', 'footer .contact-address', 'footer .location',
                '.footer .address', '.footer .contact-address', '.footer .location',
                '.address', '.contact-address', '.location', 
                '[itemtype*="PostalAddress"]', '.street-address',
                '.postal-address', '.contact-info .address',
                '[class*="address"]', '[class*="contact"]'
            ];
            
            let foundAddress = '';
            for (const selector of addressSelectors) {
                const addressText = $(selector).text().trim();
                if (addressText && addressText.length > 10 && addressText.length < 500) {
                    if (selector.includes('footer')) {
                        contactInfo.footerAddress = addressText;
                        foundAddress = addressText;
                        break;
                    } else if (!foundAddress) {
                        foundAddress = addressText;
                    }
                }
            }

            if (!foundAddress && footerContent) {
                // Enhanced address patterns for better detection
                const addressPatterns = [
                    // US address patterns
                    /(\d+[\w\s,.-]*(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|way|court|ct\.?|place|pl\.?)[\w\s,.-]*(?:\d{5}(?:-\d{4})?|[A-Z]{2}\s*\d{5}(?:-\d{4})?))/gi,
                    // City, State ZIP patterns
                    /([A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/g,
                    // Street number + street name patterns
                    /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl)[\w\s,]*)/gi
                ];

                for (const pattern of addressPatterns) {
                    const matches = footerContent.match(pattern);
                    if (matches && matches.length > 0) {
                        const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
                        contactInfo.footerAddress = longestMatch.trim();
                        foundAddress = longestMatch.trim();
                        break;
                    }
                }
            }

            contactInfo.address = foundAddress || contactInfo.footerAddress;

            // Enhanced address parsing with better postal code detection
            if (contactInfo.address) {
                const fullAddress: any = {};
                const addressText = contactInfo.address;

                // Enhanced postal code extraction with multiple patterns
                let zipCode = '';
                for (const [region, pattern] of Object.entries(postalCodePatterns)) {
                    const matches = addressText.match(pattern);
                    if (matches && matches.length > 0) {
                        zipCode = matches[0].trim();
                        if (region === 'US' || region === 'CA') {
                            fullAddress.country = region === 'US' ? 'US' : 'CA';
                        }
                        break;
                    }
                }
                if (zipCode) fullAddress.zip = zipCode;

                // Enhanced state extraction
                const statePatterns = [
                    /\b([A-Z]{2})\b(?=\s*\d{5})/,  // State code before ZIP
                    /,\s*([A-Z]{2})\s*(?:\d{5})?/,  // State after city
                    /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i
                ];
                
                for (const pattern of statePatterns) {
                    const stateMatch = addressText.match(pattern);
                    if (stateMatch) {
                        let state = stateMatch[1];
                        // Convert full state names to abbreviations if needed
                        if (state.length > 2) {
                            // Add state name to abbreviation mapping if needed
                            const stateAbbrevMap: { [key: string]: string } = {
                                'california': 'CA', 'new york': 'NY', 'texas': 'TX', 
                                'florida': 'FL', 'illinois': 'IL', 'pennsylvania': 'PA',
                                // Add more as needed
                            };
                            state = stateAbbrevMap[state.toLowerCase()] || state;
                        }
                        fullAddress.state = state;
                        break;
                    }
                }

                // Enhanced city extraction
                const cityPatterns = [
                    /([A-Za-z\s]+),\s*[A-Z]{2}/,  // City before state
                    /(?:^|\n)([A-Za-z\s]+),\s*[A-Z]{2}/,  // City at start of line
                ];
                
                for (const pattern of cityPatterns) {
                    const cityMatch = addressText.match(pattern);
                    if (cityMatch && cityMatch[1]) {
                        const city = cityMatch[1].trim();
                        // Filter out common non-city words
                        if (!['street', 'avenue', 'road', 'drive', 'lane'].some(word => 
                            city.toLowerCase().includes(word))) {
                            fullAddress.city = city;
                            break;
                        }
                    }
                }

                // Enhanced street extraction
                const streetPatterns = [
                    /(\d+[\w\s]*(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|way|court|ct\.?|place|pl\.?))/gi,
                    /^([^\n,]*(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|way|court|ct\.?|place|pl\.?))/gi
                ];
                
                for (const pattern of streetPatterns) {
                    const streetMatch = addressText.match(pattern);
                    if (streetMatch && streetMatch[0]) {
                        fullAddress.street = streetMatch[0].trim();
                        break;
                    }
                }

                // If no street found, use first line of address
                if (!fullAddress.street) {
                    const firstLine = addressText.split(/[,\n]/)[0].trim();
                    if (firstLine && firstLine.length > 5) {
                        fullAddress.street = firstLine;
                    }
                }

                // Default country if not set
                if (!fullAddress.country) {
                    fullAddress.country = 'US';
                }

                if (Object.keys(fullAddress).length > 0) {
                    contactInfo.fullAddress = fullAddress;
                }
            }

            // Business hours extraction (existing logic)
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

            // Services extraction (existing logic)
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

            // Social links extraction (existing logic)
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

            // Reviews extraction (existing logic)
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

            // Enhanced price range detection with city context
            let priceRange = '';
            const priceSelectors = [
                '.price-range', '.pricing', '.cost', '.price', '.menu-price',
                '[class*="price"]', '.rates', '.fees', '.service-cost'
            ];
            
            // First, try to find explicit price range indicators
            priceSelectors.forEach(selector => {
                if (!priceRange) {
                    const priceText = $(selector).text().trim();
                    // Look for dollar signs
                    const dollarMatch = priceText.match(/\$+/);
                    if (dollarMatch) {
                        priceRange = dollarMatch[0];
                    }
                    // Look for price descriptors
                    else if (priceText.match(/\b(budget|cheap|inexpensive|affordable|low.?cost)\b/i)) {
                        priceRange = '$';
                    }
                    else if (priceText.match(/\b(moderate|mid.?range|reasonable)\b/i)) {
                        priceRange = '$$';
                    }
                    else if (priceText.match(/\b(expensive|high.?end|premium|upscale)\b/i)) {
                        priceRange = '$$$';
                    }
                    else if (priceText.match(/\b(luxury|very.?expensive|exclusive)\b/i)) {
                        priceRange = '$$$$';
                    }
                }
            });

            // If no explicit price range found, use city-based estimation
            if (!priceRange && contactInfo.fullAddress?.city) {
                const city = contactInfo.fullAddress.city.toLowerCase();
                priceRange = cityPriceMapping[city] || '$$'; // Default to moderate
            }

            // Business type detection (existing logic)
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

            // Location extraction (existing logic)
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

            // Awards extraction (existing logic)
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
        You are an expert at creating comprehensive, voice-search-optimized JSON-LD schema markup following schema.org standards with enhanced address and price detection.
        
        Your task is to analyze the content of the given URL and generate a complete, SEO-optimized JSON-LD schema with intelligent postal code and price range detection.

        1. **Fetch Content**: Use the 'fetchPageContent' tool to get comprehensive data from the URL: ${input.url}.
        
        2. **Enhanced Address Processing**: The tool now includes advanced postal code detection:
           - Multi-region postal code patterns (US, CA, UK, AU)
           - Enhanced city and state extraction
           - Better street address parsing
           - Contextual address validation

        3. **Intelligent Price Range Detection**: The tool now includes:
           - City-based price estimation (high-cost cities like NYC get $$$$, lower-cost get $)
           - Content-based price range detection from text
           - Service industry context-aware pricing
           - Fallback to moderate pricing if unclear

        4. **Create Comprehensive Schema Structure**: Build a schema with the following structure:
           - Root @type: "WebPage" with the page URL
           - mainEntity: Primary business/organization information with correct @type
           - Include FAQ schema if questions/answers are found
           - Add Organization schema with complete details
           - Include breadcrumbs if applicable
           - Add ImageObject schema for important images

        5. **Address Validation with Auto-Fill**:
           - Use extracted postal code with confidence
           - Apply city-based price range intelligence
           - Fill missing address components with contextual data:
             * streetAddress: Use extracted street or "Address available upon request"
             * addressLocality: Use extracted city or "Local Area"
             * addressRegion: Use extracted state or "State"
             * postalCode: Use detected postal code or leave undefined
             * addressCountry: Default to detected country or "US"

        6. **Enhanced Local SEO Elements**:
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

        7. **FAQ Schema Integration** (existing logic maintained)
        8. **Image Schema Integration** (existing logic maintained)
        9. **Business Type Detection** (existing logic maintained)
        10. **Voice Search Optimization** (existing logic maintained)
        11. **Schema Quality and Validation** (existing logic maintained)

        IMPORTANT: 
        - Prioritize extracted postal codes and city-based price ranges
        - Use intelligent defaults for missing address components
        - Apply location-aware price estimation
        - Create valid schema even with partial data
        - Do NOT include speakable schema elements

        Return a complete, valid JSON-LD schema object with enhanced address and pricing intelligence.
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
  // Try to use the new AI provider system first
  try {
    // Dynamic import to avoid client-side issues
    const { aiProviderManager } = await import('@/ai/providers');
    const availableProviders = aiProviderManager.getAvailableProviders();
    if (availableProviders.length > 0) {
      console.log('Using new AI provider system with available providers:', availableProviders);
      const result = await aiProviderManager.generateSchemaFromUrl(input);
      return { schema: result.schema };
    }
  } catch (error) {
    console.warn('New AI provider system failed, falling back to genkit:', error);
  }
  
  // Fall back to the original genkit flow
  return await generateSchemaFromUrlFlow(input);
}


