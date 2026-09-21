import type { SentientPage } from '../browser/chromium.js';
import { SitePlugin } from './types.js';

export class PluginRegistry {
  private static plugins: Map<string, SitePlugin> = new Map();

  static register(plugin: SitePlugin): void {
    this.plugins.set(plugin.name.toLowerCase(), plugin);
  }

  static get(name: string): SitePlugin | undefined {
    return this.plugins.get(name.toLowerCase());
  }

  static getForUrl(url: string): SitePlugin[] {
    const matched: SitePlugin[] = [];
    for (const plugin of this.plugins.values()) {
      if (!plugin.domainPattern) {
        matched.push(plugin);
        continue;
      }
      if (typeof plugin.domainPattern === 'string' && url.includes(plugin.domainPattern)) {
        matched.push(plugin);
      } else if (plugin.domainPattern instanceof RegExp && plugin.domainPattern.test(url)) {
        matched.push(plugin);
      }
    }
    return matched;
  }

  static bind(page: SentientPage, pluginName: string): any {
    const plugin = this.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not registered: "${pluginName}"`);
    }
    return plugin.create(page);
  }
}
