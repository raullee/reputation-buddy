import Stripe from 'stripe';
import { prisma } from '../server';
import logger from '../utils/logger';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class StripeService {
  /**
   * Create a new Stripe customer and attach payment method
   */
  static async createCustomer(
    email: string,
    businessName: string,
    paymentMethodId: string
  ): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name: businessName,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return customer.id;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create payment customer');
    }
  }

  /**
   * Create a subscription with trial period
   */
  static async createSubscription(
    customerId: string,
    plan: SubscriptionPlan
  ): Promise<Stripe.Subscription> {
    try {
      const priceId = this.getPriceId(plan);
      
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: 14,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Update subscription plan
   */
  static async updateSubscription(
    subscriptionId: string,
    newPlan: SubscriptionPlan
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const newPriceId = this.getPriceId(newPlan);

      return await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'always_invoice',
      });
    } catch (error) {
      logger.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Cancel subscription at period end
   */
  static async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Reactivate cancelled subscription
   */
  static async reactivateSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  /**
   * Process webhook events
   */
  static async handleWebhook(payload: string, signature: string): Promise<void> {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      logger.info('Stripe webhook received:', { type: event.type, id: event.id });

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          logger.info('Unhandled webhook event type:', event.type);
      }
    } catch (error) {
      logger.error('Webhook error:', error);
      throw error;
    }
  }

  private static async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const tenant = await prisma.tenant.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (!tenant) {
      logger.error('Tenant not found for customer:', subscription.customer);
      return;
    }

    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: this.mapStripePlanToPlan(subscription.items.data[0].price.id),
        status: this.mapStripeStatus(subscription.status),
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
      },
    });

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'ACTIVE' },
    });
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) {
      logger.error('Subscription not found:', subscription.id);
      return;
    }

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: { status: 'CANCELLED' },
    });

    await prisma.tenant.update({
      where: { id: dbSubscription.tenantId },
      data: { status: 'CANCELLED' },
    });
  }

  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    logger.info('Payment succeeded for invoice:', invoice.id);
    // Additional logic if needed
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    logger.error('Payment failed for invoice:', invoice.id);
    
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription as string },
      include: { tenant: true },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });
    }
  }

  private static getPriceId(plan: SubscriptionPlan): string {
    const priceMap = {
      LITE: process.env.STRIPE_PRICE_ID_LITE!,
      PRO: process.env.STRIPE_PRICE_ID_PRO!,
      MAX: process.env.STRIPE_PRICE_ID_MAX!,
    };
    return priceMap[plan];
  }

  private static mapStripePlanToPlan(priceId: string): SubscriptionPlan {
    if (priceId === process.env.STRIPE_PRICE_ID_LITE) return 'LITE';
    if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'PRO';
    return 'MAX';
  }

  private static mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      unpaid: 'UNPAID',
    };
    return statusMap[status] || 'ACTIVE';
  }
}

export default StripeService;
