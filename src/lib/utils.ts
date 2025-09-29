import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Enhanced postal code patterns by region
const postalCodePatterns = {
  US: /\b\d{5}(-\d{4})?\b/g,
  CA: /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/gi,
  UK: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi,
  AU: /\b\d{4}\b/g,
  DE: /\b\d{5}\b/g,
  FR: /\b\d{5}\b/g
};

// Enhanced city-based price range mapping
const cityPriceMapping: { [key: string]: string } = {
  // Ultra high-cost cities ($$$$)
  'new york': '$$$$',
  'manhattan': '$$$$',
  'san francisco': '$$$$',
  'palo alto': '$$$$',
  'cupertino': '$$$$',
  'mountain view': '$$$$',
  'beverly hills': '$$$$',
  'monaco': '$$$$',
  'hong kong': '$$$$',
  'zurich': '$$$$',
  'geneva': '$$$$',
  
  // High-cost cities ($$$)
  'los angeles': '$$$',
  'seattle': '$$$',
  'boston': '$$$',
  'washington': '$$$',
  'washington dc': '$$$',
  'chicago': '$$$',
  'miami': '$$$',
  'san diego': '$$$',
  'san jose': '$$$',
  'oakland': '$$$',
  'denver': '$$$',
  'austin': '$$$',
  'portland': '$$$',
  'vancouver': '$$$',
  'toronto': '$$$',
  'london': '$$$',
  'paris': '$$$',
  'tokyo': '$$$',
  'sydney': '$$$',
  'melbourne': '$$$',
  
  // Mid-cost cities ($$)
  'atlanta': '$$',
  'dallas': '$$',
  'houston': '$$',
  'phoenix': '$$',
  'nashville': '$$',
  'charlotte': '$$',
  'raleigh': '$$',
  'tampa': '$$',
  'orlando': '$$',
  'las vegas': '$$',
  'salt lake city': '$$',
  'minneapolis': '$$',
  'milwaukee': '$$',
  'indianapolis': '$$',
  'columbus': '$$',
  'cincinnati': '$$',
  'pittsburgh': '$$',
  'baltimore': '$$',
  'richmond': '$$',
  'jacksonville': '$$',
  'san antonio': '$$',
  'fort worth': '$$',
  'albuquerque': '$$',
  'tucson': '$$',
  'sacramento': '$$',
  'fresno': '$$',
  
  // Lower-cost cities ($)
  'detroit': '$',
  'cleveland': '$',
  'buffalo': '$',
  'kansas city': '$',
  'oklahoma city': '$',
  'tulsa': '$',
  'memphis': '$',
  'birmingham': '$',
  'little rock': '$',
  'jackson': '$',
  'shreveport': '$',
  'mobile': '$',
  'montgomery': '$',
  'huntsville': '$',
  'chattanooga': '$',
  'knoxville': '$',
  'louisville': '$',
  'lexington': '$',
  'toledo': '$',
  'akron': '$',
  'youngstown': '$',
  'dayton': '$',
  'fort wayne': '$',
  'evansville': '$',
  'peoria': '$',
  'rockford': '$',
  'green bay': '$',
  'des moines': '$',
  'cedar rapids': '$',
  'sioux city': '$',
  'fargo': '$',
  'bismarck': '$',
  'rapid city': '$',
  'billings': '$',
  'great falls': '$',
  'boise': '$',
  'spokane': '$',
  'yakima': '$'
};

// Business type to price range mapping
const businessTypePriceMapping: { [key: string]: string } = {
  'LegalService': '$$$',
  'MedicalBusiness': '$$$', 
  'DentalBusiness': '$$',
  'Restaurant': '$$',
  'HVACBusiness': '$$',
  'ProfessionalService': '$$',
  'HomeAndConstructionBusiness': '$$',
  'AutomotiveBusiness': '$',
  'LocalBusiness': '$$'
};

export function cleanObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj
      .map(v => (v && typeof v === 'object') ? cleanObject(v) : v)
      .filter(v => !(v == null || v === ''));
  } else if (obj !== null && typeof obj === 'object') {
    // Special handling for specific schema types
    if (obj['@type']) {
      // FAQ Page should preserve mainEntity even if empty initially
      if (obj['@type'] === 'FAQPage' && obj.mainEntity !== undefined) {
        // Keep mainEntity even if it's an empty array
      }
      
      // Question schema should always have acceptedAnswer
      if (obj['@type'] === 'Question' && !obj.acceptedAnswer && obj.name) {
        obj.acceptedAnswer = {
          "@type": "Answer",
          "text": "Contact us for more information."
        };
      }
      
      // OpeningHoursSpecification validation
      if (obj['@type'] === 'OpeningHoursSpecification') {
        if (!obj.dayOfWeek || !obj.opens || !obj.closes) {
          return null; // Invalid opening hours specification
        }
        // Validate time format
        if (!isValidTimeFormat(obj.opens) || !isValidTimeFormat(obj.closes)) {
          return null;
        }
      }
      
      // GeoCoordinates validation
      if (obj['@type'] === 'GeoCoordinates') {
        if (!obj.latitude || !obj.longitude) {
          return null; // Invalid coordinates
        }
        // Validate coordinate ranges
        const lat = parseFloat(obj.latitude);
        const lng = parseFloat(obj.longitude);
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return null; // Invalid coordinate values
        }
      }
      
      // AggregateRating validation
      if (obj['@type'] === 'AggregateRating') {
        if (!obj.ratingValue || !obj.reviewCount) {
          return null; // Invalid rating
        }
        // Ensure rating is within bounds
        const rating = parseFloat(obj.ratingValue);
        const count = parseInt(obj.reviewCount);
        if (rating < 1 || rating > 5 || count < 1) {
          return null;
        }
        // Ensure proper format
        obj.ratingValue = rating.toString();
        obj.reviewCount = count.toString();
        obj.bestRating = "5";
        obj.worstRating = "1";
      }
      
      // Enhanced PostalAddress validation with intelligent auto-fill
      if (obj['@type'] === 'PostalAddress') {
        // Enhanced postal code detection and validation
        if (!obj.postalCode && (obj.streetAddress || obj.addressLocality)) {
          // Try to extract postal code from street address or city
          const fullAddressText = `${obj.streetAddress || ''} ${obj.addressLocality || ''} ${obj.addressRegion || ''}`.trim();
          obj.postalCode = extractPostalCode(fullAddressText, obj.addressCountry || 'US');
        }
        
        // Validate extracted postal code
        if (obj.postalCode && !isValidPostalCode(obj.postalCode, obj.addressCountry || 'US')) {
          console.warn('Invalid postal code detected, removing:', obj.postalCode);
          delete obj.postalCode;
        }
        
        // At least one address component should be present
        const hasAnyAddress = obj.streetAddress || obj.addressLocality || obj.addressRegion || obj.postalCode;
        
        if (!hasAnyAddress) {
          return null; // No address information at all
        }
        
        // Enhanced intelligent defaults based on available information
        if (!obj.streetAddress && (obj.addressLocality || obj.addressRegion)) {
          obj.streetAddress = "Address available upon request";
        }
        if (!obj.addressLocality && obj.addressRegion) {
          obj.addressLocality = "Local Area";
        }
        if (!obj.addressRegion && obj.addressLocality) {
          // Try to infer state from city using common city-state knowledge
          obj.addressRegion = inferStateFromCity(obj.addressLocality) || "State";
        }
        
        // Clean and validate address components
        if (obj.streetAddress) obj.streetAddress = obj.streetAddress.trim();
        if (obj.addressLocality) obj.addressLocality = obj.addressLocality.trim();
        if (obj.addressRegion) obj.addressRegion = obj.addressRegion.trim();
        obj.addressCountry = obj.addressCountry || 'US';
        
        if (obj.postalCode) {
          obj.postalCode = obj.postalCode.trim();
        }
      }

      // ImageObject validation
      if (obj['@type'] === 'ImageObject') {
        if (!obj.url) {
          return null; // Invalid image without URL
        }
        // Ensure absolute URL
        obj.url = ensureAbsoluteUrl(obj.url);
      }

      // Enhanced Business validation with intelligent price range detection
      const businessTypes = [
        'LocalBusiness', 'Restaurant', 'ProfessionalService', 'LegalService', 
        'MedicalBusiness', 'HomeAndConstructionBusiness', 'AutomotiveBusiness', 'Organization'
      ];
      if (businessTypes.includes(obj['@type'])) {
        if (!obj.name) {
          return null; // Business must have a name
        }
        
        // Validate and format telephone
        if (obj.telephone) {
          obj.telephone = formatPhoneNumber(obj.telephone);
        }
        
        // Validate email
        if (obj.email && !isValidEmail(obj.email)) {
          delete obj.email; // Remove invalid email
        }
        
        // Enhanced intelligent price range detection
        if (!obj.priceRange && obj.address?.addressLocality) {
          obj.priceRange = detectPriceRange(obj.address.addressLocality, obj['@type'], obj.name, obj.description);
        }
        
        // Validate URLs
        if (obj.url) {
          obj.url = ensureAbsoluteUrl(obj.url);
        }
        
        // Validate social media URLs
        if (obj.sameAs && Array.isArray(obj.sameAs)) {
          obj.sameAs = obj.sameAs
            .map((url: string) => ensureAbsoluteUrl(url))
            .filter((url: string) => isValidUrl(url));
        }
      }

      // WebPage validation
      if (obj['@type'] === 'WebPage') {
        if (obj.url) {
          obj.url = ensureAbsoluteUrl(obj.url);
        }
      }
    }

    return Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      const cleanedValue = (value && typeof value === 'object') ? cleanObject(value) : value;

      // Keep value if it's not null/undefined/empty string
      if (cleanedValue != null && cleanedValue !== '') {
        // If it's an array, keep it only if it's not empty
        if (Array.isArray(cleanedValue)) {
          if (cleanedValue.length > 0) {
            acc[key] = cleanedValue;
          }
        } 
        // If it's an object, keep it only if it has keys or is a special schema type
        else if (typeof cleanedValue === 'object' && !Array.isArray(cleanedValue)) {
          const hasKeys = Object.keys(cleanedValue).length > 0;
          const isSchemaType = cleanedValue['@type'];
          
          if (hasKeys || isSchemaType) {
            acc[key] = cleanedValue;
          }
        } 
        // Keep non-object, non-array values that are not empty
        else if (typeof cleanedValue !== 'object') {
          acc[key] = cleanedValue;
        }
      }
      return acc;
    }, {} as any);
  }
  return obj;
}

/**
 * Enhanced postal code extraction with multi-region support
 */
function extractPostalCode(text: string, country: string = 'US'): string | undefined {
  if (!text) return undefined;
  
  const pattern = postalCodePatterns[country as keyof typeof postalCodePatterns] || postalCodePatterns.US;
  const matches = text.match(pattern);
  
  if (matches && matches.length > 0) {
    return matches[0].trim();
  }
  
  return undefined;
}

/**
 * Validates postal code format by country
 */
function isValidPostalCode(postalCode: string, country: string = 'US'): boolean {
  if (!postalCode) return false;
  
  const pattern = postalCodePatterns[country as keyof typeof postalCodePatterns] || postalCodePatterns.US;
  // Reset the pattern to test from beginning
  pattern.lastIndex = 0;
  return pattern.test(postalCode);
}

/**
 * Intelligent price range detection based on multiple factors
 */
function detectPriceRange(city: string, businessType: string, businessName?: string, description?: string): string {
  if (!city) return '$$'; // Default to moderate
  
  const cityLower = city.toLowerCase().trim();
  
  // First check city-based pricing
  const cityPriceRange = cityPriceMapping[cityLower];
  
  // Check business type pricing
  const businessTypePriceRange = businessTypePriceMapping[businessType];
  
  // Analyze business name and description for price indicators
  const textualContent = `${businessName || ''} ${description || ''}`.toLowerCase();
  let textualPriceIndicator = '';
  
  if (textualContent.includes('luxury') || textualContent.includes('premium') || textualContent.includes('exclusive') || textualContent.includes('high-end')) {
    textualPriceIndicator = '$$$$';
  } else if (textualContent.includes('upscale') || textualContent.includes('boutique') || textualContent.includes('sophisticated')) {
    textualPriceIndicator = '$$$';
  } else if (textualContent.includes('affordable') || textualContent.includes('budget') || textualContent.includes('discount') || textualContent.includes('cheap')) {
    textualPriceIndicator = '$';
  } else if (textualContent.includes('value') || textualContent.includes('reasonable') || textualContent.includes('moderate')) {
    textualPriceIndicator = '$$';
  }
  
  // Priority: textual indicators > city-based > business type > default
  if (textualPriceIndicator) return textualPriceIndicator;
  if (cityPriceRange) return cityPriceRange;
  if (businessTypePriceRange) return businessTypePriceRange;
  
  return '$$'; // Default to moderate pricing
}

/**
 * Infer state from city name using common knowledge
 */
function inferStateFromCity(city: string): string | undefined {
  if (!city) return undefined;
  
  const cityLower = city.toLowerCase().trim();
  
  // Common city-state mappings
  const cityStateMapping: { [key: string]: string } = {
    // Major cities
    'new york': 'NY',
    'los angeles': 'CA',
    'chicago': 'IL',
    'houston': 'TX',
    'phoenix': 'AZ',
    'philadelphia': 'PA',
    'san antonio': 'TX',
    'san diego': 'CA',
    'dallas': 'TX',
    'san jose': 'CA',
    'austin': 'TX',
    'jacksonville': 'FL',
    'fort worth': 'TX',
    'columbus': 'OH',
    'charlotte': 'NC',
    'francisco': 'CA',
    'indianapolis': 'IN',
    'seattle': 'WA',
    'denver': 'CO',
    'washington': 'DC',
    'boston': 'MA',
    'el paso': 'TX',
    'detroit': 'MI',
    'nashville': 'TN',
    'memphis': 'TN',
    'portland': 'OR',
    'oklahoma city': 'OK',
    'las vegas': 'NV',
    'baltimore': 'MD',
    'louisville': 'KY',
    'milwaukee': 'WI',
    'albuquerque': 'NM',
    'tucson': 'AZ',
    'fresno': 'CA',
    'mesa': 'AZ',
    'sacramento': 'CA',
    'atlanta': 'GA',
    'kansas city': 'MO',
    'colorado springs': 'CO',
    'omaha': 'NE',
    'raleigh': 'NC',
    'miami': 'FL',
    'oakland': 'CA',
    'minneapolis': 'MN',
    'tulsa': 'OK',
    'cleveland': 'OH',
    'wichita': 'KS',
    'arlington': 'TX',
    'new orleans': 'LA',
    'bakersfield': 'CA',
    'tampa': 'FL',
    'honolulu': 'HI',
    'aurora': 'CO',
    'anaheim': 'CA',
    'santa ana': 'CA',
    'st. louis': 'MO',
    'riverside': 'CA',
    'corpus christi': 'TX',
    'lexington': 'KY',
    'pittsburgh': 'PA',
    'anchorage': 'AK',
    'stockton': 'CA',
    'cincinnati': 'OH',
    'saint paul': 'MN',
    'toledo': 'OH',
    'greensboro': 'NC',
    'newark': 'NJ',
    'plano': 'TX',
    'henderson': 'NV',
    'lincoln': 'NE',
    'buffalo': 'NY',
    'jersey city': 'NJ',
    'chula vista': 'CA',
    'fort wayne': 'IN',
    'orlando': 'FL',
    'st. petersburg': 'FL',
    'chandler': 'AZ',
    'laredo': 'TX',
    'norfolk': 'VA',
    'durham': 'NC',
    'madison': 'WI',
    'lubbock': 'TX',
    'irvine': 'CA',
    'winston-salem': 'NC',
    'glendale': 'AZ',
    'garland': 'TX',
    'hialeah': 'FL',
    'reno': 'NV',
    'chesapeake': 'VA',
    'gilbert': 'AZ',
    'baton rouge': 'LA',
    'irving': 'TX',
    'scottsdale': 'AZ',
    'north las vegas': 'NV',
    'fremont': 'CA',
    'boise city': 'ID',
    'richmond': 'VA',
    'san bernardino': 'CA',
    'birmingham': 'AL',
    'spokane': 'WA',
    'rochester': 'NY'
  };
  
  return cityStateMapping[cityLower];
}

/**
 * Validates time format (HH:MM or H:MM)
 */
function isValidTimeFormat(time: string): boolean {
  if (!time) return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time.trim());
}

/**
 * Ensures URL is absolute
 */
function ensureAbsoluteUrl(url: string): string {
  if (!url) return url;
  
  // If it's already absolute, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it starts with //, add https:
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  
  // If it's a relative URL, we can't make it absolute without context
  // Return as is and let validation handle it
  return url;
}

/**
 * Validates if string is a valid URL
 */
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Enhanced phone number formatting with international support
 */
function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // US/Canada numbers (10 or 11 digits)
  if (digits.length === 10) {
    return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // UK numbers (10-11 digits)
  if (digits.length >= 10 && digits.length <= 11 && (digits.startsWith('44') || digits.startsWith('0'))) {
    const cleanDigits = digits.startsWith('44') ? digits : '44' + digits.slice(1);
    return `+${cleanDigits.slice(0, 2)}-${cleanDigits.slice(2, 5)}-${cleanDigits.slice(5, 8)}-${cleanDigits.slice(8)}`;
  }
  
  // For international numbers, keep original format if it looks valid
  if (digits.length >= 7) {
    return phone.trim();
  }
  
  return phone;
}

/**
 * Enhanced price range validation and formatting
 */
function validatePriceRange(priceRange: string): string {
  if (!priceRange) return priceRange;
  
  const cleaned = priceRange.trim();
  
  // Check if it's already in the correct format
  if (/^\$+$/.test(cleaned)) {
    return cleaned;
  }
  
  // Try to convert text to dollar signs with enhanced detection
  const lowerPrice = cleaned.toLowerCase();
  if (lowerPrice.includes('luxury') || lowerPrice.includes('exclusive') || lowerPrice.includes('premium') || lowerPrice.includes('very expensive')) {
    return '$$$$';
  } else if (lowerPrice.includes('expensive') || lowerPrice.includes('upscale') || lowerPrice.includes('high-end')) {
    return '$$$';
  } else if (lowerPrice.includes('moderate') || lowerPrice.includes('mid-range') || lowerPrice.includes('reasonable')) {
    return '$$';
  } else if (lowerPrice.includes('inexpensive') || lowerPrice.includes('cheap') || lowerPrice.includes('budget') || lowerPrice.includes('affordable')) {
    return '$';
  }
  
  // If it contains dollar signs, extract them
  const dollarMatch = cleaned.match(/\$+/);
  if (dollarMatch) {
    return dollarMatch[0];
  }
  
  // Default to moderate pricing if unclear
  return '$$';
}

/**
 * Enhanced schema validation with intelligent address handling
 */
export function validateSchema(schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!schema || typeof schema !== 'object') {
    errors.push('Schema must be an object');
    return { isValid: false, errors };
  }
  
  if (!schema['@context']) {
    errors.push('Missing @context property');
  }
  
  if (!schema['@type']) {
    errors.push('Missing @type property');
  }
  
  // Validate WebPage schema
  if (schema['@type'] === 'WebPage') {
    if (!schema.url) {
      errors.push('WebPage schema missing url property');
    } else if (!isValidUrl(schema.url)) {
      errors.push('WebPage schema has invalid URL');
    }
    
    if (!schema.name && !schema.mainEntity?.name) {
      errors.push('WebPage schema missing name property');
    }
  }
  
  // Enhanced Business schema validation with intelligent address handling
  const businessTypes = ['LocalBusiness', 'Restaurant', 'ProfessionalService', 'LegalService', 'MedicalBusiness', 'HVACBusiness', 'HomeAndConstructionBusiness', 'AutomotiveBusiness'];
  if (businessTypes.includes(schema['@type']) || (schema.mainEntity && businessTypes.includes(schema.mainEntity['@type']))) {
    const business = schema['@type'] === 'WebPage' ? schema.mainEntity : schema;
    
    if (!business) {
      errors.push('Business entity is missing');
      return { isValid: false, errors };
    }
    
    if (!business.name) {
      errors.push('Business schema missing name property');
    }
    
    // Enhanced address validation with intelligent handling
    if (!business.address) {
      console.warn('Business schema missing address property');
    } else {
      // Validate postal code if present
      if (business.address.postalCode && !isValidPostalCode(business.address.postalCode, business.address.addressCountry)) {
        console.warn('Business address has invalid postal code format:', business.address.postalCode);
      }
      
      // Check if at least one meaningful address component exists
      const hasStreet = business.address.streetAddress && business.address.streetAddress !== "Address available upon request";
      const hasCity = business.address.addressLocality && business.address.addressLocality !== "Local Area";
      const hasState = business.address.addressRegion && business.address.addressRegion !== "State";
      const hasZip = business.address.postalCode;
      
      const meaningfulComponents = [hasStreet, hasCity, hasState, hasZip].filter(Boolean).length;
      
      if (meaningfulComponents === 0) {
        console.warn('Business address has no meaningful location information');
      } else if (meaningfulComponents < 2) {
        console.warn('Business address is incomplete but has some location information');
      }
    }
    
    // Validate rating if present
    if (business.aggregateRating) {
      const rating = parseFloat(business.aggregateRating.ratingValue);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        errors.push('Invalid rating value (must be between 1 and 5)');
      }
      
      const reviewCount = parseInt(business.aggregateRating.reviewCount);
      if (isNaN(reviewCount) || reviewCount < 1) {
        errors.push('Invalid review count (must be positive number)');
      }
    }
    
    // Validate coordinates if present
    if (business.geo) {
      const lat = parseFloat(business.geo.latitude);
      const lng = parseFloat(business.geo.longitude);
      
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push('Invalid latitude (must be between -90 and 90)');
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push('Invalid longitude (must be between -180 and 180)');
      }
    }
    
    // Validate email if present
    if (business.email && !isValidEmail(business.email)) {
      errors.push('Invalid email format');
    }
    
    // Validate URLs if present
    if (business.url && !isValidUrl(business.url)) {
      errors.push('Invalid business URL format');
    }
    
    if (business.sameAs && Array.isArray(business.sameAs)) {
      business.sameAs.forEach((url: string, index: number) => {
        if (!isValidUrl(url)) {
          errors.push(`Invalid social media URL at index ${index}`);
        }
      });
    }
    
    // Validate price range format
    if (business.priceRange && !business.priceRange.match(/^\$+$/)) {
      console.warn('Price range should use $ format, got:', business.priceRange);
    }
  }
  
  // Validate Article schema
  if (schema['@type'] === 'Article') {
    if (!schema.headline) {
      errors.push('Article schema missing headline');
    }
    if (!schema.author || !schema.author.name) {
      errors.push('Article schema missing author name');
    }
    if (!schema.publisher || !schema.publisher.name) {
      errors.push('Article schema missing publisher name');
    }
    if (!schema.datePublished) {
      errors.push('Article schema missing datePublished');
    }
  }
  
  // Validate HowTo schema
  if (schema['@type'] === 'HowTo') {
    if (!schema.name) {
      errors.push('HowTo schema missing name');
    }
    if (!schema.step || !Array.isArray(schema.step) || schema.step.length === 0) {
      errors.push('HowTo schema missing steps');
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Enhanced form data validation with AI-generated content support and comprehensive error handling
 */
export function validateFormData(formData: any, isAiGenerated: boolean = false): { isValid: boolean; errors: string[]; cleanedData: any } {
  const errors: string[] = [];
  const cleanedData = { ...formData };
  
  // Validate required fields based on content type
  if (formData.contentType === 'Article') {
    if (!formData.headline?.trim()) {
      errors.push('Article headline is required');
    }
    if (!formData.authorName?.trim()) {
      errors.push('Author name is required');
    }
    if (!formData.publisherName?.trim()) {
      errors.push('Publisher name is required');
    }
  } else if (formData.contentType === 'HowTo') {
    if (!formData.howToName?.trim()) {
      errors.push('How-to title is required');
    }
  } else {
    // Business types - more lenient for AI-generated content
    if (!formData.name?.trim()) {
      errors.push('Business name is required');
    }
    if (!formData.description?.trim()) {
      errors.push('Business description is required');
    }
    
    // Enhanced address validation with intelligent postal code handling
    if (!isAiGenerated) {
      // Strict validation for manual entry
      if (!formData.streetAddress?.trim()) {
        errors.push('Street address is required');
      }
      if (!formData.addressLocality?.trim()) {
        errors.push('City is required');
      }
      if (!formData.addressRegion?.trim()) {
        errors.push('State/Region is required');
      }
    } else {
      // Lenient validation for AI content - just warn if completely missing
      const hasAnyAddress = formData.streetAddress?.trim() || 
                           formData.addressLocality?.trim() || 
                           formData.addressRegion?.trim() ||
                           formData.postalCode?.trim();
      
      if (!hasAnyAddress) {
        console.warn('No address information found - will use placeholders');
      }
    }
    
    // Enhanced postal code validation and auto-detection
    if (formData.postalCode?.trim()) {
      if (!isValidPostalCode(formData.postalCode, formData.addressCountry || 'US')) {
        if (!isAiGenerated) {
          errors.push('Invalid postal code format');
        } else {
          console.warn('Invalid postal code format - removing from schema');
          delete cleanedData.postalCode;
        }
      }
    } else if (isAiGenerated && formData.addressLocality?.trim()) {
      // Try to auto-detect postal code from city context
      const inferredZip = inferPostalCodeFromCity(formData.addressLocality);
      if (inferredZip) {
        cleanedData.postalCode = inferredZip;
        console.info('Inferred postal code from city:', inferredZip);
      }
    }
    
    // Auto-detect price range if not provided
    if (!formData.priceRange?.trim() && formData.addressLocality?.trim()) {
      const detectedPriceRange = detectPriceRange(
        formData.addressLocality,
        formData.contentType || 'LocalBusiness',
        formData.name,
        formData.description
      );
      cleanedData.priceRange = detectedPriceRange;
      console.info('Auto-detected price range for', formData.addressLocality, ':', detectedPriceRange);
    }
  }
  
  // Clean and validate phone number
  if (formData.telephone) {
    cleanedData.telephone = formatPhoneNumber(formData.telephone);
  }
  
  // Validate email
  if (formData.email && !isValidEmail(formData.email)) {
    if (!isAiGenerated) {
      errors.push('Invalid email format');
    } else {
      console.warn('Invalid email format - removing from schema');
      delete cleanedData.email;
    }
  }
  
  // Validate URLs
  if (formData.websiteUrl && !isValidUrl(formData.websiteUrl)) {
    if (!isAiGenerated) {
      errors.push('Invalid website URL');
    } else {
      console.warn('Invalid website URL - removing from schema');
      delete cleanedData.websiteUrl;
    }
  }
  
  if (formData.publisherLogoUrl && !isValidUrl(formData.publisherLogoUrl)) {
    if (!isAiGenerated) {
      errors.push('Invalid publisher logo URL');
    } else {
      console.warn('Invalid publisher logo URL - removing from schema');
      delete cleanedData.publisherLogoUrl;
    }
  }
  
  // Validate coordinates
  if (formData.latitude) {
    const lat = parseFloat(formData.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      if (!isAiGenerated) {
        errors.push('Invalid latitude (must be between -90 and 90)');
      } else {
        console.warn('Invalid latitude - removing from schema');
        delete cleanedData.latitude;
      }
    }
  }
  
  if (formData.longitude) {
    const lng = parseFloat(formData.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      if (!isAiGenerated) {
        errors.push('Invalid longitude (must be between -180 and 180)');
      } else {
        console.warn('Invalid longitude - removing from schema');
        delete cleanedData.longitude;
      }
    }
  }
  
  // Validate rating
  if (formData.ratingValue) {
    const rating = parseFloat(formData.ratingValue);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      if (!isAiGenerated) {
        errors.push('Rating must be between 1 and 5');
      } else {
        console.warn('Invalid rating - removing from schema');
        delete cleanedData.ratingValue;
      }
    }
  }
  
  if (formData.reviewCount) {
    const count = parseInt(formData.reviewCount);
    if (isNaN(count) || count < 1) {
      if (!isAiGenerated) {
        errors.push('Review count must be a positive number');
      } else {
        console.warn('Invalid review count - removing from schema');
        delete cleanedData.reviewCount;
      }
    }
  }
  
  // Validate and enhance price range
  if (formData.priceRange) {
    cleanedData.priceRange = validatePriceRange(formData.priceRange);
  }
  
  return { isValid: errors.length === 0, errors, cleanedData };
}

/**
 * Attempt to infer postal code from city name (basic implementation)
 * This would ideally connect to a postal code database
 */
function inferPostalCodeFromCity(city: string): string | undefined {
  // This is a simplified version - in production, you'd want a comprehensive database
  const commonCityZipMapping: { [key: string]: string } = {
    'new york': '10001',
    'los angeles': '90001',
    'chicago': '60601',
    'houston': '77001',
    'phoenix': '85001',
    'philadelphia': '19101',
    'san antonio': '78201',
    'san diego': '92101',
    'dallas': '75201',
    'san jose': '95101',
    'austin': '78701',
    'seattle': '98101',
    'denver': '80201',
    'washington': '20001',
    'boston': '02101',
    'las vegas': '89101',
    'atlanta': '30301',
    'miami': '33101',
    'charlotte': '28201',
    'portland': '97201',
    'san francisco': '94101'
  };
  
  const cityLower = city.toLowerCase().trim();
  return commonCityZipMapping[cityLower];
}

/**
 * Formats business hours from various input formats to OpeningHoursSpecification
 */
export function formatBusinessHours(hoursInput: string): any[] | undefined {
  if (!hoursInput) return undefined;
  
  const lines = hoursInput.split('\n').filter(line => line.trim());
  const dayMapping: { [key: string]: string } = {
    'monday': 'Monday',
    'tuesday': 'Tuesday', 
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday',
    'mon': 'Monday',
    'tue': 'Tuesday',
    'wed': 'Wednesday', 
    'thu': 'Thursday',
    'fri': 'Friday',
    'sat': 'Saturday',
    'sun': 'Sunday'
  };
  
  return lines.map(line => {
    // Try to parse "Day: StartTime-EndTime" format
    const match = line.match(/^([^:]+):\s*([^-]+)-(.+)$/i);
    if (match) {
      const [, dayPart, startTime, endTime] = match;
      const normalizedDay = dayMapping[dayPart.trim().toLowerCase()] || dayPart.trim();
      
      const opens = startTime.trim();
      const closes = endTime.trim();
      
      // Validate time format
      if (isValidTimeFormat(opens) && isValidTimeFormat(closes)) {
        return {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": normalizedDay,
          "opens": opens,
          "closes": closes
        };
      }
    }
    
    // Try to parse "Monday-Friday: StartTime-EndTime" format
    const rangeMatch = line.match(/^([^-]+)-([^:]+):\s*([^-]+)-(.+)$/i);
    if (rangeMatch) {
      const [, startDay, endDay, startTime, endTime] = rangeMatch;
      const days = [];
      
      // This is simplified - you might want to expand this for all day ranges
      if (startDay.trim().toLowerCase().includes('mon') && endDay.trim().toLowerCase().includes('fri')) {
        days.push('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday');
      }
      
      const opens = startTime.trim();
      const closes = endTime.trim();
      
      if (isValidTimeFormat(opens) && isValidTimeFormat(closes)) {
        return days.map(day => ({
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": day,
          "opens": opens,
          "closes": closes
        }));
      }
    }
    
    return null;
  }).flat().filter(Boolean);
}

/**
 * Extracts and cleans FAQ data from text input
 */
export function processFAQData(questions: string, answers: string): any[] {
  if (!questions) return [];
  
  const questionList = questions.split('\n').filter(q => q.trim());
  const answerList = answers ? answers.split('\n').filter(a => a.trim()) : [];
  
  return questionList.map((question, index) => ({
    "@type": "Question",
    "name": question.trim().replace(/^\d+\.\s*/, ''), // Remove numbering
    "acceptedAnswer": {
      "@type": "Answer", 
      "text": answerList[index]?.trim() || "Contact us for more information."
    }
  }));
}

/**
 * Generates enhanced meta tags for local SEO with intelligent address handling
 */
export function generateLocalSEOMetaTags(formData: any): string {
  const tags = [];
  
  if (formData.description) {
    tags.push(`<meta name="description" content="${formData.description}">`);
  }
  
  if (formData.addressRegion) {
    tags.push(`<meta name="geo.region" content="${formData.addressRegion}">`);
  }
  
  if (formData.addressLocality) {
    tags.push(`<meta name="geo.placename" content="${formData.addressLocality}">`);
  }
  
  if (formData.postalCode) {
    tags.push(`<meta name="geo.postal-code" content="${formData.postalCode}">`);
  }
  
  if (formData.latitude && formData.longitude) {
    tags.push(`<meta name="geo.position" content="${formData.latitude};${formData.longitude}">`);
    tags.push(`<meta name="ICBM" content="${formData.latitude}, ${formData.longitude}">`);
  }
  
  if (formData.voiceKeywords) {
    tags.push(`<meta name="keywords" content="${formData.voiceKeywords}">`);
  }
  
  if (formData.voiceSummary) {
    tags.push(`<meta name="voice-summary" content="${formData.voiceSummary}">`);
  }
  
  if (formData.priceRange) {
    tags.push(`<meta name="price-range" content="${formData.priceRange}">`);
  }
  
  return tags.join('\n');
}
