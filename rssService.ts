import { RawArticle, RssSource } from './types';
import { CORS_PROXY_URL } from './constants';
import { scrapeArticleContent } from './articleScraper'; // Added import

const parseRSSFeed = (xmlString: string, sourceName: string): RawArticle[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  
  const parserErrors = xmlDoc.getElementsByTagName("parsererror");
  if (parserErrors.length > 0) {
    console.warn(`XML parsing error for source "${sourceName}":`, parserErrors[0].textContent?.substring(0, 300));
  }

  const items = Array.from(xmlDoc.getElementsByTagName("item")).length > 0 
              ? xmlDoc.getElementsByTagName("item") 
              : xmlDoc.getElementsByTagName("entry");
  const articles: RawArticle[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    const titleElement = item.getElementsByTagName("title")[0];
    const title = titleElement?.textContent?.trim() || "No title";

    let link = "";
    const linkElementAtom = item.querySelector('link[rel="alternate"], link:not([rel])'); 
    const linkElementRss = item.getElementsByTagName("link")[0]; 
    if (linkElementAtom && linkElementAtom.getAttribute('href')) {
        link = linkElementAtom.getAttribute('href')!;
    } else if (linkElementRss) {
        link = linkElementRss.textContent || "";
    }

    const pubDateElement = item.getElementsByTagName("pubDate")[0] || 
                           item.getElementsByTagName("dc:date")[0] || 
                           item.getElementsByTagName("published")[0] || 
                           item.getElementsByTagName("updated")[0]; 
    let pubDateStr: string | undefined = undefined;
    if (pubDateElement && pubDateElement.textContent) {
        try {
            pubDateStr = new Date(pubDateElement.textContent).toLocaleDateString('fr-FR', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            }); 
        } catch (e) {
            console.warn(`Could not parse date "${pubDateElement.textContent}" for article "${title}" from "${sourceName}"`);
        }
    }
    
    const descriptionContentFull = item.getElementsByTagName("description")[0]?.textContent || 
                                   item.getElementsByTagName("summary")[0]?.textContent || 
                                   item.getElementsByTagName("content")[0]?.textContent || ""; 
    
    const plainDescription = descriptionContentFull.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 250) + (descriptionContentFull.length > 250 ? '...' : '');

    let imageUrl: string | undefined = undefined;

    const mediaContent = item.querySelector('media\\:content, content[type^="image"], link[rel="enclosure"][type^="image"]');
    if (mediaContent) {
        imageUrl = mediaContent.getAttribute('url') || mediaContent.getAttribute('href') || undefined;
    }
    if (!imageUrl) {
        const enclosure = item.querySelector('enclosure[url][type^="image"]');
        if (enclosure) imageUrl = enclosure.getAttribute('url') || undefined;
    }
    if (!imageUrl && descriptionContentFull) {
        const imgMatch = descriptionContentFull.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch && imgMatch[1]) {
            try { 
                const urlTest = new URL(imgMatch[1], link || 'http://localhost'); 
                if (urlTest.protocol === "http:" || urlTest.protocol === "https:") {
                   imageUrl = urlTest.href;
                }
            } catch (e) { /* ignore invalid URL */ }
        }
    }
    if (!imageUrl) {
        const seed = encodeURIComponent(title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20) + i);
        imageUrl = `https://picsum.photos/seed/${seed}/160/90`; 
    }

    articles.push({
      id: link || `${sourceName}-${Date.now()}-${i}-${Math.random().toString(16).slice(2)}`, 
      title,
      link,
      pubDate: pubDateStr,
      description: plainDescription,
      imageUrl,
      source: sourceName,
      // fullText and scrapedImageUrl will be added after scraping
    });
  }
  return articles;
};

export const fetchRssFeed = async (rssSource: RssSource): Promise<RawArticle[]> => {
  const encodedUrl = encodeURIComponent(rssSource.url);
  let xmlString = ""; // Define xmlString here to be accessible in the broader scope if needed for logging
  try {
    const response = await fetch(`${CORS_PROXY_URL}${encodedUrl}`, {
        headers: { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${rssSource.name}: ${response.statusText} (Status ${response.status}). URL: ${rssSource.url}`);
    }
    xmlString = await response.text(); // Assign value to xmlString
    if (!xmlString.trim()) {
        throw new Error(`Empty response from ${rssSource.name}. URL: ${rssSource.url}`);
    }

    const parsedArticles = parseRSSFeed(xmlString, rssSource.name);
    const articlesWithScrapedContent: RawArticle[] = [];

    console.log(`Starting scraping for ${parsedArticles.length} articles from ${rssSource.name}`);
    for (const article of parsedArticles) {
      try {
        if (article.link && article.link.startsWith('http')) { // Only scrape if there's a valid link
          console.log(`Scraping article: ${article.title} from ${article.link}`);
          const scrapedData = await scrapeArticleContent(article.link);
          articlesWithScrapedContent.push({
            ...article,
            fullText: scrapedData.textContent || undefined,
            scrapedImageUrl: scrapedData.mainImageUrl || undefined,
          });
        } else {
          console.warn(`Skipping scraping for article "${article.title}" due to missing or invalid link: ${article.link}`);
          articlesWithScrapedContent.push({
            ...article,
            fullText: undefined,
            scrapedImageUrl: undefined,
          });
        }
      } catch (scrapeError) {
        console.error(`Scraping failed for "${article.title}" (${article.link}), pushing article without full content. Error:`, scrapeError);
        articlesWithScrapedContent.push({
            ...article,
            fullText: undefined,
            scrapedImageUrl: undefined,
        });
      }
    }
    console.log(`Finished scraping for ${rssSource.name}. Processed ${articlesWithScrapedContent.length} articles.`);
    return articlesWithScrapedContent;

  } catch (error) {
    console.error(`Error in fetchRssFeed for ${rssSource.name} (${rssSource.url}). XML content (first 500 chars, if available): "${xmlString.substring(0,500)}" Error:`, error);
    if (error instanceof Error && error.message.toLowerCase().includes('failed to fetch')) {
        throw new Error(`Network error (Failed to fetch) for ${rssSource.name}. URL: ${rssSource.url}. Proxy or target server might be an issue.`);
    }
    // If parsing or other errors occur, return empty array or rethrow
    // For now, rethrowing to be handled by fetchAllRssFeeds individual source error handling
    throw error; 
  }
};

export const fetchAllRssFeeds = async (
  sources: RssSource[],
  onSourceProcessed?: (
    sourceName: string,
    articlesFromSource: RawArticle[],
    error?: string
  ) => void
): Promise<RawArticle[]> => {
  const allArticlesCombined: RawArticle[] = [];
  const articleIds = new Set<string>(); 

  console.log(`Starting to fetch all RSS feeds for ${sources.length} sources.`);
  for (const source of sources) {
    console.log(`Fetching and processing source: ${source.name}`);
    try {
      const articlesFromThisSource = await fetchRssFeed(source);
      const uniqueNewArticles = articlesFromThisSource.filter(article => {
        if (article.id) { // Ensure article.id is not undefined or empty
            if (articleIds.has(article.id)) {
                console.log(`Duplicate article ID found and skipped: ${article.id} (${article.title})`);
                return false;
            }
            articleIds.add(article.id);
            return true;
        }
        console.warn(`Article with missing ID found from source ${source.name}: ${article.title}`);
        return false; // Skip articles with no ID
      });
      allArticlesCombined.push(...uniqueNewArticles);
      console.log(`Successfully processed source: ${source.name}. Added ${uniqueNewArticles.length} new articles.`);
      onSourceProcessed?.(source.name, uniqueNewArticles);
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      // Custom error message for failed fetch is already quite good in fetchRssFeed
      // We can enhance it or keep it as is.
      console.error(`Failed to process source ${source.name}: ${errorMessage}`);
      onSourceProcessed?.(source.name, [], errorMessage); 
    }
  }
  
  console.log(`Finished fetching all RSS feeds. Total unique articles: ${allArticlesCombined.length}`);
  allArticlesCombined.sort((a, b) => {
    try {
        const parseDate = (dateStr?: string): number => {
            if (!dateStr) return 0;
            // Check if date is in DD/MM/YYYY format
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                const parts = dateStr.split('/');
                // Month is 0-indexed in JavaScript Date
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
            }
            // Try parsing other common date formats
            const d = new Date(dateStr).getTime();
            return isNaN(d) ? 0 : d; // Return 0 for invalid dates to sort them last or first
        };
        const dateA = parseDate(a.pubDate);
        const dateB = parseDate(b.pubDate);
        return dateB - dateA; // Sorts in descending order (newest first)
    } catch (e) {
        console.warn("Date parsing error during sort:", e);
        return 0; 
    }
  });
  return allArticlesCombined;
};
