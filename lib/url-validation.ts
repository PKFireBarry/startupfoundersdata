/**
 * Comprehensive URL validation utility for filtering out unhelpful links
 * Used across the application to ensure only legitimate URLs are displayed
 */

interface URLValidationResult {
  isValid: boolean;
  reason?: string;
  originalUrl: string;
}

// Centralized list of blocked patterns - easy to maintain
const BLOCKED_PATTERNS = [
  // Email providers
  'gmail.com',
  'yahoo.com', 
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'icloud.com',
  
  // Search engines & generic sites
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'search.yahoo.com',
  'ask.com',
  'baidu.com',
  
  // Social media (if they're not proper job application links)
  'facebook.com',
  'twitter.com', 
  'instagram.com',
  'tiktok.com',
  'linkedin.com/feed',  // LinkedIn feed, not job posts
  'youtube.com',
  'snapchat.com',
  'discord.com',
  
  // Generic/unhelpful domains
  'example.com',
  'localhost',
  'test.com',
  'placeholder.com',
  '127.0.0.1',
  '0.0.0.0',
  
  // Job boards that redirect to themselves (not direct apply links)
  'indeed.com/viewjob',
  'glassdoor.com/job',
  'monster.com',
  'careerbuilder.com',
  
  // Common scraping errors and invalid URLs
  'javascript:',
  'mailto:',
  'tel:',
  '#',
  'void(0)',
  'null',
  'undefined',
  'about:blank',
  'data:',
  
  // News/article sites (often scraped incorrectly)
  'techcrunch.com',
  'bloomberg.com',
  'reuters.com',
  'cnn.com',
  'bbc.com',
  'medium.com',
  'substack.com',
  
  // File sharing/cloud storage (not job applications)
  'dropbox.com',
  'drive.google.com',
  'onedrive.com',
  'icloud.com/share',
  
  // Development/placeholder sites
  'github.io',
  'netlify.app',
  'vercel.app',
  'herokuapp.com',
  'replit.com'
];

/**
 * Validates if a URL is suitable for display as an actionable link
 * @param url - The URL to validate
 * @param options - Validation options
 * @returns boolean - true if URL is valid and should be displayed
 */
export function isValidActionableUrl(
  url: string | null | undefined,
  options: {
    logResults?: boolean;
    context?: string; // e.g., 'apply_url', 'company_url', 'linkedin_url'
  } = {}
): boolean {
  const { logResults = false, context = 'unknown' } = options;
  
  if (!url) {
    if (logResults) console.log(`🚫 [${context}] Blocked: null/undefined URL`);
    return false;
  }

  try {
    // Normalize URL for checking
    const normalizedUrl = url.toLowerCase().trim();
    
    // Check for obviously invalid URLs
    const invalidPatterns = [
      '', 'n/a', 'null', 'undefined', 'none', 'tbd', 'coming soon',
      'not available', 'na', 'N/A', 'TBD', 'COMING SOON'
    ];
    
    if (invalidPatterns.includes(normalizedUrl) ||
        normalizedUrl.startsWith('javascript:') ||
        normalizedUrl.startsWith('mailto:') ||
        normalizedUrl.startsWith('tel:') ||
        normalizedUrl === '#' ||
        normalizedUrl.includes('void(0)') ||
        normalizedUrl.length < 4) {
      if (logResults) console.log(`🚫 [${context}] Blocked: ${url} (obviously invalid)`);
      return false;
    }
    
    // Check for email-like patterns in URL (e.g., https://hi@domain.com/)
    // This catches scraping errors where email addresses get mixed into URLs
    if (normalizedUrl.includes('@') && !normalizedUrl.startsWith('mailto:')) {
      // Allow legitimate URLs with @ in query params, but block @ in the domain/path
      const beforeQuery = normalizedUrl.split('?')[0];
      if (beforeQuery.includes('@')) {
        if (logResults) console.log(`🚫 [${context}] Blocked: ${url} (contains @ symbol in URL path)`);
        return false;
      }
    }
    
    // Parse URL to get domain
    let urlToParse = normalizedUrl;
    if (!urlToParse.startsWith('http')) {
      urlToParse = 'https://' + urlToParse;
    }
    
    const parsedUrl = new URL(urlToParse);
    const hostname = parsedUrl.hostname.toLowerCase();
    const fullPath = hostname + parsedUrl.pathname;
    
    // Check against blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (hostname.includes(pattern.toLowerCase()) || 
          fullPath.includes(pattern.toLowerCase())) {
        if (logResults) console.log(`🚫 [${context}] Blocked: ${url} (matched pattern: ${pattern})`);
        return false;
      }
    }
    
    if (logResults) console.log(`✅ [${context}] Valid: ${url}`);
    return true;
  } catch (error) {
    if (logResults) console.log(`🚫 [${context}] Blocked: ${url} (parsing error: ${error})`);
    return false;
  }
}

/**
 * Validates URLs with detailed results for debugging
 */
export function validateUrlWithDetails(url: string | null | undefined, context?: string): URLValidationResult {
  if (!url) {
    return {
      isValid: false,
      reason: 'URL is null or undefined',
      originalUrl: url || 'null'
    };
  }

  const normalizedUrl = url.toLowerCase().trim();
  
  // Check for obviously invalid URLs
  if (normalizedUrl === '' || normalizedUrl === 'n/a' || normalizedUrl === 'null') {
    return {
      isValid: false,
      reason: 'URL is empty or placeholder value',
      originalUrl: url
    };
  }

  try {
    let urlToParse = normalizedUrl;
    if (!urlToParse.startsWith('http')) {
      urlToParse = 'https://' + urlToParse;
    }
    
    const parsedUrl = new URL(urlToParse);
    const hostname = parsedUrl.hostname.toLowerCase();
    const fullPath = hostname + parsedUrl.pathname;
    
    // Check against blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (hostname.includes(pattern.toLowerCase()) || 
          fullPath.includes(pattern.toLowerCase())) {
        return {
          isValid: false,
          reason: `Matched blocked pattern: ${pattern}`,
          originalUrl: url
        };
      }
    }
    
    return {
      isValid: true,
      originalUrl: url
    };
  } catch (error) {
    return {
      isValid: false,
      reason: `URL parsing failed: ${error}`,
      originalUrl: url
    };
  }
}

/**
 * Filters an object's URL properties, keeping only valid ones
 */
export function filterValidUrls<T extends Record<string, any>>(
  obj: T,
  urlFields: (keyof T)[],
  options: { logResults?: boolean } = {}
): T {
  const filtered = { ...obj };
  
  urlFields.forEach(field => {
    const url = obj[field];
    if (url && !isValidActionableUrl(url as string, { 
      logResults: options.logResults, 
      context: String(field) 
    })) {
      // Set invalid URLs to null instead of removing the property
      (filtered as any)[field] = null;
    }
  });
  
  return filtered;
}

/**
 * Quick validation specifically for apply URLs (most common use case)
 */
export function isValidApplyUrl(url: string | null | undefined): boolean {
  return isValidActionableUrl(url, { context: 'apply_url' });
}

/**
 * Quick validation for company URLs
 */
export function isValidCompanyUrl(url: string | null | undefined): boolean {
  return isValidActionableUrl(url, { context: 'company_url' });
}

/**
 * Add new blocked patterns dynamically (for admin use)
 */
export function addBlockedPattern(pattern: string): void {
  if (!BLOCKED_PATTERNS.includes(pattern.toLowerCase())) {
    BLOCKED_PATTERNS.push(pattern.toLowerCase());
    console.log(`➕ Added blocked pattern: ${pattern}`);
  }
}

/**
 * Get current blocked patterns (for debugging)
 */
export function getBlockedPatterns(): string[] {
  return [...BLOCKED_PATTERNS];
}