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
      }
      
      // GeoCoordinates validation
      if (obj['@type'] === 'GeoCoordinates') {
        if (!obj.latitude || !obj.longitude) {
          return null; // Invalid coordinates
        }
      }
      
      // AggregateRating validation
      if (obj['@type'] === 'AggregateRating') {
        if (!obj.ratingValue || !obj.reviewCount) {
          return null; // Invalid rating
        }
        // Ensure rating is within bounds
        if (obj.ratingValue < 1 || obj.ratingValue > 5) {
          return null;
        }
      }
      
      // PostalAddress validation
      if (obj['@type'] === 'PostalAddress') {
        if (!obj.streetAddress || !obj.addressLocality || !obj.addressRegion) {
          return null; // Invalid address
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
    }
    if (!schema.name && !schema.mainEntity?.name) {
      errors.push('WebPage schema missing name property');
    }
  }
  
  // Validate Business schemas
  const businessTypes = ['LocalBusiness', 'Restaurant', 'ProfessionalService', 'LegalService', 'MedicalBusiness'];
  if (businessTypes.includes(schema['@type']) || (schema.mainEntity && businessTypes.includes(schema.mainEntity['@type']))) {
    const business = schema['@type'] === 'WebPage' ? schema.mainEntity : schema;
    
    if (!business.name) {
      errors.push('Business schema missing name property');
    }
    if (!business.address || !business.address.streetAddress) {
      errors.push('Business schema missing complete address');
    }
    if (!business.telephone) {
      errors.push('Business schema missing telephone property');
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
      
      return {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": normalizedDay,
        "opens": startTime.trim(),
        "closes": endTime.trim()
      };
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
      
      return days.map(day => ({
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": day,
        "opens": startTime.trim(),
        "closes": endTime.trim()
      }));
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
