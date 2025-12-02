import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger';
import { Sentiment } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnalysisResult {
  sentiment: Sentiment;
  intent: string;
  topics: string[];
  riskScore: number;
  viralityProbability: number;
  confidence: number;
  language: string;
}

export interface ReplyOptions {
  tone: 'friendly' | 'formal' | 'apologetic' | 'concise';
  maxWords: number;
  businessName: string;
  country: string;
}

export class AIService {
  /**
   * Analyze review/mention text for sentiment, intent, and risk
   */
  static async analyzeMention(text: string, stars?: number): Promise<AnalysisResult> {
    try {
      const prompt = `Analyze the following customer review/mention and provide a JSON response with:
- sentiment: "POSITIVE", "NEUTRAL", or "NEGATIVE"
- intent: primary intent (e.g., "complaint", "praise", "inquiry", "feedback")
- topics: array of key topics mentioned (e.g., ["food quality", "service", "wait time", "pricing"])
- riskScore: integer 0-100 (how urgently this needs addressing; viral potential, legal risk, severe complaint = high score)
- viralityProbability: float 0-1 (likelihood this could go viral or spread)
- confidence: float 0-1 (confidence in this analysis)
- language: detected language code (e.g., "en", "ms", "zh")

Review text: "${text}"
${stars !== undefined ? `Star rating: ${stars}/5` : ''}

Respond ONLY with valid JSON. No markdown, no explanation.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        sentiment: result.sentiment as Sentiment,
        intent: result.intent,
        topics: result.topics || [],
        riskScore: Math.min(100, Math.max(0, result.riskScore || 0)),
        viralityProbability: Math.min(1, Math.max(0, result.viralityProbability || 0)),
        confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
        language: result.language || 'en',
      };
    } catch (error) {
      logger.error('Error analyzing mention:', error);
      // Fallback to basic sentiment
      return this.fallbackAnalysis(text, stars);
    }
  }

  /**
   * Generate appropriate reply to a review/mention
   */
  static async generateReply(
    mentionText: string,
    stars: number | undefined,
    sentiment: Sentiment,
    topics: string[],
    options: ReplyOptions
  ): Promise<string[]> {
    try {
      const toneInstructions = {
        friendly: 'warm, personable, and appreciative',
        formal: 'professional and respectful',
        apologetic: 'sincere, empathetic, and solution-focused',
        concise: 'brief and direct',
      };

      const prompt = `You are a reputation management expert writing a ${toneInstructions[options.tone]} response to a customer review.

Business: ${options.businessName}
Country: ${options.country}
Review sentiment: ${sentiment}
Key topics: ${topics.join(', ')}
${stars !== undefined ? `Star rating: ${stars}/5` : ''}

Original review:
"${mentionText}"

Generate 3 different response options, each under ${options.maxWords} words. Each must:
- Be legally safe and compliant with ${options.country} defamation laws
- Address the customer's concerns specifically
- Maintain brand alignment
- Be authentic and non-generic
- Use appropriate tone: ${options.tone}
${sentiment === 'NEGATIVE' ? '- Acknowledge the issue without admitting fault\n- Offer a path forward' : ''}
${sentiment === 'POSITIVE' ? '- Show genuine appreciation\n- Encourage return visits or referrals' : ''}

Respond ONLY with a JSON array of 3 strings. No markdown, no explanation.
Format: ["response1", "response2", "response3"]`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const replies = JSON.parse(content.text);
      return Array.isArray(replies) ? replies.slice(0, 3) : [replies];
    } catch (error) {
      logger.error('Error generating reply:', error);
      return [this.fallbackReply(sentiment, options)];
    }
  }

  /**
   * Detect if content violates platform policies (for takedown requests)
   */
  static async detectPolicyViolation(text: string): Promise<{
    violates: boolean;
    reasons: string[];
    confidence: number;
  }> {
    try {
      const prompt = `Analyze if this review violates typical platform content policies:
- Hate speech or discrimination
- Spam or fake content
- Personal attacks or harassment
- False or misleading information
- Profanity or inappropriate language
- Doxxing or privacy violations

Review: "${text}"

Respond with JSON:
{
  "violates": true/false,
  "reasons": ["reason1", "reason2"],
  "confidence": 0.0-1.0
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      return JSON.parse(response.choices[0].message.content || '{"violates":false,"reasons":[],"confidence":0}');
    } catch (error) {
      logger.error('Error detecting policy violation:', error);
      return { violates: false, reasons: [], confidence: 0 };
    }
  }

  /**
   * Fallback analysis using basic heuristics
   */
  private static fallbackAnalysis(text: string, stars?: number): AnalysisResult {
    const lowerText = text.toLowerCase();
    
    // Basic sentiment detection
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'disappointing', 'worst', 'horrible'];
    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'best', 'love'];
    
    const negCount = negativeWords.filter(w => lowerText.includes(w)).length;
    const posCount = positiveWords.filter(w => lowerText.includes(w)).length;
    
    let sentiment: Sentiment = 'NEUTRAL';
    let riskScore = 30;
    
    if (stars !== undefined) {
      if (stars <= 2) {
        sentiment = 'NEGATIVE';
        riskScore = 70;
      } else if (stars >= 4) {
        sentiment = 'POSITIVE';
        riskScore = 10;
      }
    } else if (negCount > posCount) {
      sentiment = 'NEGATIVE';
      riskScore = 60;
    } else if (posCount > negCount) {
      sentiment = 'POSITIVE';
      riskScore = 15;
    }

    return {
      sentiment,
      intent: sentiment === 'NEGATIVE' ? 'complaint' : sentiment === 'POSITIVE' ? 'praise' : 'feedback',
      topics: [],
      riskScore,
      viralityProbability: riskScore > 70 ? 0.4 : 0.1,
      confidence: 0.6,
      language: 'en',
    };
  }

  /**
   * Fallback reply generation
   */
  private static fallbackReply(sentiment: Sentiment, options: ReplyOptions): string {
    if (sentiment === 'POSITIVE') {
      return `Thank you so much for your kind words! We're thrilled you had a great experience at ${options.businessName}. We look forward to serving you again soon!`;
    } else if (sentiment === 'NEGATIVE') {
      return `We sincerely apologize for your experience. This isn't the standard we strive for at ${options.businessName}. We'd like to make this right. Please contact us directly so we can address your concerns.`;
    } else {
      return `Thank you for your feedback! We appreciate you taking the time to share your thoughts about ${options.businessName}. We're always working to improve our service.`;
    }
  }
}

export default AIService;
