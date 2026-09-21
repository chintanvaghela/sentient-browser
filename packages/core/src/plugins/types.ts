import type { SentientPage } from '../browser/chromium.js';

export interface SitePlugin<T = any> {
  name: string;
  domainPattern?: RegExp | string;
  create(page: SentientPage): T;
}
