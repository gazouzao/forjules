
import React from 'react';
import { RawArticle, AnalyzedArticle } from '../types';

interface ArticleTableProps {
  articles: (RawArticle | AnalyzedArticle)[];
  isAnalyzed: boolean;
}

const ArticleTable: React.FC<ArticleTableProps> = ({ articles, isAnalyzed }) => {
  if (articles.length === 0) {
    return <p className="text-gray-400 p-4 text-center">No articles to display. Fetch some RSS feeds first!</p>;
  }

  return (
    <div className="overflow-x-auto bg-slate-800 shadow-xl rounded-lg custom-scrollbar scrollbar-thin">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-700/50 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider whitespace-nowrap">Image</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider whitespace-nowrap">Title</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider whitespace-nowrap">Source</th>
            {isAnalyzed && (
              <>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider whitespace-nowrap">Importance</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider whitespace-nowrap">Location</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider whitespace-nowrap">Category</th>
              </>
            )}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider whitespace-nowrap">Pub Date</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider whitespace-nowrap">Link</th>
          </tr>
        </thead>
        <tbody className="bg-slate-800 divide-y divide-slate-700">
          {articles.map((article) => (
            <tr key={article.id} className="hover:bg-slate-700/70 transition-colors duration-150">
              <td className="px-4 py-4 whitespace-nowrap">
                {(article as RawArticle).imageUrl ? (
                  <img
                    src={(article as RawArticle).imageUrl}
                    alt={`Preview for ${article.title.substring(0,30)}`}
                    className="w-28 h-20 object-cover rounded border border-slate-600 bg-slate-700 shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; 
                      target.src = `https://via.placeholder.com/120x80.png?text=No+Image`; 
                      target.alt = "Image failed to load or not available";
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-28 h-20 flex items-center justify-center bg-slate-700 rounded border border-slate-600 text-slate-500 text-xs shadow-sm">
                    No Image
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-200 max-w-sm break-words align-top">{article.title}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 align-top">{article.source}</td>
              {isAnalyzed && (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-center align-top">
                    {typeof (article as AnalyzedArticle).importance === 'number' ? ((article as AnalyzedArticle).importance).toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 max-w-xs break-words align-top">{(article as AnalyzedArticle).localisation || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 align-top">{(article as AnalyzedArticle).categorie || 'N/A'}</td>
                </>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 align-top">{article.pubDate || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-sky-400 hover:text-sky-300 hover:underline align-top">
                <a href={article.link} target="_blank" rel="noopener noreferrer" title={article.link}>
                  Read Article &rarr;
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ArticleTable;
