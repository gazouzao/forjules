
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { RawArticle, AnalyzedArticle, GeoJsonOutput, GeoJsonFeature, View, AnalysisData, RssSource } from './types-1';
import { INITIAL_RSS_SOURCES, MAX_ARTICLES_TO_ANALYZE, CORS_PROXY_URL } from './constants-1';
import { fetchAllRssFeeds } from './services/rssService';
import { analyzeArticleContent } from './services/geminiService';
import ArticleTable from './components/ArticleTable';
import GeoJsonDisplay from './components/GeoJsonDisplay';
import LoadingSpinner from './components/LoadingSpinner';

// Icons (simple SVGs) - SVGs remain the same, truncated for brevity
const RssIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5 mr-2"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 0 0-7.5-7.5H4.5m0-6.75h.75c7.168 0 13.5 5.832 13.5 13.5v.75M4.5 4.875A14.953 14.953 0 0 1 19.5 19.5M4.5 4.875C4.323 4.875 4.146 4.875 3.97 4.875c-.004 0-.008 0-.012 0C2.984 4.875.75 7.11.75 9.75v1.5c0 .808.188 1.58.53 2.25" />
  </svg>
);
const AnalyzeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5 mr-2"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
  </svg>
);
const GeoJsonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5 mr-2"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-12.495A18.75 18.75 0 0 1 20.25 7.5V15m0 0A18.74 18.74 0 0 1 15.75 21H5.25A18.74 18.74 0 0 1 .75 15V7.5A18.75 18.75 0 0 1 5.25 3H9" />
  </svg>
);
const ClearIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5 mr-2"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const MinusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
  </svg>
);
const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-4 h-4"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);
const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
);


interface AnalysisBatchProgress {
  current: number;
  total: number;
  estimatedRemaining: string | null;
  currentTitle?: string;
}

interface TabButtonProps {
  view: View;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}


const isValidRssContentType = (contentType: string | null): boolean => {
  if (!contentType) return false;
  const type = contentType.toLowerCase().split(';')[0].trim();
  const validTypes = [
    'application/rss+xml',
    'application/atom+xml',
    'application/xml',
    'text/xml',
    'application/x-rss+xml',
  ];
  console.log(`[Debug RSS Validation] Validating Content-Type: "${type}". Is valid: ${validTypes.includes(type)}`);
  return validTypes.includes(type);
};

const checkUrlIsRssCompliant = async (url: string): Promise<boolean> => {
  const encodedUrl = encodeURIComponent(url);
  const fetchUrl = `${CORS_PROXY_URL}${encodedUrl}`;
  let contentTypeFromHead: string | null = null;
  let contentTypeFromGet: string | null = null;

  try {
    console.log(`[Debug RSS Validation] Attempting HEAD request for ${url} via proxy: ${fetchUrl}`);
    let headResponse = await fetch(fetchUrl, { method: 'HEAD' });
    if (headResponse.ok) {
      contentTypeFromHead = headResponse.headers.get('Content-Type');
      console.log(`[Debug RSS Validation] HEAD for ${url} successful. Content-Type: ${contentTypeFromHead}`);
      if (isValidRssContentType(contentTypeFromHead)) {
        return true;
      }
      console.warn(`[Debug RSS Validation] HEAD Content-Type for ${url} ("${contentTypeFromHead}") is not a recognized RSS type. Proceeding to GET.`);
    } else {
      console.warn(`[Debug RSS Validation] HEAD request for ${url} failed: ${headResponse.status} ${headResponse.statusText}. Proceeding to GET.`);
    }
    
    console.log(`[Debug RSS Validation] Attempting GET request for ${url} via proxy: ${fetchUrl}`);
    const getResponse = await fetch(fetchUrl);
    if (!getResponse.ok) {
      console.warn(`[Debug RSS Validation] GET request for ${url} failed: ${getResponse.status} ${getResponse.statusText}. Cannot validate.`);
      return false; 
    }
    
    contentTypeFromGet = getResponse.headers.get('Content-Type');
    console.log(`[Debug RSS Validation] GET for ${url} successful. Content-Type: ${contentTypeFromGet}`);
    if (isValidRssContentType(contentTypeFromGet)) {
      return true;
    }
    console.warn(`[Debug RSS Validation] GET Content-Type for ${url} ("${contentTypeFromGet}") is not a recognized RSS type. Proceeding to XML content parsing fallback.`);

    const text = await getResponse.text();
    console.log(`[Debug RSS Validation] Text received for ${url} (first 500 chars for XML parsing fallback):`, text.substring(0, 500));

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    
    const parserErrors = xmlDoc.getElementsByTagName("parsererror");
    if (parserErrors.length > 0) {
        console.warn(`[Debug RSS Validation] XML parser error for ${url}:`, parserErrors[0].textContent?.substring(0, 300));
    }

    if (parserErrors.length === 0 && (xmlDoc.getElementsByTagName("rss").length > 0 || xmlDoc.getElementsByTagName("feed").length > 0) ) {
       console.warn(`[Debug RSS Validation] Content-Type check failed for ${url}, but content appears to be valid XML/RSS (tags found). URL considered VALID.`);
       return true;
    } else {
        console.warn(`[Debug RSS Validation] XML parsing fallback failed for ${url}. No <rss> or <feed> tags found, or parser error present. URL considered INVALID.`);
        return false;
    }

  } catch (error) {
    console.error(`[Debug RSS Validation] Network or unexpected error during validation of ${url}:`, error);
    return false;
  }
};

const makeGeoJson = (articles: AnalyzedArticle[]): GeoJsonOutput => {
  const features: GeoJsonFeature[] = articles
    .filter(article => article.latitude !== null && article.longitude !== null && typeof article.latitude === 'number' && typeof article.longitude === 'number')
    .map(article => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [article.longitude as number, article.latitude as number],
      },
      properties: {
        titre: article.title,
        categorie: article.categorie,
        importance: article.importance,
        lien: article.link,
        localisation: article.localisation,
        date: article.pubDate || "",
        description: article.description || "",
        imageUrl: article.imageUrl || "", // Pass imageUrl to GeoJSON
      },
    }));

  return {
    type: "FeatureCollection",
    features: features,
  };
};

const formatTimeMs = (milliseconds: number): string => {
  if (isNaN(milliseconds) || milliseconds <= 0) return "";
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `Est. ~${minutes} min ${seconds < 10 ? '0' : ''}${seconds} sec remaining`;
  }
  if (totalSeconds > 0) {
    return `Est. ~${totalSeconds} sec remaining`;
  }
  return "Est. <1 sec remaining";
};

const AUTO_REFRESH_INTERVAL_MS = 30 * 1000; 
const PROGRESS_UPDATE_INTERVAL_MS = 250;

const App: React.FC = () => {
  const [allRssSources, setAllRssSources] = useState<RssSource[]>(INITIAL_RSS_SOURCES);
  const [selectedRssSourceUrls, setSelectedRssSourceUrls] = useState<string[]>(INITIAL_RSS_SOURCES.map(s => s.url));
  const [newRssSourceName, setNewRssSourceName] = useState<string>("");
  const [newRssSourceUrl, setNewRssSourceUrl] = useState<string>("");
  const [isValidatingUrl, setIsValidatingUrl] = useState<boolean>(false);

  const [rawArticles, setRawArticles] = useState<RawArticle[]>([]);
  const [analyzedArticles, setAnalyzedArticles] = useState<AnalyzedArticle[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonOutput | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.RAW_ARTICLES);
  const [isLoadingRss, setIsLoadingRss] = useState<boolean>(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  const [numToAnalyze, setNumToAnalyze] = useState<number | 'all'>(MAX_ARTICLES_TO_ANALYZE);
  const [analysisBatchProgressData, setAnalysisBatchProgressData] = useState<AnalysisBatchProgress | null>(null);

  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(false);
  const [autoRefreshLog, setAutoRefreshLog] = useState<string[]>([]);
  const [previousGeoJsonDataForComparison, setPreviousGeoJsonDataForComparison] = useState<GeoJsonOutput | null>(null);
  
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [autoRefreshProgress, setAutoRefreshProgress] = useState<number>(0);
  
  const apiKeyExists = useMemo(() => process.env.API_KEY && process.env.API_KEY !== "MISSING_API_KEY" && process.env.API_KEY !== "", []);

  const articlesToProcessCount = useMemo(() => {
    if (rawArticles.length === 0) return 0;
    if (numToAnalyze === 'all') return rawArticles.length;
    return Math.min(numToAnalyze, rawArticles.length);
  }, [rawArticles, numToAnalyze]);

  const performArticleAnalysisBatch = useCallback(async (
    articlesToAnalyze: RawArticle[],
    onProgressUpdate: (progress: AnalysisBatchProgress) => void
  ): Promise<AnalyzedArticle[]> => {
    const results: AnalyzedArticle[] = [];
    if (!apiKeyExists || articlesToAnalyze.length === 0) {
      if (!apiKeyExists) console.error("Analysis skipped: API Key missing for batch.");
      return results;
    }

    const batchTotal = articlesToAnalyze.length;
    let analysisStartTime = Date.now();
    
    const defaultFailedAnalysisData: AnalysisData = {
      importance: 0.0,
      categorie: 'flash',
      localisation: 'Analyse échouée',
      latitude: null,
      longitude: null,
    };

    for (let i = 0; i < batchTotal; i++) {
      const article = articlesToAnalyze[i];
      const currentAnalyzedCount = i + 1;
      
      let estimatedRemainingStr = "";
      if (i > 0) { 
          const elapsedMs = Date.now() - analysisStartTime;
          const avgTimePerArticleMs = elapsedMs / i; 
          const remainingToAnalyze = batchTotal - i; 
          const estRemMs = remainingToAnalyze * avgTimePerArticleMs;
          estimatedRemainingStr = formatTimeMs(estRemMs);
      }

      onProgressUpdate({
        current: currentAnalyzedCount,
        total: batchTotal,
        estimatedRemaining: estimatedRemainingStr,
        currentTitle: article.title.substring(0, 50) + (article.title.length > 50 ? "..." : "")
      });

      try {
        const analysis = await analyzeArticleContent(article);
        if (analysis) {
          results.push({ ...article, ...analysis });
        } else {
          results.push({ ...article, ...defaultFailedAnalysisData, localisation: 'Données d\'analyse nulles' });
        }
      } catch (err) {
        console.error(`Failed to analyze article ${article.id} in batch:`, err);
        results.push({ ...article, ...defaultFailedAnalysisData, localisation: 'Erreur d\'analyse batch' });
      }
    }
    onProgressUpdate({ current: batchTotal, total: batchTotal, estimatedRemaining: null, currentTitle: "Batch complete." });
    return results;
  }, [apiKeyExists]);


  const handleAddRssSource = async () => {
    const trimmedName = newRssSourceName.trim();
    const trimmedUrl = newRssSourceUrl.trim();

    setError(null); setNotification(null);

    if (!trimmedName || !trimmedUrl) {
      setError("Source Name and URL cannot be empty.");
      return;
    }
    if (!/^https?:\/\//i.test(trimmedUrl)) {
        setError("Please enter a valid URL starting with http:// or https://");
        return;
    }
    if (allRssSources.find(s => s.url === trimmedUrl)) {
      setError("This RSS feed URL already exists.");
      return;
    }

    setIsValidatingUrl(true);
    
    const isValidFeed = await checkUrlIsRssCompliant(trimmedUrl);

    if (isValidFeed) {
      const newSource: RssSource = { name: trimmedName, url: trimmedUrl };
      setAllRssSources(prev => [...prev, newSource]);
      setSelectedRssSourceUrls(prev => [...prev, newSource.url]); 
      setNewRssSourceName("");
      setNewRssSourceUrl("");
      setNotification(`RSS source "${trimmedName}" added successfully.`);
    } else {
      setError(`The URL "${trimmedUrl}" does not appear to be a valid RSS/XML feed or could not be reached. Check browser console for [Debug RSS Validation] messages which might indicate issues with the CORS proxy or content type. Some feeds might have strict CORS policies not bypassable by the public proxy.`);
    }
    setIsValidatingUrl(false);
  };

  const handleRemoveRssSource = (urlToRemove: string) => {
    const sourceName = allRssSources.find(s => s.url === urlToRemove)?.name || "Source";
    setAllRssSources(prev => prev.filter(s => s.url !== urlToRemove));
    setSelectedRssSourceUrls(prev => prev.filter(url => url !== urlToRemove));
    setNotification(`RSS source "${sourceName}" removed.`);
  };

  const handleToggleRssSourceSelection = (url: string) => {
    setSelectedRssSourceUrls(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleFetchRss = useCallback(async () => {
    const sourcesToFetch = allRssSources.filter(s => selectedRssSourceUrls.includes(s.url));
    setError(null); setNotification(null);

    if (sourcesToFetch.length === 0) {
      setError("No RSS sources selected. Please select at least one source to fetch.");
      return;
    }

    setIsLoadingRss(true);
    setAutoRefreshLog([]); 
    try {
      const articles = await fetchAllRssFeeds(sourcesToFetch); // No onSourceProcessed for manual fetch
      setRawArticles(articles);
      setCurrentView(View.RAW_ARTICLES); 
      setAnalyzedArticles([]); 
      setGeoJsonData(null); 
      setAnalysisBatchProgressData(null);
      if (articles.length === 0) {
        setNotification("No articles found in the selected RSS feeds.");
      } else {
        setNotification(`${articles.length} articles fetched. Ready for manual analysis.`);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch RSS feeds. Check console for details.");
    } finally {
      setIsLoadingRss(false);
      setLastRefreshTime(Date.now()); 
      setAutoRefreshProgress(0);
    }
  }, [allRssSources, selectedRssSourceUrls]);

  const handleAnalyzeArticles = useCallback(async () => {
    setError(null); setNotification(null);
    if (!apiKeyExists) {
      setError("Gemini API key is not configured. Analysis cannot proceed.");
      return;
    }
    if (articlesToProcessCount === 0) {
      setError("No articles to analyze. Fetch RSS feeds or adjust selection.");
      return;
    }
    setIsLoadingAnalysis(true);
    setAutoRefreshLog([]);

    const articlesToAnalyzeSlice = rawArticles.slice(0, articlesToProcessCount);
    
    const results = await performArticleAnalysisBatch(
      articlesToAnalyzeSlice,
      (progress) => setAnalysisBatchProgressData(progress)
    );
    
    setAnalyzedArticles(results);
    setGeoJsonData(makeGeoJson(results));
    setCurrentView(View.ANALYZED_ARTICLES);
    setIsLoadingAnalysis(false);
    // setTimeout(() => setAnalysisBatchProgressData(null), 3000); 

    if (results.length === 0 && articlesToProcessCount > 0) { 
        setError("Analysis completed, but no data was successfully analyzed or analysis failed for all items.");
    } else if (results.length > 0) {
        setNotification(`${results.length} articles analyzed successfully.`);
    }
  }, [rawArticles, articlesToProcessCount, apiKeyExists, performArticleAnalysisBatch]); 


  const handleClearData = useCallback(() => {
    setRawArticles([]);
    setAnalyzedArticles([]);
    setGeoJsonData(null);
    setError(null);
    setNotification(null);
    setAnalysisBatchProgressData(null);
    setAutoRefreshLog([]);
    setCurrentView(View.RAW_ARTICLES);
    setLastRefreshTime(Date.now()); 
    setAutoRefreshProgress(0);
  }, []);

  // Auto-refresh logic
  const handleAutoRefresh = useCallback(async () => {
    if (isAutoRefreshing || !apiKeyExists || selectedRssSourceUrls.length === 0) {
      if (!apiKeyExists) setAutoRefreshLog(prev => prev.length > 0 && prev[0].startsWith("Auto-refresh:") ? prev : ["Auto-refresh: Paused (API key missing)."]);
      else if (selectedRssSourceUrls.length === 0) setAutoRefreshLog(prev => prev.length > 0 && prev[0].startsWith("Auto-refresh:") ? prev : ["Auto-refresh: Paused (No sources selected)."]);
      return;
    }

    setIsAutoRefreshing(true);
    setNotification(null); 
    setAnalysisBatchProgressData(null); 
    
    let tempLog: string[] = ["Auto-refresh: Processing sources..."];
    setAutoRefreshLog([...tempLog]);

    const sourcesToFetch = allRssSources.filter(s => selectedRssSourceUrls.includes(s.url));
    const existingRawArticleIds = new Set(rawArticles.map(ar => ar.id));
    let allNewlyFetchedArticlesForAnalysis: RawArticle[] = []; 

    try {
      await fetchAllRssFeeds( // This is an async operation
        sourcesToFetch,
        (sourceName, articlesFromSource, fetchError) => {
          if (fetchError) {
            tempLog.push(`- ${sourceName}: Error fetching (${fetchError.substring(0, 40)}...).`);
          } else {
            const newFromThisSource = articlesFromSource.filter(ar => !existingRawArticleIds.has(ar.id));
            tempLog.push(`- ${sourceName}: Fetched ${articlesFromSource.length}, ${newFromThisSource.length} new.`);
            newFromThisSource.forEach(nfa => { // Avoid duplicates if an article appears in multiple new feeds
                if (!allNewlyFetchedArticlesForAnalysis.find(a => a.id === nfa.id)) {
                    allNewlyFetchedArticlesForAnalysis.push(nfa);
                }
            });
          }
          setAutoRefreshLog([...tempLog]); // Update log progressively
        }
      );
      
      // After all sources processed:
      if (allNewlyFetchedArticlesForAnalysis.length > 0) {
           setRawArticles(prevRaw => {
            const currentRawIds = new Set(prevRaw.map(r => r.id));
            const trulyNewToAppendToGlobalRaw = allNewlyFetchedArticlesForAnalysis.filter(n => !currentRawIds.has(n.id));
            return [...prevRaw, ...trulyNewToAppendToGlobalRaw];
           });
      }

      if (allNewlyFetchedArticlesForAnalysis.length === 0) {
        tempLog.push("Auto-refresh: No new unique articles found across sources.");
        setAutoRefreshLog([...tempLog]);
      } else {
        tempLog.push(`Auto-refresh: Total ${allNewlyFetchedArticlesForAnalysis.length} new articles. Analyzing...`);
        setAutoRefreshLog([...tempLog]);
        
        const analysisResults = await performArticleAnalysisBatch(
            allNewlyFetchedArticlesForAnalysis,
            (progress) => {
                setAnalysisBatchProgressData(progress); 
                // Optionally, update log for analysis phase start/end rather than per article
            }
        );
          
        if (analysisResults.length > 0) {
          const newCombinedAnalyzedArticles = [...analyzedArticles, ...analysisResults];
          setPreviousGeoJsonDataForComparison(geoJsonData); // Capture before update
          const newGeoJson = makeGeoJson(newCombinedAnalyzedArticles);
          setGeoJsonData(newGeoJson);
          setAnalyzedArticles(newCombinedAnalyzedArticles);

          const newFeaturesLinks = new Set(newGeoJson.features.map(f => f.properties.lien));
          const oldFeaturesLinks = new Set(previousGeoJsonDataForComparison?.features.map(f => f.properties.lien) || []);
          let newlyAddedToGeoJsonCount = 0;
          newFeaturesLinks.forEach(link => {
            if (!oldFeaturesLinks.has(link)) newlyAddedToGeoJsonCount++;
          });
          tempLog.push(`GeoJSON: ${newlyAddedToGeoJsonCount} new map entries. Total: ${newGeoJson.features.length}.`);
        } else {
          tempLog.push("Auto-refresh: Analysis yielded no new results for GeoJSON.");
        }
        tempLog.push("Auto-refresh: Cycle complete.");
        setAutoRefreshLog([...tempLog]);
      }
    } catch (err) {
      console.error("Auto-refresh master error:", err);
      tempLog.push("Auto-refresh: A critical error occurred. Check console.");
      setAutoRefreshLog([...tempLog]);
    } finally {
      setIsAutoRefreshing(false);
      setLastRefreshTime(Date.now()); 
      setAutoRefreshProgress(0);
      setTimeout(() => { // Clear detailed analysis progress after a bit
        if(analysisBatchProgressData?.current === analysisBatchProgressData?.total){
            setAnalysisBatchProgressData(null);
        }
      }, 4000); 
    }
  }, [isAutoRefreshing, apiKeyExists, selectedRssSourceUrls, allRssSources, rawArticles, analyzedArticles, geoJsonData, previousGeoJsonDataForComparison, performArticleAnalysisBatch]);


  useEffect(() => {
    let progressIntervalId: number | undefined;
    if (apiKeyExists && selectedRssSourceUrls.length > 0 && !isAutoRefreshing && !(isLoadingAnalysis || isLoadingRss) ) {
      const updateTimer = () => {
        const elapsed = Date.now() - lastRefreshTime;
        let progress = Math.min(100, (elapsed / AUTO_REFRESH_INTERVAL_MS) * 100);
        if (progress < 0) progress = 0; 
        setAutoRefreshProgress(progress);
        if (elapsed >= AUTO_REFRESH_INTERVAL_MS) {
          handleAutoRefresh();
        }
      };
      progressIntervalId = window.setInterval(updateTimer, PROGRESS_UPDATE_INTERVAL_MS);
      updateTimer(); 
    } else if (isAutoRefreshing || isLoadingAnalysis || isLoadingRss) {
      setAutoRefreshProgress(0); 
    } else {
      setAutoRefreshProgress(0);
    }
    return () => {
      if (progressIntervalId) clearInterval(progressIntervalId);
    };
  }, [apiKeyExists, selectedRssSourceUrls, lastRefreshTime, handleAutoRefresh, isAutoRefreshing, isLoadingAnalysis, isLoadingRss]);
  

  const renderView = () => {
    // Render view logic remains similar
    switch (currentView) {
      case View.RAW_ARTICLES:
        return <ArticleTable articles={rawArticles} isAnalyzed={false} />;
      case View.ANALYZED_ARTICLES:
        return <ArticleTable articles={analyzedArticles} isAnalyzed={true} />;
      case View.GEOJSON_OUTPUT:
        return <GeoJsonDisplay geoJsonData={geoJsonData} />;
      default:
        return <p className="text-center text-gray-400">Select a view or fetch data to begin.</p>;
    }
  };

  const TabButton: React.FC<TabButtonProps> = ({ view, label, icon, disabled }) => (
    <button
      onClick={() => { if (!disabled) setCurrentView(view); }}
      disabled={disabled || isAutoRefreshing || isLoadingAnalysis || isLoadingRss}
      aria-current={currentView === view ? "page" : undefined}
      className={`flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors
                  ${currentView === view ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'}
                  ${(disabled || isAutoRefreshing || isLoadingAnalysis || isLoadingRss) ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
      <span className="ml-1 sm:ml-2">{label}</span>
    </button>
  );
  
  const hasDataToClear = rawArticles.length > 0 || analyzedArticles.length > 0 || geoJsonData !== null;

  let analyzeButtonTextDisplay: string;
  const currentArticlesForManualAnalysis = numToAnalyze === 'all' ? rawArticles.length : Math.min(numToAnalyze, rawArticles.length);

  if (isLoadingAnalysis) {
    analyzeButtonTextDisplay = 'Analyzing...';
  } else {
     analyzeButtonTextDisplay = `Analyze (${currentArticlesForManualAnalysis})`;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-200 p-4 sm:p-6 md:p-8">
      <header className="mb-6 sm:mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          News Intelligence Dashboard
        </h1>
        <p className="mt-2 text-md sm:text-lg text-gray-400">
          Fetch, Analyze, and Visualize News Articles
        </p>
        
        <div className="mt-3 space-y-1">
            { apiKeyExists && selectedRssSourceUrls.length > 0 && (
                 <div className="w-full max-w-md mx-auto bg-slate-700/80 rounded-full h-2.5 my-1 shadow-inner">
                    <div
                        className={`bg-sky-500 h-2.5 rounded-full transition-all duration-150 ease-linear ${isAutoRefreshing || isLoadingAnalysis ? 'animate-pulse' : ''}`}
                        style={{ width: `${(isAutoRefreshing || isLoadingAnalysis) ? 100 : autoRefreshProgress}%` }}
                        role="progressbar"
                        aria-valuenow={(isAutoRefreshing || isLoadingAnalysis) ? 100 : autoRefreshProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Time until next auto-refresh"
                        title={(isAutoRefreshing || isLoadingAnalysis) ? "Operation in progress..." : `Next auto-refresh: ${Math.round(AUTO_REFRESH_INTERVAL_MS * (1 - autoRefreshProgress / 100) / 1000)}s`}
                    ></div>
                </div>
            )}
           {autoRefreshLog.length > 0 && (
            <div className="p-2.5 bg-sky-700/50 text-sky-200 text-xs sm:text-sm rounded-md shadow-md max-w-2xl mx-auto">
                <div className="flex items-center font-semibold mb-1">
                    {(isAutoRefreshing && (!analysisBatchProgressData || analysisBatchProgressData.current < analysisBatchProgressData.total) ) ? 
                        <LoadingSpinner size="w-4 h-4" color="text-sky-300"/> : 
                        <RefreshIcon className="w-4 h-4 text-sky-300"/> 
                    }
                    <span className="ml-2">{autoRefreshLog[0]}</span>
                </div>
                {autoRefreshLog.slice(1).map((line, index) => (
                    <p key={index} className="text-xs pl-6 leading-snug"> 
                        {line}
                    </p>
                ))}
            </div>
            )}
        </div>
      </header>

      {error && (
        <div role="alert" aria-live="assertive" className="mb-4 p-4 bg-red-600 text-white rounded-md shadow-lg flex justify-between items-center">
          <p><strong>Error:</strong> {error}</p>
          <button onClick={() => setError(null)} className="ml-2 text-sm font-semibold underline hover:text-red-100">Dismiss</button>
        </div>
      )}
      {notification && (
        <div role="status" aria-live="polite" className="mb-4 p-4 bg-blue-600 text-white rounded-md shadow-lg flex justify-between items-center">
          <p><InfoIcon className="inline w-5 h-5 mr-1" /> {notification}</p>
          <button onClick={() => setNotification(null)} className="ml-2 text-sm font-semibold underline hover:text-blue-100">Dismiss</button>
        </div>
      )}


      <div className="mb-6 p-4 sm:p-6 bg-slate-800 bg-opacity-80 backdrop-blur-md rounded-xl shadow-2xl">
        <h2 className="text-xl sm:text-2xl font-semibold text-purple-300 mb-4 border-b border-slate-700 pb-2">Controls</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-purple-200 mb-3">Manage & Select RSS Sources</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4 border border-slate-700 rounded-md p-3 bg-slate-900/50">
            {allRssSources.length === 0 && <p className="text-sm text-gray-400">No RSS sources configured. Add one below.</p>}
            {allRssSources.map(source => (
              <div key={source.url} className="flex items-center justify-between bg-slate-700 p-2.5 rounded-md shadow">
                <div className="flex items-center flex-grow">
                  <input
                    type="checkbox"
                    id={`rss-checkbox-${source.url}`}
                    checked={selectedRssSourceUrls.includes(source.url)}
                    onChange={() => handleToggleRssSourceSelection(source.url)}
                    className="h-4 w-4 text-indigo-500 border-gray-500 rounded focus:ring-indigo-400 mr-3"
                    aria-labelledby={`rss-label-${source.url}`}
                    disabled={isAutoRefreshing || isLoadingRss || isLoadingAnalysis || isValidatingUrl}
                  />
                  <label htmlFor={`rss-checkbox-${source.url}`} id={`rss-label-${source.url}`} className="text-sm text-gray-200 flex-grow cursor-pointer">
                    <span className="font-medium">{source.name}</span>
                    <span className="block text-xs text-gray-400 truncate" title={source.url}>{source.url}</span>
                  </label>
                </div>
                <button
                  onClick={() => handleRemoveRssSource(source.url)}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-700/50 rounded-full transition-colors"
                  aria-label={`Remove ${source.name} RSS source`}
                  title={`Remove ${source.name}`}
                  disabled={isLoadingRss || isLoadingAnalysis || isValidatingUrl || isAutoRefreshing}
                >
                  <MinusIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2 mt-3">
            <input
              type="text"
              placeholder="Source Name (e.g., My News)"
              value={newRssSourceName}
              onChange={(e) => setNewRssSourceName(e.target.value)}
              className="flex-grow px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm disabled:opacity-60"
              aria-label="New RSS Source Name"
              disabled={isLoadingRss || isLoadingAnalysis || isValidatingUrl || isAutoRefreshing}
            />
            <input
              type="url"
              placeholder="Source URL (https://...)"
              value={newRssSourceUrl}
              onChange={(e) => setNewRssSourceUrl(e.target.value)}
              className="flex-grow px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm disabled:opacity-60"
              aria-label="New RSS Source URL"
              disabled={isLoadingRss || isLoadingAnalysis || isValidatingUrl || isAutoRefreshing}
            />
            <button
              onClick={handleAddRssSource}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
              aria-label="Add new RSS source"
              title="Add new RSS source"
              disabled={isLoadingRss || isLoadingAnalysis || isValidatingUrl || !newRssSourceName.trim() || !newRssSourceUrl.trim() || isAutoRefreshing}
            >
              {isValidatingUrl ? <LoadingSpinner size="w-5 h-5" color="text-white" /> : <PlusIcon className="w-5 h-5" />}
              <span className="ml-1 sm:hidden md:inline">{isValidatingUrl ? "Validating..." : "Add"}</span>
               {!isValidatingUrl && <span className="ml-1 hidden sm:inline md:hidden">Add</span>}
               {isValidatingUrl && <span className="ml-1 hidden sm:inline md:hidden">...</span>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={handleFetchRss}
            disabled={isLoadingRss || isLoadingAnalysis || isValidatingUrl || selectedRssSourceUrls.length === 0 || isAutoRefreshing}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
            aria-busy={isLoadingRss}
          >
            {isLoadingRss ? <LoadingSpinner size="w-5 h-5" color="text-white" /> : <RssIcon className="w-5 h-5"/>}
            <span className="ml-2">{isLoadingRss ? 'Fetching...' : `Fetch (${selectedRssSourceUrls.length}) Feeds`}</span>
          </button>
          
          <div className="space-y-2">
            <div>
              <label htmlFor="numToAnalyzeSelect" className="block text-xs font-medium text-purple-200 mb-1">
                Number to Analyze (Manual):
              </label>
              <select
                id="numToAnalyzeSelect"
                value={String(numToAnalyze)}
                onChange={(e) => {
                  const val = e.target.value;
                  setNumToAnalyze(val === 'all' ? 'all' : parseInt(val, 10));
                }}
                disabled={isLoadingAnalysis || isLoadingRss || isValidatingUrl || rawArticles.length === 0 || isAutoRefreshing}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Select number of articles to analyze manually"
              >
                <option value="5">Top 5</option>
                <option value="10">Top 10</option>
                <option value="20">Top 20</option>
                <option value="50">Top 50</option>
                <option value="all">All ({rawArticles.length})</option>
              </select>
            </div>
            <button
              onClick={handleAnalyzeArticles}
              disabled={isLoadingAnalysis || isLoadingRss || isValidatingUrl || articlesToProcessCount === 0 || isAutoRefreshing || !apiKeyExists}
              className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
              aria-busy={isLoadingAnalysis}
            >
              {isLoadingAnalysis ? <LoadingSpinner size="w-5 h-5" color="text-white" /> : <AnalyzeIcon className="w-5 h-5"/>}
              <span className="ml-2">{analyzeButtonTextDisplay}</span>
            </button>
          </div>

           <button
            onClick={handleClearData}
            disabled={isLoadingRss || isLoadingAnalysis || isValidatingUrl || !hasDataToClear || isAutoRefreshing}
            className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            <ClearIcon className="w-5 h-5"/>
            <span className="ml-2">Clear Data</span>
          </button>
        </div>
        
        {(isLoadingAnalysis || (isAutoRefreshing && analysisBatchProgressData)) && analysisBatchProgressData && analysisBatchProgressData.total > 0 && (
          <div role="status" aria-live="polite" className="mt-4 p-3 bg-slate-700 rounded-md shadow">
            <p className="text-sm text-yellow-300 mb-1 truncate">
              Analyzing: {analysisBatchProgressData.currentTitle || 'article...'} ({analysisBatchProgressData.current} of {analysisBatchProgressData.total})
            </p>
            <div className="w-full bg-slate-600 rounded-full h-2.5 mb-1">
              <div 
                className="bg-yellow-400 h-2.5 rounded-full transition-width duration-150 ease-linear"
                style={{ width: `${(analysisBatchProgressData.current / analysisBatchProgressData.total) * 100}%` }}
              ></div>
            </div>
            {analysisBatchProgressData.estimatedRemaining && (
              <p className="text-xs text-yellow-200 text-right">{analysisBatchProgressData.estimatedRemaining}</p>
            )}
          </div>
        )}

        {rawArticles.length > 0 && !isLoadingRss && !isLoadingAnalysis && !isAutoRefreshing && !analysisBatchProgressData && !autoRefreshLog.length && (
          <p className="mt-3 text-sm text-gray-400 text-center">
            Fetched {rawArticles.length} articles. {analyzedArticles.length === 0 ? (articlesToProcessCount > 0 ? `Ready to manually analyze ${articlesToProcessCount} articles.` : 'Select number to analyze or fetch more articles.') : `${analyzedArticles.length} articles analyzed.`}
          </p>
        )}
         {!apiKeyExists ? (
          <div role="alert" className="mt-4 p-3 bg-yellow-500 text-black rounded-md shadow-md">
            <strong>Warning:</strong> Gemini API key is not configured. Analysis (manual and auto) will not work. Please ensure the <code>API_KEY</code> environment variable is set.
          </div>
        ) : null}
         {rawArticles.length === 0 && !isLoadingRss && !error && !notification && selectedRssSourceUrls.length > 0 && !isAutoRefreshing && !analysisBatchProgressData && !autoRefreshLog.length && (
            <p className="mt-3 text-sm text-gray-400 text-center">
                Click "Fetch ({selectedRssSourceUrls.length}) Feeds" to load news articles, or wait for auto-refresh.
            </p>
        )}
         {selectedRssSourceUrls.length === 0 && !isLoadingRss && !isValidatingUrl && !isAutoRefreshing && !analysisBatchProgressData && !autoRefreshLog.length && (
            <p className="mt-3 text-sm text-orange-400 text-center">
                No RSS sources selected. Please select or add a source to fetch articles. Auto-refresh is paused.
            </p>
         )}
      </div>

      <div className="mb-6 p-3 sm:p-4 bg-slate-800 bg-opacity-80 backdrop-blur-md rounded-xl shadow-2xl">
         <div className="flex flex-wrap gap-2 sm:gap-3 justify-center" role="tablist" aria-label="Data Views">
            <TabButton view={View.RAW_ARTICLES} label="Raw Articles" icon={<RssIcon className="w-4 h-4 sm:w-5 sm:h-5"/>} />
            <TabButton view={View.ANALYZED_ARTICLES} label="Analyzed" icon={<AnalyzeIcon className="w-4 h-4 sm:w-5 sm:h-5"/>} disabled={analyzedArticles.length === 0} />
            <TabButton view={View.GEOJSON_OUTPUT} label="GeoJSON" icon={<GeoJsonIcon className="w-4 h-4 sm:w-5 sm:h-5"/>} disabled={!geoJsonData || geoJsonData.features.length === 0} />
        </div>
      </div>
      
      <main role="tabpanel" className="p-3 sm:p-4 md:p-6 bg-slate-800 bg-opacity-80 backdrop-blur-md rounded-xl shadow-2xl min-h-[300px]">
        {(isLoadingRss && rawArticles.length === 0) || (isLoadingAnalysis && analyzedArticles.length === 0 && !analysisBatchProgressData) ? (
          <div className="flex flex-col justify-center items-center h-64 text-center">
            <LoadingSpinner size="w-12 h-12 sm:w-16 sm:h-16" color="text-purple-400"/>
            <p className="mt-4 text-gray-400">
              {isLoadingRss && "Fetching fresh news..."}
              {isLoadingAnalysis && !analysisBatchProgressData && "Preparing for analysis..."}
            </p>
          </div>
        ) : renderView()}
      </main>

      <footer className="mt-10 sm:mt-12 text-center text-xs sm:text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} News Intelligence Dashboard. Powered by React, Tailwind CSS, and Gemini API.</p>
      </footer>
    </div>
  );
};

export default App;
