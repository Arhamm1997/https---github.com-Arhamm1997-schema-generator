import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
      
      // PostalAddress validation - More lenient for AI-extracted content
      if (obj['@type'] === 'PostalAddress') {
        // At least one address component should be present
        const hasAnyAddress = obj.streetAddress || obj.addressLocality || obj.addressRegion;
        
        if (!hasAnyAddress) {
          return null; // No address information at all
        }
        
        // Fill in missing components with reasonable defaults
        if (!obj.streetAddress && (obj.addressLocality || obj.addressRegion)) {
          obj.streetAddress = "Address available upon request";
        }
        if (!obj.addressLocality && obj.addressRegion) {
          obj.addressLocality = "Local Area";
        }
        if (!obj.addressRegion && obj.addressLocality) {
          obj.addressRegion = "State";
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

      // Organization/Business validation - More lenient for AI content
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
        
        // Validate price range
        if (obj.priceRange) {
          obj.priceRange = validatePriceRange(obj.priceRange);
        }
        
        // Validate URLs
        if (obj.url) {
          obj.url = ensureAbsoluteUrl(obj.url);
        }
        
        // Validate social media URLs
        if (obj.sameAs && Array.isArray(obj.sameAs)) {
          obj.sameAs = obj.sameAs
            .map(url => ensureAbsoluteUrl(url))
            .filter(url => isValidUrl(url));
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
 * Formats phone number to standard format
 */
function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's a US number (10 or 11 digits)
  if (digits.length === 10) {
    return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // For international numbers, keep original format if it looks valid
  if (digits.length >= 7) {
    return phone.trim();
  }
  
  return phone;
}

/**
 * Validates and formats price range
 */
function validatePriceRange(priceRange: string): string {
  if (!priceRange) return priceRange;
  
  const cleaned = priceRange.trim();
  
  // Check if it's already in the correct format
  if (/^\$+$/.test(cleaned)) {
    return cleaned;
  }
  
  // Try to convert text to dollar signs
  const lowerPrice = cleaned.toLowerCase();
  if (lowerPrice.includes('inexpensive') || lowerPrice.includes('cheap') || lowerPrice.includes('budget')) {
    return '$';
  } else if (lowerPrice.includes('moderate') || lowerPrice.includes('mid-range')) {
    return '$$';
  } else if (lowerPrice.includes('expensive') || lowerPrice.includes('upscale')) {
    return '$$$';
  } else if (lowerPrice.includes('very expensive') || lowerPrice.includes('luxury')) {
    return '$$$$';
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
 * Validates a JSON-LD schema object for common issues
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
  
  // Validate Business schemas - More lenient for AI-generated content
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
    
    // More lenient address validation
    if (!business.address) {
      errors.push('Business schema missing address property');
    } else {
      // Check if at least one address component exists
      const hasStreet = business.address.streetAddress;
      const hasCity = business.address.addressLocality;
      const hasState = business.address.addressRegion;
      
      if (!hasStreet && !hasCity && !hasState) {
        errors.push('Business address missing all components (street, city, state)');
      } else {
        // Only warn about missing components, don't fail validation
        if (!hasStreet) {
          console.warn('Business address missing streetAddress');
        }
        if (!hasCity) {
          console.warn('Business address missing addressLocality (city)');
        }
        if (!hasState) {
          console.warn('Business address missing addressRegion (state)');
        }
      }
    }
    
    // Phone is recommended but not required for AI-generated content
    if (!business.telephone) {
      console.warn('Business schema missing telephone property');
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
 * Generates meta tags for local SEO
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
  
  return tags.join('\n');
}

/**
 * Validates and cleans form data before schema generation - More lenient for AI content
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
    
    // Address validation - lenient for AI content
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
                           formData.addressRegion?.trim();
      
      if (!hasAnyAddress) {
        console.warn('No address information found - will use placeholders');
      }
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
  
  // Validate and format price range
  if (formData.priceRange) {
    cleanedData.priceRange = validatePriceRange(formData.priceRange);
  }
  
  return { isValid: errors.length === 0, errors, cleanedData };
}
