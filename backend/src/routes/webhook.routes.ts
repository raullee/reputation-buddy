import express, { Request, Response } from 'express';
import StripeService from '../services/stripe.service';
import logger from '../utils/logger';

const router = express.Router();

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  
  try {
    await StripeService.handleWebhook(req.body.toString(), sig);
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    return res.status(400).send(`Webhook Error: ${error}`);
  }
});

export default router;
