import express, { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import AIService from '../services/ai.service';
import WhatsAppService from '../services/whatsapp.service';
import logger from '../utils/logger';

const router = express.Router();

/**
 * GET /api/mentions
 * Get all mentions for tenant with filters
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, platform, sentiment, riskScore, page = '1', limit = '20' } = req.query;

    const where: any = {
      tenantId: req.user!.tenantId,
    };

    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (sentiment) where.sentiment = sentiment;
    if (riskScore) {
      const score = parseInt(riskScore as string);
      where.riskScore = { gte: score };
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [mentions, total] = await Promise.all([
      prisma.mention.findMany({
        where,
        include: {
          sourceAccount: {
            include: { location: true },
          },
          replies: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.mention.count({ where }),
    ]);

    res.json({
      mentions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/mentions/:id
 * Get single mention with full details
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mention = await prisma.mention.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
      },
      include: {
        sourceAccount: {
          include: { location: true },
        },
        replies: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        evidences: true,
        auditLogs: {
          include: { user: true },
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!mention) {
      throw new AppError('Mention not found', 404);
    }

    res.json(mention);
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/mentions/:id/analyze
 * Re-analyze a mention (useful if AI improves)
 */
router.post('/:id/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const mention = await prisma.mention.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
      },
    });

    if (!mention) {
      throw new AppError('Mention not found', 404);
    }

    const analysis = await AIService.analyzeMention(mention.text, mention.stars || undefined);

    const updated = await prisma.mention.update({
      where: { id: mention.id },
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        mentionId: mention.id,
        action: 'REANALYZED',
        entityType: 'Mention',
        entityId: mention.id,
        metadata: { previousRiskScore: mention.riskScore, newRiskScore: analysis.riskScore },
      },
    });

    res.json(updated);
  } catch (error) {
    throw error;
  }
});

/**
 * PATCH /api/mentions/:id/status
 * Update mention status
 */
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = z.object({
      status: z.enum(['NEW', 'REVIEWED', 'REPLIED', 'ESCALATED', 'ARCHIVED']),
    }).parse(req.body);

    const mention = await prisma.mention.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
      },
    });

    if (!mention) {
      throw new AppError('Mention not found', 404);
    }

    const updated = await prisma.mention.update({
      where: { id: mention.id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        mentionId: mention.id,
        action: 'STATUS_UPDATED',
        entityType: 'Mention',
        entityId: mention.id,
        metadata: { oldStatus: mention.status, newStatus: status },
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    throw error;
  }
});

/**
 * GET /api/mentions/:id/suggested-replies
 * Generate AI reply suggestions
 */
router.get('/:id/suggested-replies', async (req: AuthRequest, res: Response) => {
  try {
    const { tone = 'friendly' } = req.query;

    const mention = await prisma.mention.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
      },
      include: {
        sourceAccount: { include: { location: true } },
        tenant: true,
      },
    });

    if (!mention) {
      throw new AppError('Mention not found', 404);
    }

    const replies = await AIService.generateReply(
      mention.text,
      mention.stars || undefined,
      mention.sentiment!,
      mention.topics,
      {
        tone: tone as any,
        maxWords: 80,
        businessName: mention.tenant.businessName,
        country: mention.tenant.country,
      }
    );

    res.json({ replies });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/mentions/stats/dashboard
 * Get dashboard statistics
 */
router.get('/stats/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const { period = '7d' } = req.query;

    const daysAgo = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const [
      totalMentions,
      sentimentCounts,
      avgRating,
      highRiskCount,
      topKeywords,
    ] = await Promise.all([
      prisma.mention.count({
        where: {
          tenantId: req.user!.tenantId,
          publishedAt: { gte: startDate },
        },
      }),
      prisma.mention.groupBy({
        by: ['sentiment'],
        where: {
          tenantId: req.user!.tenantId,
          publishedAt: { gte: startDate },
        },
        _count: true,
      }),
      prisma.mention.aggregate({
        where: {
          tenantId: req.user!.tenantId,
          publishedAt: { gte: startDate },
          stars: { not: null },
        },
        _avg: { stars: true },
      }),
      prisma.mention.count({
        where: {
          tenantId: req.user!.tenantId,
          publishedAt: { gte: startDate },
          riskScore: { gte: 70 },
        },
      }),
      prisma.$queryRaw`
        SELECT topic, COUNT(*) as count
        FROM "Mention", unnest(topics) as topic
        WHERE "tenantId" = ${req.user!.tenantId}
        AND "publishedAt" >= ${startDate}
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    const sentiment = {
      positive: sentimentCounts.find(s => s.sentiment === 'POSITIVE')?._count || 0,
      neutral: sentimentCounts.find(s => s.sentiment === 'NEUTRAL')?._count || 0,
      negative: sentimentCounts.find(s => s.sentiment === 'NEGATIVE')?._count || 0,
    };

    res.json({
      totalMentions,
      sentiment,
      avgRating: avgRating._avg.stars || 0,
      highRiskCount,
      topKeywords,
      period,
    });
  } catch (error) {
    throw error;
  }
});

export default router;
