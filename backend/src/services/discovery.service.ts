import axios from 'axios';
import { chromium, Browser, Page } from 'playwright';
import { prisma } from '../server';
import logger from '../utils/logger';
import { Platform } from '@prisma/client';

export interface BusinessInfo {
  name: string;
  gpsLatitude: number;
  gpsLongitude: number;
  phone?: string;
  website?: string;
  address?: string;
  city: string;
  country: string;
}

export interface DiscoveredSource {
  platform: Platform;
  url: string;
  accountId?: string;
  username?: string;
}

export class DiscoveryService {
  private static browser: Browser | null = null;

  /**
   * Initialize Playwright browser
   */
  private static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Discover review sources for a business using Google Places
   */
  static async discoverSources(businessInfo: BusinessInfo, industry: string): Promise<DiscoveredSource[]> {
    try {
      logger.info('Discovering sources for:', businessInfo.name);
      const sources: DiscoveredSource[] = [];

      // 1. Google Places lookup
      const googlePlace = await this.findGooglePlace(businessInfo);
      if (googlePlace) {
        sources.push({
          platform: 'GOOGLE',
          url: googlePlace.url,
          accountId: googlePlace.placeId,
        });
      }

      // 2. Search for social media and review sites
      const searchResults = await this.searchForBusiness(businessInfo, industry);
      sources.push(...searchResults);

      // 3. Industry-specific sources
      const industrySources = await this.getIndustrySpecificSources(businessInfo, industry);
      sources.push(...industrySources);

      logger.info(`Discovered ${sources.length} sources for ${businessInfo.name}`);
      return sources;
    } catch (error) {
      logger.error('Error discovering sources:', error);
      return [];
    }
  }

  /**
   * Find Google Place by name and location
   */
  private static async findGooglePlace(business: BusinessInfo): Promise<{ placeId: string; url: string } | null> {
    try {
      const query = `${business.name} ${business.city} ${business.country}`;
      
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
        params: {
          input: query,
          inputtype: 'textquery',
          fields: 'place_id,name,formatted_address',
          locationbias: `point:${business.gpsLatitude},${business.gpsLongitude}`,
          key: process.env.GOOGLE_PLACES_API_KEY,
        },
      });

      if (response.data.candidates && response.data.candidates.length > 0) {
        const place = response.data.candidates[0];
        return {
          placeId: place.place_id,
          url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error finding Google Place:', error);
      return null;
    }
  }

  /**
   * Search for business on various platforms
   */
  private static async searchForBusiness(business: BusinessInfo, industry: string): Promise<DiscoveredSource[]> {
    const sources: DiscoveredSource[] = [];
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Search Facebook
      const fbUrl = await this.searchFacebook(page, business);
      if (fbUrl) sources.push({ platform: 'FACEBOOK', url: fbUrl });

      // Search Yelp (if applicable)
      if (['restaurant', 'cafe', 'bar', 'hotel'].includes(industry.toLowerCase())) {
        const yelpUrl = await this.searchYelp(page, business);
        if (yelpUrl) sources.push({ platform: 'YELP', url: yelpUrl });
      }

      // Search TripAdvisor (for hospitality)
      if (['hotel', 'restaurant', 'attraction'].includes(industry.toLowerCase())) {
        const taUrl = await this.searchTripAdvisor(page, business);
        if (taUrl) sources.push({ platform: 'TRIPADVISOR', url: taUrl });
      }

    } catch (error) {
      logger.error('Error searching for business:', error);
    } finally {
      await page.close();
    }

    return sources;
  }

  /**
   * Get industry-specific review sources
   */
  private static async getIndustrySpecificSources(business: BusinessInfo, industry: string): Promise<DiscoveredSource[]> {
    const sources: DiscoveredSource[] = [];
    const countryLower = business.country.toLowerCase();
    const industryLower = industry.toLowerCase();

    // Malaysia-specific
    if (countryLower.includes('malaysia') || countryLower === 'my') {
      if (['restaurant', 'cafe', 'food'].some(k => industryLower.includes(k))) {
        // GrabFood and FoodPanda are common in Malaysia
        sources.push(
          { platform: 'GRABFOOD', url: `https://food.grab.com/my/en/restaurant/${business.name.toLowerCase().replace(/\s/g, '-')}` },
          { platform: 'FOODPANDA', url: `https://www.foodpanda.my/restaurant/${business.name.toLowerCase().replace(/\s/g, '-')}` }
        );
      }
    }

    // UK-specific
    if (countryLower.includes('united kingdom') || countryLower === 'gb' || countryLower === 'uk') {
      if (['restaurant', 'hotel', 'bar'].some(k => industryLower.includes(k))) {
        sources.push({ platform: 'OPENTABLE', url: `https://www.opentable.co.uk/r/${business.name.toLowerCase().replace(/\s/g, '-')}` });
      }
    }

    // Generic Trustpilot for many industries
    if (['ecommerce', 'service', 'retail', 'technology'].some(k => industryLower.includes(k))) {
      sources.push({ platform: 'TRUSTPILOT', url: `https://www.trustpilot.com/review/${business.website?.replace(/https?:\/\//, '')}` });
    }

    return sources;
  }

  /**
   * Search Facebook for business page
   */
  private static async searchFacebook(page: Page, business: BusinessInfo): Promise<string | null> {
    try {
      const searchQuery = `${business.name} ${business.city}`;
      await page.goto(`https://www.facebook.com/search/top?q=${encodeURIComponent(searchQuery)}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // This is a simplified version - actual implementation would need more sophisticated scraping
      const url = page.url();
      if (url.includes('facebook.com')) {
        return url;
      }
    } catch (error) {
      logger.error('Error searching Facebook:', error);
    }
    return null;
  }

  /**
   * Search Yelp for business
   */
  private static async searchYelp(page: Page, business: BusinessInfo): Promise<string | null> {
    try {
      const searchQuery = `${business.name} ${business.city}`;
      await page.goto(`https://www.yelp.com/search?find_desc=${encodeURIComponent(searchQuery)}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Look for first business result
      const firstResult = await page.$('[data-testid="serp-ia-card"] a[href^="/biz/"]');
      if (firstResult) {
        const href = await firstResult.getAttribute('href');
        return `https://www.yelp.com${href}`;
      }
    } catch (error) {
      logger.error('Error searching Yelp:', error);
    }
    return null;
  }

  /**
   * Search TripAdvisor for business
   */
  private static async searchTripAdvisor(page: Page, business: BusinessInfo): Promise<string | null> {
    try {
      const searchQuery = `${business.name} ${business.city}`;
      await page.goto(`https://www.tripadvisor.com/Search?q=${encodeURIComponent(searchQuery)}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      const firstResult = await page.$('.result-title a');
      if (firstResult) {
        const href = await firstResult.getAttribute('href');
        return `https://www.tripadvisor.com${href}`;
      }
    } catch (error) {
      logger.error('Error searching TripAdvisor:', error);
    }
    return null;
  }

  /**
   * Validate and sanitize discovered URLs
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close browser when done
   */
  static async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export default DiscoveryService;
