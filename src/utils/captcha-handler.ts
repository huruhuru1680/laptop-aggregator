import { logger } from './logger';

export enum AntiBotStatus {
  CLEAN = 'clean',
  CAPTCHA = 'captcha',
  RATE_LIMITED = 'rate_limited',
  BLOCKED = 'blocked',
}

export interface AntiBotResult {
  status: AntiBotStatus;
  shouldRetry: boolean;
  retryAfterMs: number;
}

const CAPTCHA_PATTERNS = [
  'captcha',
  'verify you are human',
  'are you a robot',
  'blocked',
  'access denied',
];

const RATE_LIMIT_PATTERNS = [
  '429',
  'too many requests',
  'please try again later',
  'service unavailable',
  '503',
];

export function detectAntiBot(pageContent: string, statusCode?: number): AntiBotResult {
  const content = pageContent.toLowerCase();

  if (statusCode === 429 || RATE_LIMIT_PATTERNS.some(p => content.includes(p))) {
    logger.warn('Rate limit detected');
    return {
      status: AntiBotStatus.RATE_LIMITED,
      shouldRetry: true,
      retryAfterMs: 60000,
    };
  }

  if (statusCode === 503 || content.includes('service unavailable')) {
    logger.warn('Service unavailable detected');
    return {
      status: AntiBotStatus.BLOCKED,
      shouldRetry: true,
      retryAfterMs: 300000,
    };
  }

  if (CAPTCHA_PATTERNS.some(p => content.includes(p))) {
    logger.warn('CAPTCHA detected');
    return {
      status: AntiBotStatus.CAPTCHA,
      shouldRetry: true,
      retryAfterMs: 600000,
    };
  }

  return {
    status: AntiBotStatus.CLEAN,
    shouldRetry: false,
    retryAfterMs: 0,
  };
}

export function calculateBackoffMs(
  attempt: number,
  baseMs: number = 60000,
  maxMs: number = 1800000
): number {
  const jitter = Math.random() * 0.3 * baseMs;
  const backoff = Math.min(baseMs * Math.pow(2, attempt) + jitter, maxMs);
  return Math.round(backoff);
}