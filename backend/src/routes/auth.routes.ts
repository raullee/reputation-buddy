import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../server';
import { AppError } from '../middleware/errorHandler';
import StripeService from '../services/stripe.service';
import DiscoveryService from '../services/discovery.service';
import logger from '../utils/logger';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  businessName: z.string().min(1),
  industry: z.string().min(1),
  country: z.string().min(2),
  city: z.string().min(1),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  plan: z.enum(['LITE', 'PRO', 'MAX']).default('LITE'),
  paymentMethodId: z.string(), // Stripe payment method ID
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * POST /api/auth/register
 * Register new tenant with trial subscription
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create Stripe customer
    const stripeCustomerId = await StripeService.createCustomer(
      data.email,
      data.businessName,
      data.paymentMethodId
    );

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        businessName: data.businessName,
        email: data.email,
        phone: data.phone,
        website: data.website,
        industry: data.industry,
        country: data.country,
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
        stripeCustomerId,
        plan: data.plan,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      },
    });

    // Create owner user
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'OWNER',
      },
    });

    // Create subscription
    const subscription = await StripeService.createSubscription(stripeCustomerId, data.plan);

    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: data.plan,
        status: 'TRIALING',
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      },
    });

    // Start discovery process asynchronously
    DiscoveryService.discoverSources({
      name: data.businessName,
      gpsLatitude: data.gpsLatitude || 0,
      gpsLongitude: data.gpsLongitude || 0,
      phone: data.phone,
      website: data.website,
      city: data.city,
      country: data.country,
    }, data.industry).catch(err => {
      logger.error('Background discovery error:', err);
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, tenantId: tenant.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        plan: tenant.plan,
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401);
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.tenant.status === 'SUSPENDED' || user.tenant.status === 'CANCELLED') {
      throw new AppError('Account suspended or cancelled', 403);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, tenantId: user.tenantId, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        businessName: user.tenant.businessName,
        plan: user.tenant.plan,
        status: user.tenant.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error' });
    }
    throw error;
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { tenant: { include: { subscription: true } } },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        businessName: user.tenant.businessName,
        plan: user.tenant.plan,
        status: user.tenant.status,
        trialEndsAt: user.tenant.trialEndsAt,
      },
      subscription: user.tenant.subscription,
    });
  } catch (error) {
    throw new AppError('Invalid token', 401);
  }
});

export default router;
