
import { RawArticle, RssSource } from './types';
import { CORS_PROXY_URL } from './constants';

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
    });
  }
  return articles;
};

export const fetchRssFeed = async (rssSource: RssSource): Promise<RawArticle[]> => {
  const encodedUrl = encodeURIComponent(rssSource.url);
  try {
    const response = await fetch(`${CORS_PROXY_URL}${encodedUrl}`, {
        headers: { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${rssSource.name}: ${response.statusText} (Status ${response.status}). URL: ${rssSource.url}`);
    }
    const xmlString = await response.text();
    if (!xmlString.trim()) {
        throw new Error(`Empty response from ${rssSource.name}. URL: ${rssSource.url}`);
    }
    return parseRSSFeed(xmlString, rssSource.name);
  } catch (error) {
    console.error(`Initial error fetching/parsing feed for ${rssSource.name} (${rssSource.url}):`, error);
    if (error instanceof Error && error.message.toLowerCase().includes('failed to fetch')) {
        throw new Error(`Network error (Failed to fetch) for ${rssSource.name}. URL: ${rssSource.url}. Proxy or target server might be an issue.`);
    }
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

  for (const source of sources) {
    try {
      const articlesFromThisSource = await fetchRssFeed(source);
      const uniqueNewArticles = articlesFromThisSource.filter(article => {
        if (articleIds.has(article.id)) return false;
        articleIds.add(article.id);
        return true;
      });
      allArticlesCombined.push(...uniqueNewArticles);
      onSourceProcessed?.(source.name, uniqueNewArticles);
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('failed to fetch')) {
        let proxyHostname = "the configured CORS proxy";
        try {
          if (CORS_PROXY_URL) {
            const urlObj = new URL(CORS_PROXY_URL);
            proxyHostname = urlObj.hostname;
          }
        } catch (e) { /* Keep default proxyHostname */ }
        
        errorMessage = `Network error: Failed to fetch from ${source.name}. The RSS server might be down, blocking requests, or the CORS proxy (${proxyHostname}) might be unable to reach it. URL: ${source.url}`;
      }
      onSourceProcessed?.(source.name, [], errorMessage); 
    }
  }
  
  allArticlesCombined.sort((a, b) => {
    try {
        const parseDate = (dateStr?: string): number => {
            if (!dateStr) return 0;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                const parts = dateStr.split('/');
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
            }
            const d = new Date(dateStr).getTime();
            return isNaN(d) ? 0 : d;
        };
        const dateA = parseDate(a.pubDate);
        const dateB = parseDate(b.pubDate);
        return dateB - dateA;
    } catch (e) {
        return 0; 
    }
  });
  return allArticlesCombined;
};
