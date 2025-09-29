/**
 * Client-side web scraping utility using a CORS proxy
 */

export interface ScrapedContent {
  title?: string;
  h1?: string;
  content: string;
  metaDescription?: string;
  keywords?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  images?: Array<{src: string, alt?: string, title?: string}>;
  socialLinks?: string[];
  businessHours?: string;
  faqs?: Array<{question: string, answer: string}>;
  reviews?: {rating?: number, count?: number};
  priceRange?: string;
  businessType?: string;
}

// CORS proxy options for client-side scraping
const CORS_PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/'
];

export async function scrapePageContent(url: string): Promise<ScrapedContent> {
  let lastError: Error | null = null;
  
  // Try each CORS proxy in sequence
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      let html: string;
      
      // Handle different proxy response formats
      if (proxy.includes('allorigins')) {
        const data = await response.json();
        html = data.contents;
      } else {
        html = await response.text();
      }
      
      return parseHtmlContent(html, url);
      
    } catch (error) {
      console.warn(`Failed to fetch with proxy ${proxy}:`, error);
      lastError = error as Error;
      continue;
    }
  }
  
  // If all proxies failed, try direct fetch (might fail due to CORS)
  try {
    const response = await fetch(url);
    if (response.ok) {
      const html = await response.text();
      return parseHtmlContent(html, url);
    }
  } catch (error) {
    console.warn('Direct fetch also failed:', error);
  }
  
  throw new Error(`Failed to scrape content from ${url}: ${lastError?.message || 'All methods failed'}`);
}

function parseHtmlContent(html: string, url: string): ScrapedContent {
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
    '#content',
    'article'
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
  
  // Phone extraction with better patterns
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
  const phoneMatch = content.match(phoneRegex);
  if (phoneMatch) {
    contactInfo.phone = phoneMatch[0].trim();
  }

  // Also check for tel: links
  const phoneElements = doc.querySelectorAll('a[href^="tel:"], .phone, .telephone, .contact-phone');
  if (phoneElements.length > 0 && !contactInfo.phone) {
    const phoneText = Array.from(phoneElements)[0]?.getAttribute('href')?.replace('tel:', '') ||
                     Array.from(phoneElements)[0]?.textContent;
    if (phoneText) contactInfo.phone = phoneText.trim();
  }

  // Email extraction with better patterns
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatch = content.match(emailRegex);
  if (emailMatch) {
    const filteredEmails = emailMatch.filter(email => 
      !email.includes('example.com') && 
      !email.includes('test.com') &&
      !email.includes('placeholder')
    );
    if (filteredEmails.length > 0) {
      contactInfo.email = filteredEmails[0];
    }
  }

  // Also check for mailto: links
  const emailElements = doc.querySelectorAll('a[href^="mailto:"], .email, .contact-email');
  if (emailElements.length > 0 && !contactInfo.email) {
    const emailText = Array.from(emailElements)[0]?.getAttribute('href')?.replace('mailto:', '') ||
                     Array.from(emailElements)[0]?.textContent;
    if (emailText) contactInfo.email = emailText.trim();
  }

  // Enhanced address extraction
  const addressElements = doc.querySelectorAll('footer .address, .footer .address, .address, .contact-address, .location, [itemtype*="PostalAddress"], .postal-address');
  if (addressElements.length > 0) {
    const addressText = Array.from(addressElements)[0]?.textContent?.trim();
    if (addressText && addressText.length > 10) {
      contactInfo.address = addressText;
    }
  }

  // If no address found in specific elements, try to extract from footer content
  if (!contactInfo.address) {
    const footer = doc.querySelector('footer, .footer, #footer');
    if (footer) {
      const footerText = footer.textContent || '';
      // Look for address patterns in footer
      const addressPatterns = [
        /(\d+[\w\s,.-]*(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|way|court|ct\.?|place|pl\.?)[\w\s,.-]*(?:\d{5}(?:-\d{4})?|[A-Z]{2}\s*\d{5}(?:-\d{4})?))/gi,
        /([A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/g
      ];
      
      for (const pattern of addressPatterns) {
        const match = footerText.match(pattern);
        if (match && match[0]) {
          contactInfo.address = match[0].trim();
          break;
        }
      }
    }
  }

  // Extract images
  const images: Array<{src: string, alt?: string, title?: string}> = [];
  const baseUrlObj = new URL(url);
  
  doc.querySelectorAll('img').forEach(img => {
    let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
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
    '.operating-hours', '.store-hours', '.office-hours', '.working-hours'
  ];
  
  for (const selector of hoursSelectors) {
    const element = doc.querySelector(selector);
    if (element?.textContent && element.textContent.length > 5) {
      businessHours = element.textContent.trim();
      break;
    }
  }

  // Extract FAQs
  const faqs: Array<{question: string, answer: string}> = [];
  const faqSelectors = ['.faq', '.frequently-asked-questions', '.questions', '.qa-section'];
  
  faqSelectors.forEach(selector => {
    doc.querySelectorAll(selector).forEach(faqSection => {
      // Check for details/summary pattern
      faqSection.querySelectorAll('details').forEach(item => {
        const question = item.querySelector('summary')?.textContent?.trim();
        const answerElement = Array.from(item.children).find(child => child.tagName !== 'SUMMARY');
        const answer = answerElement?.textContent?.trim();
        if (question && answer) {
          faqs.push({ question, answer });
        }
      });

      // Check for other FAQ patterns
      faqSection.querySelectorAll('.faq-item, .question, .qa-item').forEach(item => {
        const question = item.querySelector('.question, .faq-question, h3, h4')?.textContent?.trim();
        const answer = item.querySelector('.answer, .faq-answer, p')?.textContent?.trim();
        if (question && answer && question !== answer) {
          faqs.push({ question, answer });
        }
      });
    });
  });

  // Extract reviews/ratings
  const reviews: {rating?: number, count?: number} = {};
  
  // Look for rating indicators
  const ratingSelectors = ['.rating', '.stars', '.review-rating', '.star-rating'];
  ratingSelectors.forEach(selector => {
    if (!reviews.rating) {
      const element = doc.querySelector(selector);
      if (element) {
        const ratingText = element.textContent || '';
        const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*(?:\/\s*5|out\s*of\s*5|stars?)?/i);
        if (ratingMatch) {
          const rating = parseFloat(ratingMatch[1]);
          if (rating >= 1 && rating <= 5) {
            reviews.rating = rating;
          }
        }
      }
    }
  });

  // Look for review count
  const reviewCountSelectors = ['.review-count', '.total-reviews', '.reviews-count'];
  reviewCountSelectors.forEach(selector => {
    if (!reviews.count) {
      const element = doc.querySelector(selector);
      if (element) {
        const countText = element.textContent || '';
        const countMatch = countText.match(/(\d+)\s*(?:reviews?|ratings?)/i);
        if (countMatch) {
          reviews.count = parseInt(countMatch[1]);
        }
      }
    }
  });

  // Extract price range indicators
  let priceRange = '';
  const priceSelectors = ['.price-range', '.pricing', '.cost', '.price'];
  
  for (const selector of priceSelectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const priceText = element.textContent?.trim();
      if (priceText) {
        const dollarMatch = priceText.match(/\$+/);
        if (dollarMatch) {
          priceRange = dollarMatch[0];
          break;
        }
        // Look for price descriptors
        if (priceText.match(/\b(budget|cheap|inexpensive|affordable)\b/i)) {
          priceRange = '$';
          break;
        } else if (priceText.match(/\b(moderate|mid.?range|reasonable)\b/i)) {
          priceRange = '$$';
          break;
        } else if (priceText.match(/\b(expensive|high.?end|premium)\b/i)) {
          priceRange = '$$$';
          break;
        } else if (priceText.match(/\b(luxury|very.?expensive|exclusive)\b/i)) {
          priceRange = '$$$$';
          break;
        }
      }
    }
  }

  // Detect business type from content
  let businessType = 'LocalBusiness';
  const businessTypeKeywords = {
    'Restaurant': ['restaurant', 'cafe', 'diner', 'bistro', 'food', 'menu', 'dining'],
    'MedicalBusiness': ['medical', 'doctor', 'clinic', 'hospital', 'health', 'physician'],
    'LegalService': ['law', 'lawyer', 'attorney', 'legal', 'counsel'],
    'HVACBusiness': ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace'],
    'HomeAndConstructionBusiness': ['construction', 'contractor', 'builder', 'renovation', 'remodeling'],
    'ProfessionalService': ['consulting', 'consultant', 'professional service'],
    'AutomotiveBusiness': ['auto', 'car', 'automotive', 'mechanic', 'repair']
  };

  const lowerContent = content.toLowerCase();
  for (const [type, keywords] of Object.entries(businessTypeKeywords)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      businessType = type;
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
    businessHours: businessHours || undefined,
    faqs: faqs.slice(0, 10),
    reviews: Object.keys(reviews).length > 0 ? reviews : undefined,
    priceRange: priceRange || undefined,
    businessType
  };
}