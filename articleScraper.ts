import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedData {
  textContent: string | null;
  mainImageUrl?: string | null;
}

// List of common selectors for article content, ordered by preference or commonality
const articleContentSelectors = [
  'article[class*="content"]', 'article[class*="body"]', 'article[id*="content"]', 'article[id*="body"]',
  'div[class*="article-content"]', 'div[class*="article-body"]', 'div[id*="article-content"]', 'div[id*="article-body"]',
  'div[class*="post-content"]', 'div[class*="post-body"]', 'div[id*="post-content"]', 'div[id*="post-body"]',
  'main[role="main"]', 'article', 'main',
  // Less specific, try as last resort
  'div[class*="content"]', 'div[id*="content"]', 'div[class*="main"]', 'div[id*="main"]'
];

// List of common selectors for less relevant sections to remove
const sectionsToRemove = [
  'nav', 'footer', 'aside', 'header',
  '[role="navigation"]', '[role="complementary"]', '[role="banner"]', '[role="contentinfo"]',
  '[class*="sidebar"]', '[id*="sidebar"]',
  '[class*="comments"]', '[id*="comments"]',
  '[class*="related-posts"]', '[id*="related-posts"]',
  '[class*="advertisement"]', '[id*="advertisement"]', '[class*="ads"]', '[id*="ads"]',
  'script', 'style', 'noscript', 'iframe', 'form', 'button', 'input', '[aria-hidden="true"]'
];


export const scrapeArticleContent = async (url: string): Promise<ScrapedData> => {
  console.log(`Attempting to scrape: ${url}`);
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000, // 10 seconds timeout
    });

    if (response.status !== 200) {
      console.warn(`Failed to fetch ${url}: Status ${response.status}`);
      return { textContent: null, mainImageUrl: null };
    }

    const html = response.data;
    const $ = cheerio.load(html);

    // 1. Extract Main Image URL
    let mainImageUrl: string | undefined | null = null;
    // Try OpenGraph first
    mainImageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content');
    if (mainImageUrl) {
        try {
            mainImageUrl = new URL(mainImageUrl, url).href;
        } catch (e) {
            console.warn(`Invalid og:image URL ${mainImageUrl} for ${url}: `, e);
            mainImageUrl = null;
        }
    }
    // Add more image extraction logic here if needed (e.g., from schema.org, prominent img tags)
    // For now, og:image is a good start.

    // 2. Extract Main Text Content
    let bestTextContent = '';
    let selectedElementHtml = ''; // For debugging or more advanced cleaning

    // Remove less relevant sections from the whole body first to simplify article selection
    $(sectionsToRemove.join(', ')).remove();
    
    for (const selector of articleContentSelectors) {
      const selectedElement = $(selector);
      if (selectedElement.length > 0) {
        // Prioritize the first element found by a more specific selector
        // Or, one could iterate and find the one with most text. For now, first match.
        const mainContentElement = selectedElement.first();
        
        // Clone and remove unwanted sub-elements from the selected main content
        const clonedContent = mainContentElement.clone();
        // If sectionsToRemove were globally removed, this might be redundant, but can be useful for nested unwanted elements
        // clonedContent.find(sectionsToRemove.join(', ')).remove(); 
                                
        let rawText = clonedContent.text();
        bestTextContent = rawText.replace(/\s\s+/g, ' ').trim();
        
        // Basic check for decent content length
        if (bestTextContent.length > 200) { // Arbitrary threshold for "decent"
          selectedElementHtml = mainContentElement.html() || ''; // Store HTML of selected element
          break; 
        }
      }
    }
    
    if (bestTextContent.length < 200 && $('body').length) { // Fallback to body if no good section found
        const bodyClone = $('body').clone();
        // bodyClone.find(sectionsToRemove.join(', ')).remove(); // Already done globally
        bestTextContent = bodyClone.text().replace(/\s\s+/g, ' ').trim();
        selectedElementHtml = $('body').html() || '';
    }


    if (!bestTextContent && !mainImageUrl) {
        console.warn(`Could not extract meaningful content or image from ${url}`);
        return { textContent: null, mainImageUrl: null };
    }
    
    console.log(`Successfully scraped content from: ${url}. Text length: ${bestTextContent?.length || 0}`);
    return {
      textContent: bestTextContent || null,
      mainImageUrl: mainImageUrl || null,
    };

  } catch (error: any) {
    console.error(`Error scraping article at ${url}:`, error.message);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Axios error details:', {
        status: error.response.status,
        // data: error.response.data, // Data can be huge (HTML), log selectively
      });
    } else if (axios.isAxiosError(error) && error.request) {
        console.error('Axios error: No response received for', url);
    }
    return {
      textContent: null,
      mainImageUrl: null,
    };
  }
};
