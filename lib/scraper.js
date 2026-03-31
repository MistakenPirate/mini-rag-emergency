import * as cheerio from 'cheerio';

// Fetch a URL and extract readable text content.
export async function scrapeUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('script, style, nav, header, footer, iframe, noscript').remove();

  // Get text from body
  const text = $('body').text();

  // Clean up whitespace
  return text.replace(/\s+/g, ' ').trim();
}
