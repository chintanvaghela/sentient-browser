import type { SentientPage } from '../../browser/chromium.js';
import { SitePlugin } from '../types.js';

export interface HNStory {
  title: string;
  url: string;
  points?: string;
  author?: string;
}

export class HackerNewsHelper {
  constructor(private page: SentientPage) {}

  async getTopStories(limit: number = 10): Promise<HNStory[]> {
    const stories: HNStory[] = await this.page.page.evaluate((max) => {
      const rows = Array.from(document.querySelectorAll('tr.athing'));
      const results: HNStory[] = [];

      for (let i = 0; i < Math.min(rows.length, max); i++) {
        const tr = rows[i];
        const titleEl = tr.querySelector('span.titleline > a') as HTMLAnchorElement;
        if (!titleEl) continue;

        const subtext = tr.nextElementSibling;
        const points = subtext?.querySelector('.score')?.textContent || '0 points';
        const author = subtext?.querySelector('.hnuser')?.textContent || 'anonymous';

        results.push({
          title: titleEl.textContent || '',
          url: titleEl.href || '',
          points,
          author
        });
      }
      return results;
    }, limit);

    return stories;
  }
}

export const HackerNewsPlugin: SitePlugin<HackerNewsHelper> = {
  name: 'hackernews',
  domainPattern: 'news.ycombinator.com',
  create(page: SentientPage) {
    return new HackerNewsHelper(page);
  }
};
