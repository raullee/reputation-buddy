import twilio from 'twilio';
import logger from '../utils/logger';
import { Sentiment } from '@prisma/client';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

export interface MentionAlert {
  businessName: string;
  platform: string;
  authorName: string;
  text: string;
  stars?: number;
  sentiment: Sentiment;
  riskScore: number;
  url: string;
  suggestedReplies: string[];
}

export class WhatsAppService {
  /**
   * Send mention alert via WhatsApp
   */
  static async sendMentionAlert(to: string, alert: MentionAlert): Promise<void> {
    try {
      const riskEmoji = alert.riskScore > 70 ? '🚨' : alert.riskScore > 40 ? '⚠️' : 'ℹ️';
      const sentimentEmoji = alert.sentiment === 'POSITIVE' ? '😊' : alert.sentiment === 'NEGATIVE' ? '😟' : '😐';
      
      const starsDisplay = alert.stars ? `${'⭐'.repeat(Math.floor(alert.stars))}${'☆'.repeat(5 - Math.floor(alert.stars))}` : '';

      let message = `${riskEmoji} *New ${alert.platform} Review* ${sentimentEmoji}\n\n`;
      message += `*${alert.businessName}*\n`;
      message += `From: ${alert.authorName}\n`;
      if (starsDisplay) message += `Rating: ${starsDisplay} (${alert.stars}/5)\n`;
      message += `Risk Score: ${alert.riskScore}/100\n\n`;
      message += `*Review:*\n"${alert.text.substring(0, 200)}${alert.text.length > 200 ? '...' : ''}"\n\n`;
      
      if (alert.suggestedReplies && alert.suggestedReplies.length > 0) {
        message += `*Suggested Reply:*\n"${alert.suggestedReplies[0].substring(0, 150)}..."\n\n`;
      }
      
      message += `View & Reply: ${alert.url}`;

      await client.messages.create({
        from: WHATSAPP_FROM,
        to: `whatsapp:${to}`,
        body: message,
      });

      logger.info(`WhatsApp alert sent to ${to}`);
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send daily/weekly summary
   */
  static async sendSummary(
    to: string,
    businessName: string,
    summary: {
      totalMentions: number;
      positive: number;
      negative: number;
      neutral: number;
      avgRating: number;
      highRiskCount: number;
      revenueRecovered: number;
    }
  ): Promise<void> {
    try {
      let message = `📊 *Daily Summary: ${businessName}*\n\n`;
      message += `Total Mentions: ${summary.totalMentions}\n`;
      message += `😊 Positive: ${summary.positive}\n`;
      message += `😐 Neutral: ${summary.neutral}\n`;
      message += `😟 Negative: ${summary.negative}\n`;
      message += `⭐ Avg Rating: ${summary.avgRating.toFixed(1)}/5\n\n`;
      
      if (summary.highRiskCount > 0) {
        message += `🚨 ${summary.highRiskCount} high-risk reviews need attention!\n\n`;
      }
      
      if (summary.revenueRecovered > 0) {
        message += `💰 Revenue Recovered: $${summary.revenueRecovered.toFixed(2)}\n`;
      }

      await client.messages.create({
        from: WHATSAPP_FROM,
        to: `whatsapp:${to}`,
        body: message,
      });

      logger.info(`WhatsApp summary sent to ${to}`);
    } catch (error) {
      logger.error('Error sending WhatsApp summary:', error);
    }
  }

  /**
   * Send predictive alert for negative trends
   */
  static async sendPredictiveAlert(
    to: string,
    businessName: string,
    location: string,
    prediction: {
      predictedDrop: number;
      keywordPattern: string;
      recommendation: string;
    }
  ): Promise<void> {
    try {
      let message = `⚡ *PREDICTIVE ALERT*\n\n`;
      message += `*${businessName}* - ${location}\n\n`;
      message += `🤖 AI predicts a ${prediction.predictedDrop}% drop in ratings based on recent patterns.\n\n`;
      message += `Pattern detected: "${prediction.keywordPattern}"\n\n`;
      message += `*Recommendation:* ${prediction.recommendation}\n\n`;
      message += `Take action now to prevent further issues.`;

      await client.messages.create({
        from: WHATSAPP_FROM,
        to: `whatsapp:${to}`,
        body: message,
      });

      logger.info(`Predictive alert sent to ${to}`);
    } catch (error) {
      logger.error('Error sending predictive alert:', error);
    }
  }

  /**
   * Validate WhatsApp phone number format
   */
  static validatePhoneNumber(phone: string): boolean {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Should be 10-15 digits
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Format phone number for WhatsApp
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // If doesn't start with +, add it
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }
}

export default WhatsAppService;
