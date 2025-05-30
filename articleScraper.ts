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

const extractImageUrl = ($: cheerio.CheerioAPI, baseUrl: string): string | null => {
  let imageUrl: string | undefined | null = null;
  const urlSources: { name: string, url?: string | null }[] = [];

  // 1. Try OpenGraph image
  const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content');
  if (ogImage) {
    urlSources.push({ name: 'og:image', url: ogImage });
    try {
      imageUrl = new URL(ogImage, baseUrl).href;
      console.log(`Image found via og:image for ${baseUrl}: ${imageUrl}`);
      return imageUrl;
    } catch (e) {
      console.warn(`Invalid og:image URL "${ogImage}" for ${baseUrl}:`, e instanceof Error ? e.message : String(e));
      imageUrl = null; // Reset if invalid
    }
  }

  // 2. Try Twitter card image
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage) {
    urlSources.push({ name: 'twitter:image', url: twitterImage });
    try {
      imageUrl = new URL(twitterImage, baseUrl).href;
      console.log(`Image found via twitter:image for ${baseUrl}: ${imageUrl}`);
      return imageUrl;
    } catch (e) {
      console.warn(`Invalid twitter:image URL "${twitterImage}" for ${baseUrl}:`, e instanceof Error ? e.message : String(e));
      imageUrl = null; // Reset
    }
  }

  // 3. Try Schema.org JSON-LD
  $('script[type="application/ld+json"]').each((_idx, el) => {
    try {
      const jsonString = $(el).html();
      if (jsonString) {
        const jsonData = JSON.parse(jsonString);
        let schemaImgUrl: string | undefined = undefined;

        const findImageInSchema = (data: any): string | undefined => {
          if (!data) return undefined;
          if (typeof data.image === 'string') return data.image;
          if (typeof data.image === 'object' && data.image?.url && typeof data.image.url === 'string') return data.image.url;
          if (Array.isArray(data.image) && data.image.length > 0) {
            for (const imgObj of data.image) {
              if (typeof imgObj === 'string') return imgObj;
              if (typeof imgObj === 'object' && imgObj?.url && typeof imgObj.url === 'string') return imgObj.url;
            }
          }
          // Check for image within graph for some complex schemas
          if (Array.isArray(data['@graph'])) {
            for (const item of data['@graph']) {
                if (item.image) { // Could be NewsArticle, Article, etc.
                    const graphImg = findImageInSchema(item); // Recursive call for nested image objects
                    if (graphImg) return graphImg;
                }
            }
          }
          return undefined;
        };

        schemaImgUrl = findImageInSchema(jsonData);

        if (schemaImgUrl) {
          urlSources.push({ name: 'Schema.org', url: schemaImgUrl });
          imageUrl = new URL(schemaImgUrl, baseUrl).href;
          console.log(`Image found via Schema.org for ${baseUrl}: ${imageUrl}`);
          return false; // Stop iterating Cheerio .each if image found
        }
      }
    } catch (e) {
      // console.warn(`Error parsing JSON-LD for ${baseUrl}:`, e instanceof Error ? e.message : String(e)); // Can be noisy
    }
  });

  if (imageUrl) return imageUrl; // From Schema.org if found in .each loop

  if (urlSources.length > 0) {
    console.log(`Potential image URLs found but none were valid or selected for ${baseUrl}:`, urlSources);
  } else {
    console.log(`No image URL found from og:image, twitter:image, or Schema.org for ${baseUrl}.`);
  }
  return null;
};


export const scrapeArticleContent = async (url: string): Promise<ScrapedData> => {
  console.log(`[Scraper] Attempting to scrape: ${url}`);
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
      console.warn(`[Scraper] Failed to fetch ${url}: Status ${response.status}`);
      return { textContent: null, mainImageUrl: null };
    }

    const html = response.data;
    const $ = cheerio.load(html);

    const mainImageUrl = extractImageUrl($, url);

    // Extract Main Text Content
    let bestTextContent = '';
    // Remove less relevant sections from the whole body first
    console.log(`[Scraper] Removing globally irrelevant sections for ${url}`);
    $(sectionsToRemove.join(', ')).remove();

    for (const selector of articleContentSelectors) {
      console.log(`[Scraper] Trying text selector for ${url}: ${selector}`);
      const selectedElement = $(selector);
      if (selectedElement.length > 0) {
        const mainContentElement = selectedElement.first();
        const clonedContent = mainContentElement.clone();

        // Remove unwanted sub-elements from the selected main content clone
        console.log(`[Scraper] Cleaning selected content from selector "${selector}" for ${url}`);
        clonedContent.find(sectionsToRemove.join(', ')).remove();

        let rawText = clonedContent.text();
        console.log(`[Scraper] Raw text length from "${selector}" for ${url}: ${rawText.length}`);
        bestTextContent = rawText.replace(/\s\s+/g, ' ').trim();

        if (bestTextContent.length > 200) {
          console.log(`[Scraper] Sufficient text found with selector "${selector}" for ${url}. Length: ${bestTextContent.length}`);
          break;
        } else {
          console.log(`[Scraper] Text from selector "${selector}" too short for ${url} (Length: ${bestTextContent.length}), trying next selector.`);
        }
      } else {
        // console.log(`[Scraper] Selector "${selector}" not found for ${url}.`); // Can be too noisy
      }
    }

    if (bestTextContent.length < 200 && $('body').length) {
        console.log(`[Scraper] No specific selector yielded enough text for ${url}. Falling back to body. Current bestText length: ${bestTextContent.length}`);
        const bodyClone = $('body').clone();
        // sectionsToRemove already globally removed, but if body was selected by a generic selector, this ensures it's clean too.
        // bodyClone.find(sectionsToRemove.join(', ')).remove(); // Effectively done by global remove
        bestTextContent = bodyClone.text().replace(/\s\s+/g, ' ').trim();
        console.log(`[Scraper] Text from body fallback for ${url}. Length: ${bestTextContent.length}`);
    }

    if (bestTextContent.length === 0 && !mainImageUrl) {
        console.warn(`[Scraper] Could not extract any meaningful text or image from ${url}`);
        return { textContent: null, mainImageUrl: null };
    }
    if (bestTextContent.length > 0 && bestTextContent.length < 50 && !mainImageUrl) { // Heuristic for very poor content
        console.warn(`[Scraper] Extracted text very short (${bestTextContent.length} chars) and no image from ${url}. Treating as poor scrape.`);
        // return { textContent: null, mainImageUrl: null }; // Optional: be stricter
    }

    console.log(`[Scraper] Finished scraping for ${url}. Final text length: ${bestTextContent?.length || 0}. Image URL: ${mainImageUrl || 'None'}`);
    return {
      textContent: bestTextContent || null, // Return null if empty string after trim
      mainImageUrl: mainImageUrl || null,
    };

  } catch (error: any) {
    console.error(`[Scraper] Error scraping article at ${url}:`, error.message);
    if (axios.isAxiosError(error) && error.response) {
      console.error('[Scraper] Axios error details:', {
        status: error.response.status,
      });
    } else if (axios.isAxiosError(error) && error.request) {
        console.error(`[Scraper] Axios error: No response received for ${url}`);
    }
    return {
      textContent: null,
      mainImageUrl: null,
    };
  }
};
