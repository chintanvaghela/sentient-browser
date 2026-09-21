import type { Page } from 'playwright-core';

export interface PageLink {
  text: string;
  href: string;
}

export interface PageSummary {
  title: string;
  url: string;
  headings: string[];
  mainText: string;
  interactiveCount: number;
  topLinks: PageLink[];
}

/**
 * Extracts clean, valid HTTP/HTTPS links from the page,
 * ignoring anchors, javascript:void(0), and empty targets.
 */
export async function extractLinks(page: Page): Promise<PageLink[]> {
  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const seen = new Set<string>();
    const results: Array<{ text: string; href: string }> = [];

    for (const a of anchors) {
      const href = (a as HTMLAnchorElement).href;
      const rawHref = a.getAttribute('href') || '';
      const text = (a.textContent || '').trim().replace(/\s+/g, ' ');

      if (
        href &&
        !rawHref.startsWith('javascript:') &&
        !rawHref.startsWith('#') &&
        !seen.has(href) &&
        text.length > 0
      ) {
        seen.add(href);
        results.push({ text: text.slice(0, 100), href });
      }
    }
    return results;
  });
}

/**
 * Extracts tabular data from HTML table elements into an array of JSON row objects.
 */
export async function extractTable(page: Page, tableSelector?: string): Promise<Array<Record<string, string>>> {
  return page.evaluate((sel) => {
    const table = sel ? document.querySelector(sel) : document.querySelector('table');
    if (!table) return [];

    const headers: string[] = [];
    const thElements = Array.from(table.querySelectorAll('th'));

    if (thElements.length > 0) {
      for (const th of thElements) {
        headers.push((th.textContent || '').trim().toLowerCase().replace(/\s+/g, '_') || `col_${headers.length}`);
      }
    }

    const rows: Array<Record<string, string>> = [];
    const trElements = Array.from(table.querySelectorAll('tr'));

    for (const tr of trElements) {
      const cells = Array.from(tr.querySelectorAll('td'));
      if (cells.length === 0) continue;

      const rowObj: Record<string, string> = {};
      cells.forEach((td, idx) => {
        const header = headers[idx] || `col_${idx}`;
        rowObj[header] = (td.textContent || '').trim();
      });
      rows.push(rowObj);
    }

    return rows;
  }, tableSelector);
}

/**
 * Extracts list items (ul, ol) into an array of clean text strings.
 */
export async function extractList(page: Page, listSelector?: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const list = sel ? document.querySelector(sel) : document.querySelector('ul, ol');
    if (!list) return [];

    const items: string[] = [];
    const liElements = Array.from(list.querySelectorAll('li'));
    for (const li of liElements) {
      const text = (li.textContent || '').trim().replace(/\s+/g, ' ');
      if (text) items.push(text);
    }
    return items;
  }, listSelector);
}

/**
 * Extracts a concise semantic summary of the page:
 * title, primary headings, core content text, and top links.
 */
export async function extractSummary(page: Page): Promise<PageSummary> {
  return page.evaluate(() => {
    const title = document.title;
    const url = window.location.href;

    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map((h) => (h.textContent || '').trim().replace(/\s+/g, ' '))
      .filter((t) => t.length > 0)
      .slice(0, 10);

    // Extract primary text paragraphs (excluding footer, header, scripts)
    const paragraphs = Array.from(document.querySelectorAll('main p, article p, p'))
      .map((p) => (p.textContent || '').trim().replace(/\s+/g, ' '))
      .filter((t) => t.length > 20)
      .slice(0, 8);

    const mainText = paragraphs.join('\n\n');

    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const topLinks: Array<{ text: string; href: string }> = [];
    const seen = new Set<string>();

    for (const a of anchors) {
      const href = (a as HTMLAnchorElement).href;
      const rawHref = a.getAttribute('href') || '';
      const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
      if (
        href &&
        !rawHref.startsWith('javascript:') &&
        !rawHref.startsWith('#') &&
        !seen.has(href) &&
        text.length > 0
      ) {
        seen.add(href);
        topLinks.push({ text: text.slice(0, 80), href });
        if (topLinks.length >= 10) break;
      }
    }

    const interactiveCount = document.querySelectorAll('button, a, input, select, textarea').length;

    return {
      title,
      url,
      headings,
      mainText,
      interactiveCount,
      topLinks
    };
  });
}
