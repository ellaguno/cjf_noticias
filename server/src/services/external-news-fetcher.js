const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { query, run, get } = require('../../database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('external-news-fetcher');

class ExternalNewsFetcher {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    this.storagePath = path.join(__dirname, '../../../storage/images/external');
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async downloadImage(imageUrl, sourceName) {
    if (!imageUrl) return null;

    try {
      const url = new URL(imageUrl);
      const filename = `${Date.now()}_${path.basename(url.pathname)}`;
      const localPath = path.join(this.storagePath, filename);
      const publicPath = `/storage/images/external/${filename}`;

      const client = imageUrl.startsWith('https') ? https : http;

      const response = await new Promise((resolve, reject) => {
        client.get(imageUrl, (res) => {
          if (res.statusCode === 200) {
            const fileStream = fs.createWriteStream(localPath);
            res.pipe(fileStream);
            fileStream.on('finish', () => resolve({ success: true, path: publicPath }));
            fileStream.on('error', (err) => reject(new Error(`Failed to write image to disk: ${err.message}`)))
          } else {
            reject(new Error(`Failed to download image, status code: ${res.statusCode}`));
          }
        }).on('error', (err) => reject(new Error(`Failed to download image: ${err.message}`)));
      });

      return response.path;
    } catch (error) {
      logger.error(`Error downloading image from ${imageUrl}:`, error);
      return null;
    }
  }

  // Fetch content from URL
  async fetchUrl(url, responseType = 'text') {
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
          'Accept': responseType === 'text' ? 'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8' : 'application/rss+xml, application/xml, text/xml, application/json'
        },
        timeout: 60000
      };

      const req = client.request(options, (res) => {
        let data = [];
        
        res.on('data', (chunk) => {
          data.push(chunk);
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (responseType === 'text') {
              resolve(Buffer.concat(data).toString());
            } else {
              resolve(Buffer.concat(data));
            }
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

  // Extract the best image from an HTML page
  extractBestImage(htmlContent, articleUrl) {
    const $ = cheerio.load(htmlContent);
    let imageUrl = null;

    // 1. Try Open Graph image
    imageUrl = $('meta[property="og:image"]').attr('content');
    if (imageUrl) return imageUrl;

    // 2. Try Twitter Card image
    imageUrl = $('meta[name="twitter:image"]').attr('content');
    if (imageUrl) return imageUrl;

    // 3. Look for images within the article content
    const articleImages = $('article img, .entry-content img, .post-content img');
    let bestImage = null;
    let bestScore = -1;

    articleImages.each((i, el) => {
      const src = $(el).attr('src');
      if (!src) return;

      // Basic validation for image URLs
      if (!src.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) return;

      // Avoid small images (icons, spacers)
      const width = parseInt($(el).attr('width'), 10);
      const height = parseInt($(el).attr('height'), 10);
      if (width > 0 && height > 0 && (width < 100 || height < 100)) return;

      // Avoid common non-content images
      if (src.includes('logo') || src.includes('icon') || src.includes('avatar') || src.includes('ads')) return;

      // Calculate a score based on size (if available) and position
      let score = 0;
      if (width && height) {
        score = width * height; // Prioritize larger images
      }

      // Prioritize images closer to the top of the content
      score -= i * 100; 

      if (score > bestScore) {
        bestScore = score;
        bestImage = src;
      }
    });

    if (bestImage) return bestImage;

    // 4. Fallback to any image on the page (larger than a threshold)
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      if (!src) return;
      if (!src.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) return;

      const width = parseInt($(el).attr('width'), 10);
      const height = parseInt($(el).attr('height'), 10);
      if (width > 0 && height > 0 && (width < 200 || height < 200)) return; // Larger threshold for general images

      if (src.includes('logo') || src.includes('icon') || src.includes('avatar') || src.includes('ads')) return;

      if (!imageUrl) imageUrl = src; // Take the first reasonably sized image
    });

    return imageUrl;
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

      if (!title || !link) {
        return null;
      }

      return {
        title: this.cleanText(title),
        content: this.cleanText(content || description || ''),
        summary: this.cleanText(description || '').substring(0, 500),
        source_url: link,
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
      
      const processedArticles = [];
      for (const article of articles) {
        let imageUrl = null;
        if (article.source_url) {
          try {
            const articleHtml = await this.fetchUrl(article.source_url, 'text');
            imageUrl = this.extractBestImage(articleHtml, article.source_url);
          } catch (htmlError) {
            logger.warn(`Could not fetch article HTML for ${article.source_url}: ${htmlError.message}`);
          }
        }

        const downloadedImageUrl = await this.downloadImage(imageUrl, source.name);
        processedArticles.push({
          ...article,
          source: source.name,
          external_source_id: source.id,
          section_id: 'ultimas-noticias',
          image_url: downloadedImageUrl
        });
      }

      logger.info(`Fetched and processed ${processedArticles.length} articles from ${source.name}`);
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