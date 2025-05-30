import { scrapeArticleContent } from './articleScraper'; // Adjust path if necessary
import axios from 'axios';

// Mock axios at the top level
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('scrapeArticleContent', () => {
  beforeEach(() => {
    // Reset any previous mock implementations and calls
    mockedAxios.get.mockReset();
  });

  test('successfully scrapes content with og:image and simple article structure', async () => {
    const htmlContent = `
      <html>
        <head>
          <title>Test Article</title>
          <meta property="og:image" content="https://example.com/og-image.jpg" />
        </head>
        <body>
          <article>
            <h1>Main Title</h1>
            <p>This is the first paragraph of the article. It contains some text.</p>
            <p>This is the second paragraph, with more details.</p>
            <script>console.log('ignored')</script>
            <style>.ignored { color: red; }</style>
            <footer>Copyright 2024</footer>
          </article>
          <nav>Navigation</nav>
        </body>
      </html>
    `;
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: htmlContent,
      headers: { 'content-type': 'text/html' },
    });

    const result = await scrapeArticleContent('https://example.com/article1');

    // Expected text: H1 + P + P, scripts, style, footer, nav removed by sectionsToRemove
    // Cheerio's text() method concatenates text nodes. Order might depend on structure.
    // Whitespace normalization is done by the scraper.
    expect(result.textContent).toBe('Main Title This is the first paragraph of the article. It contains some text. This is the second paragraph, with more details.');
    expect(result.mainImageUrl).toBe('https://example.com/og-image.jpg');
  });

  test('resolves relative image URL correctly', async () => {
    const htmlContent = `
      <html>
        <head>
          <title>Relative Image Test</title>
          <meta property="og:image" content="/relative-image.jpg" />
        </head>
        <body>
          <article><p>Some text</p></article>
        </body>
      </html>
    `;
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: htmlContent,
      headers: { 'content-type': 'text/html' },
    });

    const result = await scrapeArticleContent('https://example.com/article2');
    expect(result.mainImageUrl).toBe('https://example.com/relative-image.jpg');
  });

  test('scrapes text from complex body structure with no image', async () => {
    const htmlContent = `
      <html>
        <body>
          <header>Site Header</header>
          <div class="article-body">
            <p><span>Intro text.</span> More intro.</p>
            <p>Main content here. <strong>Important stuff.</strong></p>
            <aside>Related links</aside>
          </div>
          <div class="another-content-block">This should be ignored due to selector preference or if article-body is sufficient.</div>
          <footer>Site Footer</footer>
        </body>
      </html>
    `;
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: htmlContent,
      headers: { 'content-type': 'text/html' },
    });

    const result = await scrapeArticleContent('https://example.com/article3');
    // Expecting text from div.article-body, with header, aside, footer removed by sectionsToRemove
    expect(result.textContent).toBe('Intro text. More intro. Main content here. Important stuff.');
    expect(result.mainImageUrl).toBeNull();
  });

  test('handles network error during fetch', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    const result = await scrapeArticleContent('https://example.com/article-error');
    expect(result.textContent).toBeNull();
    expect(result.mainImageUrl).toBeNull();
  });

  test('handles non-200 status code from server', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 404,
      data: 'Not Found',
      headers: { 'content-type': 'text/html' },
    });

    const result = await scrapeArticleContent('https://example.com/article-404');
    expect(result.textContent).toBeNull();
    expect(result.mainImageUrl).toBeNull();
  });

  test('handles invalid og:image URL gracefully', async () => {
    const htmlContent = `
      <html>
        <head>
          <title>Invalid Image URL</title>
          <meta property="og:image" content="
          http://[::1]:namedport" />
        </head>
        <body><article><p>Content</p></article></body>
      </html>
    `;
    // The above URL is invalid and will throw in new URL()
    mockedAxios.get.mockResolvedValue({
        status: 200,
        data: htmlContent,
        headers: { 'content-type': 'text/html' }
    });

    const result = await scrapeArticleContent('https://example.com/invalid-image-url');
    expect(result.mainImageUrl).toBeNull();
    expect(result.textContent).toBe('Content');
  });

  test('uses body as fallback if no specific content section yields enough text', async () => {
    const htmlContent = `
      <html>
        <body>
          <div class="very-short-content"><p>Too short.</p></div>
          Some other text directly in body. This part makes it long enough.
          And more text to ensure the body is chosen.
          This is a test case for the body fallback logic when preferred selectors
          do not find enough content or are missing. The threshold is 200 chars.
        </body>
      </html>
    `;
    mockedAxios.get.mockResolvedValue({
        status: 200,
        data: htmlContent,
        headers: { 'content-type': 'text/html' }
    });
    const result = await scrapeArticleContent('https://example.com/body-fallback');
    // The text from div.very-short-content will be there, plus the body text.
    // sectionsToRemove (like script, style) would be stripped from body too.
    // The exact text depends on how Cheerio processes a body clone after removing sections.
    // The key is that it's not just "Too short."
    expect(result.textContent?.length).toBeGreaterThan(50); // Check it's not empty or just the short part
    expect(result.textContent).toContain("Too short. Some other text directly in body.");
    expect(result.textContent).toContain("The threshold is 200 chars.");
  });

  test('returns null for image and text if HTML is empty or lacks structure', async () => {
    const htmlContent = `<html><head></head><body></body></html>`;
    mockedAxios.get.mockResolvedValue({
        status: 200,
        data: htmlContent,
        headers: { 'content-type': 'text/html' }
    });
    const result = await scrapeArticleContent('https://example.com/empty');
    expect(result.textContent).toBeNull(); // Because "" after trim is < 200 chars, and no good selectors.
    expect(result.mainImageUrl).toBeNull();
  });

});

describe('Image Extraction Logic', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  test('extracts twitter:image when og:image is missing', async () => {
    const htmlContent = `
      <html><head><title>Twitter Image Test</title>
        <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
      </head><body><article><p>Text</p></article></body></html>`;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/twitter-img-test');
    expect(result.mainImageUrl).toBe('https://example.com/twitter-image.jpg');
  });

  test('extracts schema.org image (ImageObject) when others are missing', async () => {
    const htmlContent = `
      <html><head><title>Schema ImageObject Test</title></head>
      <body><article><p>Text</p></article>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "image": {
              "@type": "ImageObject",
              "url": "https://example.com/schema-image.jpg"
            }
          }
        </script>
      </body></html>`;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/schema-imgobj-test');
    expect(result.mainImageUrl).toBe('https://example.com/schema-image.jpg');
  });

  test('extracts schema.org image (string URL) when others are missing', async () => {
    const htmlContent = `
      <html><head><title>Schema String URL Test</title></head>
      <body><article><p>Text</p></article>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "image": "https://example.com/schema-string-image.jpg"
          }
        </script>
      </body></html>`;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/schema-string-test');
    expect(result.mainImageUrl).toBe('https://example.com/schema-string-image.jpg');
  });

  test('extracts schema.org image (array of images, takes first valid)', async () => {
    const htmlContent = `
      <html><head><title>Schema Array Test</title></head>
      <body><article><p>Text</p></article>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "image": [
              { "@type": "ImageObject", "url": "https://example.com/schema-array-image.jpg" },
              { "@type": "ImageObject", "url": "https://example.com/another-image.jpg" }
            ]
          }
        </script>
      </body></html>`;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/schema-array-test');
    expect(result.mainImageUrl).toBe('https://example.com/schema-array-image.jpg');
  });

  test('extracts schema.org image (from @graph array)', async () => {
    const htmlContent = `
      <html><head><title>Schema Graph Test</title></head>
      <body><article><p>Text</p></article>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "name": "Some WebPage"
              },
              {
                "@type": "NewsArticle",
                "headline": "Article Headline",
                "image": { "@type": "ImageObject", "url": "https://example.com/schema-graph-image.jpg" }
              }
            ]
          }
        </script>
      </body></html>`;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/schema-graph-test');
    expect(result.mainImageUrl).toBe('https://example.com/schema-graph-image.jpg');
  });

  test('prefers og:image over twitter:image and schema.org', async () => {
    const htmlContent = `
      <html><head><title>Preference Test</title>
        <meta property="og:image" content="https://example.com/og-preferred.jpg">
        <meta name="twitter:image" content="https://example.com/twitter-not-preferred.jpg">
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","image":"https://example.com/schema-not-preferred.jpg"}</script>
      </head><body><article><p>Text</p></article></body></html>`;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/pref-test1');
    expect(result.mainImageUrl).toBe('https://example.com/og-preferred.jpg');
  });

  test('prefers twitter:image over schema.org when og:image is missing', async () => {
    const htmlContent = `
      <html><head><title>Preference Test</title>
        <meta name="twitter:image" content="https://example.com/twitter-preferred.jpg">
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","image":"https://example.com/schema-not-preferred.jpg"}</script>
      </head><body><article><p>Text</p></article></body></html>`;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/pref-test2');
    expect(result.mainImageUrl).toBe('https://example.com/twitter-preferred.jpg');
  });

  test('resolves relative twitter:image URL', async () => {
    const htmlContent = `
      <html><head><title>Relative Twitter Image</title>
        <meta name="twitter:image" content="../images/twitter-relative.png">
      </head><body><article><p>Text</p></article></body></html>`;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/articles/post1');
    expect(result.mainImageUrl).toBe('https://example.com/images/twitter-relative.png');
  });

  test('resolves relative schema.org image URL', async () => {
    const htmlContent = `
      <html><head><title>Relative Schema Image</title></head>
      <body><article><p>Text</p></article>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","image":"/img/schema-relative.jpeg"}</script>
      </body></html>`;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/page');
    expect(result.mainImageUrl).toBe('https://example.com/img/schema-relative.jpeg');
  });
});

describe('Text Cleaning Specifics', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  test('removes nested unwanted elements from selected article content', async () => {
    const htmlContent = `
      <html><body>
        <article class="article-body">
          <p>Main paragraph 1.</p>
          <aside>This is a related link box, it should be removed by sectionsToRemove.</aside>
          <p>Main paragraph 2.</p>
          <script>alert('bad stuff should be removed by sectionsToRemove')</script>
          <div><form><input type="text" value="form should be removed"></form></div>
          <p>Main paragraph 3 with <a href="#">a link</a>.</p>
        </article>
      </body></html>
    `;
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/nested-clean');
    // The text from aside, script, form should be gone. Link text should remain.
    expect(result.textContent).toBe('Main paragraph 1. Main paragraph 2. Main paragraph 3 with a link.');
  });

  test('text extraction handles case where a preferred selector is empty but a later one has content', async () => {
    const htmlContent = `
      <html><body>
        <article class="article-body"></article>
        <div class="post-content">
            <p>This is the actual content.</p>
            <p>More text here.</p>
        </div>
      </body></html>
    `;
    // 'article[class*="body"]' is tried before 'div[class*="post-content"]'
    // '.article-body' is empty, so it should fall through to '.post-content'
    mockedAxios.get.mockResolvedValue({ status: 200, data: htmlContent, headers: { 'content-type': 'text/html' } });
    const result = await scrapeArticleContent('https://example.com/selector-fallback');
    expect(result.textContent).toBe('This is the actual content. More text here.');
  });
});
