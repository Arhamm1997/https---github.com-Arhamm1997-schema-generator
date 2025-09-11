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
    // This is a special check for the FAQ page schema, which has an array of objects.
    if (obj['@type'] === 'FAQPage' && obj.mainEntity) {
        // Don't remove mainEntity even if it's an empty array initially
    }

    return Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      const cleanedValue = (value && typeof value === 'object') ? cleanObject(value) : value;

      // Keep value if it's not null/undefined/empty string
      if (cleanedValue != null && cleanedValue !== '') {
        // If it's an array, keep it only if it's not empty
        if (Array.isArray(cleanedValue) && cleanedValue.length > 0) {
          acc[key] = cleanedValue;
        } 
        // If it's an object, keep it only if it has keys
        else if (typeof cleanedValue === 'object' && !Array.isArray(cleanedValue) && Object.keys(cleanedValue).length > 0) {
          acc[key] = cleanedValue;
        } 
        // Keep non-object, non-array values
        else if (typeof cleanedValue !== 'object') {
           acc[key] = cleanedValue;
        }
      }
      return acc;
    }, {} as any);
  }
  return obj;
}
