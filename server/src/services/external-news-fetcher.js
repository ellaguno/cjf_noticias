const https = require('https');
const http = require('http');
const { URL } = require('url');
const { query, run, get } = require('../../database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('external-news-fetcher');

class ExternalNewsFetcher {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  }

  // Fetch content from URL
  async fetchUrl(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/rss+xml, application/xml, text/xml, application/json'
        },
        timeout: 30000
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  // Parse RSS feed
  parseRssFeed(xmlContent) {
    const articles = [];
    
    try {
      // Simple XML parsing for RSS feeds
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      const items = xmlContent.match(itemRegex) || [];
      
      for (const item of items) {
        const article = this.parseRssItem(item);
        if (article) {
          articles.push(article);
        }
      }
    } catch (error) {
      logger.error('Error parsing RSS feed:', error);
    }
    
    return articles;
  }

  // Parse individual RSS item
  parseRssItem(itemXml) {
    try {
      const title = this.extractXmlContent(itemXml, 'title');
      const link = this.extractXmlContent(itemXml, 'link');
      const description = this.extractXmlContent(itemXml, 'description');
      const pubDate = this.extractXmlContent(itemXml, 'pubDate');
      const content = this.extractXmlContent(itemXml, 'content:encoded') || 
                     this.extractXmlContent(itemXml, 'content') || 
                     description;

      // Extract image from description or enclosure
      let imageUrl = this.extractImageFromContent(content || description);
      if (!imageUrl) {
        const enclosure = this.extractXmlContent(itemXml, 'enclosure');
        if (enclosure && enclosure.includes('image')) {
          const urlMatch = enclosure.match(/url="([^"]*)"/) || enclosure.match(/url='([^']*)'/);
          if (urlMatch) imageUrl = urlMatch[1];
        }
      }

      if (!title || !link) {
        return null;
      }

      return {
        title: this.cleanText(title),
        content: this.cleanText(content || description || ''),
        summary: this.cleanText(description || '').substring(0, 500),
        source_url: link,
        image_url: imageUrl,
        publication_date: this.parseDate(pubDate)
      };
    } catch (error) {
      logger.error('Error parsing RSS item:', error);
      return null;
    }
  }

  // Extract content from XML tags
  extractXmlContent(xml, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
    
    let match = xml.match(cdataRegex);
    if (!match) {
      match = xml.match(regex);
    }
    
    return match ? match[1].trim() : null;
  }

  // Extract image URL from HTML content
  extractImageFromContent(content) {
    if (!content) return null;
    
    const imgRegex = /<img[^>]+src="([^"]+)"/i;
    const match = content.match(imgRegex);
    
    if (match) {
      const src = match[1];
      // Only return if it looks like a valid image URL
      if (src.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
        return src;
      }
    }
    
    return null;
  }

  // Clean HTML and extra whitespace from text
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Parse publication date
  parseDate(dateString) {
    if (!dateString) {
      return new Date().toISOString().split('T')[0];
    }
    
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      return new Date().toISOString().split('T')[0];
    }
  }

  // Generate fallback image for articles without images
  generateFallbackImage(source, title) {
    // Return gradient image URL or source logo
    if (source.logo_url) {
      return source.logo_url;
    }
    
    // Generate a gradient image URL based on source name
    const colors = this.getColorsForSource(source.name);
    return `https://via.placeholder.com/400x200/${colors.bg}/${colors.text}?text=${encodeURIComponent(source.name)}`;
  }

  // Get colors for gradient based on source name
  getColorsForSource(sourceName) {
    const hash = this.simpleHash(sourceName);
    const hue = hash % 360;
    
    return {
      bg: this.hslToHex(hue, 60, 70),
      text: this.hslToHex(hue, 60, 20)
    };
  }

  // Simple hash function
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Convert HSL to Hex
  hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `${f(0)}${f(8)}${f(4)}`;
  }

  // Fetch articles from a specific source
  async fetchFromSource(source) {
    try {
      logger.info(`Fetching articles from ${source.name}`);
      
      if (!source.rss_url) {
        logger.warn(`No RSS URL configured for ${source.name}`);
        return [];
      }

      const content = await this.fetchUrl(source.rss_url);
      const articles = this.parseRssFeed(content);
      
      // Add source information and handle images
      const processedArticles = articles.map(article => ({
        ...article,
        source: source.name,
        external_source_id: source.id,
        section_id: 'ultimas-noticias', // Default section for external news
        image_url: article.image_url || this.generateFallbackImage(source, article.title)
      }));

      logger.info(`Fetched ${processedArticles.length} articles from ${source.name}`);
      return processedArticles;
      
    } catch (error) {
      logger.error(`Error fetching from ${source.name}:`, error);
      return [];
    }
  }

  // Save articles to database
  async saveArticles(articles) {
    const savedArticles = [];
    
    for (const article of articles) {
      try {
        // Check if article already exists by URL
        const existing = await get(
          'SELECT id FROM ARTICLE WHERE source_url = ?',
          [article.source_url]
        );

        if (existing) {
          logger.debug(`Article already exists: ${article.title}`);
          continue;
        }

        // Insert new article
        const result = await run(`
          INSERT INTO ARTICLE (
            title, content, summary, source, source_url, image_url, 
            external_source_id, section_id, publication_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          article.title,
          article.content,
          article.summary,
          article.source,
          article.source_url,
          article.image_url,
          article.external_source_id,
          article.section_id,
          article.publication_date
        ]);

        const savedArticle = await get('SELECT * FROM ARTICLE WHERE id = ?', [result.lastID]);
        savedArticles.push(savedArticle);
        
        logger.debug(`Saved article: ${article.title}`);
        
      } catch (error) {
        logger.error(`Error saving article "${article.title}":`, error);
      }
    }
    
    return savedArticles;
  }

  // Fetch articles from all active sources
  async fetchFromAllSources() {
    try {
      const sources = await query('SELECT * FROM EXTERNAL_SOURCES WHERE is_active = 1');
      
      if (sources.length === 0) {
        logger.info('No active external sources found');
        return [];
      }

      const allArticles = [];
      
      for (const source of sources) {
        const articles = await this.fetchFromSource(source);
        allArticles.push(...articles);
        
        // Update last fetch time
        await run(
          'UPDATE EXTERNAL_SOURCES SET last_fetch = CURRENT_TIMESTAMP WHERE id = ?',
          [source.id]
        );
      }

      // Save all articles to database
      const savedArticles = await this.saveArticles(allArticles);
      
      logger.info(`Fetched ${allArticles.length} articles, saved ${savedArticles.length} new articles`);
      return savedArticles;
      
    } catch (error) {
      logger.error('Error fetching from all sources:', error);
      throw error;
    }
  }
}

module.exports = ExternalNewsFetcher;