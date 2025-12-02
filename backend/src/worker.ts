import { Worker, Queue, QueueScheduler } from 'bullmq';
import { Redis } from 'ioredis';
import { chromium } from 'playwright';
import { prisma } from './server';
import AIService from './services/ai.service';
import WhatsAppService from './services/whatsapp.service';
import logger from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Create queues
export const scrapingQueue = new Queue('scraping', { connection });
export const analysisQueue = new Queue('analysis', { connection });
export const notificationQueue = new Queue('notifications', { connection });

// Queue schedulers for delayed/repeated jobs
new QueueScheduler('scraping', { connection });
new QueueScheduler('analysis', { connection });
new QueueScheduler('notifications', { connection });

/**
 * Scraping Worker
 * Scrapes review sources for new mentions
 */
const scrapingWorker = new Worker(
  'scraping',
  async (job) => {
    const { sourceAccountId } = job.data;
    logger.info(`Scraping source account: ${sourceAccountId}`);

    try {
      const source = await prisma.sourceAccount.findUnique({
        where: { id: sourceAccountId },
        include: { location: { include: { tenant: true } } },
      });

      if (!source || !source.isActive) {
        logger.warn(`Source ${sourceAccountId} not found or inactive`);
        return;
      }

      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      let newMentions = 0;

      // Platform-specific scraping logic
      switch (source.platform) {
        case 'GOOGLE':
          newMentions = await scrapeGoogle(page, source);
          break;
        case 'FACEBOOK':
          newMentions = await scrapeFacebook(page, source);
          break;
        case 'YELP':
          newMentions = await scrapeYelp(page, source);
          break;
        default:
          logger.warn(`Unsupported platform: ${source.platform}`);
      }

      await browser.close();

      // Update last scraped timestamp
      await prisma.sourceAccount.update({
        where: { id: sourceAccountId },
        data: { lastScrapedAt: new Date() },
      });

      logger.info(`Scraped ${newMentions} new mentions from ${source.platform}`);

      // Schedule next scraping job
      await scrapingQueue.add(
        'scrape-source',
        { sourceAccountId },
        { delay: source.scrapingFrequency * 60 * 1000 }
      );

      return { newMentions };
    } catch (error) {
      logger.error('Scraping error:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000, // 10 requests per minute max
    },
  }
);

/**
 * Analysis Worker
 * Analyzes mentions with AI and generates replies
 */
const analysisWorker = new Worker(
  'analysis',
  async (job) => {
    const { mentionId } = job.data;
    logger.info(`Analyzing mention: ${mentionId}`);

    try {
      const mention = await prisma.mention.findUnique({
        where: { id: mentionId },
        include: {
          sourceAccount: { include: { location: true } },
          tenant: true,
        },
      });

      if (!mention) {
        logger.warn(`Mention ${mentionId} not found`);
        return;
      }

      // Analyze sentiment and risk
      const analysis = await AIService.analyzeMention(
        mention.text,
        mention.stars || undefined
      );

      // Generate suggested replies
      const replies = await AIService.generateReply(
        mention.text,
        mention.stars || undefined,
        analysis.sentiment,
        analysis.topics,
        {
          tone: analysis.sentiment === 'NEGATIVE' ? 'apologetic' : 'friendly',
          maxWords: 80,
          businessName: mention.tenant.businessName,
          country: mention.tenant.country,
        }
      );

      // Update mention with analysis
      await prisma.mention.update({
        where: { id: mentionId },
        data: {
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          topics: analysis.topics,
          riskScore: analysis.riskScore,
          viralityProbability: analysis.viralityProbability,
          confidence: analysis.confidence,
          language: analysis.language,
          processedAt: new Date(),
        },
      });

      // Create reply suggestions
      await Promise.all(
        replies.slice(0, 3).map((text, index) =>
          prisma.reply.create({
            data: {
              mentionId: mention.id,
              userId: mention.tenant.users[0]?.id, // Default to first user
              suggestedText: text,
              tone: analysis.sentiment === 'NEGATIVE' ? 'apologetic' : 'friendly',
              status: 'DRAFT',
            },
          })
        )
      );

      // Send notification if high risk
      if (analysis.riskScore >= 70) {
        await notificationQueue.add('send-alert', {
          tenantId: mention.tenantId,
          mentionId: mention.id,
          type: 'high-risk',
        });
      }

      logger.info(`Analyzed mention ${mentionId}: Risk ${analysis.riskScore}`);

      return { riskScore: analysis.riskScore, sentiment: analysis.sentiment };
    } catch (error) {
      logger.error('Analysis error:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 10,
  }
);

/**
 * Notification Worker
 * Sends WhatsApp and email notifications
 */
const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { tenantId, mentionId, type } = job.data;
    logger.info(`Sending ${type} notification for mention: ${mentionId}`);

    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { users: { where: { role: { in: ['OWNER', 'MANAGER'] } } } },
      });

      if (!tenant) {
        logger.warn(`Tenant ${tenantId} not found`);
        return;
      }

      const mention = await prisma.mention.findUnique({
        where: { id: mentionId },
        include: {
          sourceAccount: { include: { location: true } },
          replies: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      });

      if (!mention) {
        logger.warn(`Mention ${mentionId} not found`);
        return;
      }

      // Send WhatsApp to all owner/manager users with phone numbers
      const phoneUsers = tenant.users.filter(u => u.phone);
      
      for (const user of phoneUsers) {
        try {
          await WhatsAppService.sendMentionAlert(user.phone!, {
            businessName: tenant.businessName,
            platform: mention.platform,
            authorName: mention.authorName || 'Anonymous',
            text: mention.text,
            stars: mention.stars || undefined,
            sentiment: mention.sentiment!,
            riskScore: mention.riskScore || 0,
            url: `${process.env.CLIENT_URL}/mentions/${mention.id}`,
            suggestedReplies: mention.replies.map(r => r.suggestedText),
          });
        } catch (error) {
          logger.error(`Failed to send WhatsApp to ${user.email}:`, error);
        }
      }

      logger.info(`Sent notifications for mention ${mentionId}`);
      return { sent: phoneUsers.length };
    } catch (error) {
      logger.error('Notification error:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 20,
  }
);

/**
 * Google Reviews Scraper
 */
async function scrapeGoogle(page: any, source: any): Promise<number> {
  await page.goto(source.accountUrl, { waitUntil: 'networkidle', timeout: 30000 });

  // This is a simplified version - production would need more robust scraping
  const reviews = await page.$$eval('[data-review-id]', (elements: any[]) =>
    elements.slice(0, 10).map(el => ({
      id: el.getAttribute('data-review-id'),
      author: el.querySelector('[aria-label*="Photo"]')?.alt || 'Anonymous',
      text: el.querySelector('[data-expandable-review]')?.textContent || '',
      stars: el.querySelectorAll('[aria-label*="star"]').length,
      date: el.querySelector('[class*="date"]')?.textContent || '',
    }))
  );

  let newCount = 0;

  for (const review of reviews) {
    const existing = await prisma.mention.findUnique({
      where: { platform_externalId: { platform: 'GOOGLE', externalId: review.id } },
    });

    if (!existing) {
      const mention = await prisma.mention.create({
        data: {
          tenantId: source.location.tenantId,
          locationId: source.locationId,
          sourceAccountId: source.id,
          platform: 'GOOGLE',
          externalId: review.id,
          url: `${source.accountUrl}#review-${review.id}`,
          authorName: review.author,
          text: review.text,
          stars: review.stars,
          publishedAt: new Date(),
          status: 'NEW',
        },
      });

      // Queue for analysis
      await analysisQueue.add('analyze-mention', { mentionId: mention.id });
      newCount++;
    }
  }

  return newCount;
}

/**
 * Facebook Reviews Scraper (simplified)
 */
async function scrapeFacebook(page: any, source: any): Promise<number> {
  // Facebook scraping would require authentication and careful rate limiting
  // This is a placeholder for the production implementation
  logger.warn('Facebook scraping requires authentication - implement based on your setup');
  return 0;
}

/**
 * Yelp Reviews Scraper
 */
async function scrapeYelp(page: any, source: any): Promise<number> {
  await page.goto(source.accountUrl, { waitUntil: 'networkidle', timeout: 30000 });

  const reviews = await page.$$eval('[data-testid="review"]', (elements: any[]) =>
    elements.slice(0, 10).map(el => ({
      id: el.getAttribute('data-review-id') || el.getAttribute('id'),
      author: el.querySelector('[data-testid="user-name"]')?.textContent || 'Anonymous',
      text: el.querySelector('[class*="raw"]')?.textContent || '',
      stars: el.querySelectorAll('[class*="star"][class*="selected"]').length,
      date: el.querySelector('[class*="date"]')?.textContent || '',
    }))
  );

  let newCount = 0;

  for (const review of reviews) {
    if (!review.id) continue;

    const existing = await prisma.mention.findUnique({
      where: { platform_externalId: { platform: 'YELP', externalId: review.id } },
    });

    if (!existing) {
      const mention = await prisma.mention.create({
        data: {
          tenantId: source.location.tenantId,
          locationId: source.locationId,
          sourceAccountId: source.id,
          platform: 'YELP',
          externalId: review.id,
          url: `${source.accountUrl}#${review.id}`,
          authorName: review.author,
          text: review.text,
          stars: review.stars,
          publishedAt: new Date(),
          status: 'NEW',
        },
      });

      await analysisQueue.add('analyze-mention', { mentionId: mention.id });
      newCount++;
    }
  }

  return newCount;
}

// Initialize scraping for all active sources
async function initializeScraping() {
  const sources = await prisma.sourceAccount.findMany({
    where: { isActive: true },
  });

  logger.info(`Initializing scraping for ${sources.length} sources`);

  for (const source of sources) {
    await scrapingQueue.add(
      'scrape-source',
      { sourceAccountId: source.id },
      { delay: Math.random() * 60000 } // Stagger initial jobs
    );
  }
}

// Error handlers
scrapingWorker.on('failed', (job, err) => {
  logger.error(`Scraping job ${job?.id} failed:`, err);
});

analysisWorker.on('failed', (job, err) => {
  logger.error(`Analysis job ${job?.id} failed:`, err);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`Notification job ${job?.id} failed:`, err);
});

// Start workers
logger.info('🔄 Workers started');
initializeScraping();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing workers...');
  await Promise.all([
    scrapingWorker.close(),
    analysisWorker.close(),
    notificationWorker.close(),
  ]);
  await connection.quit();
  process.exit(0);
});
