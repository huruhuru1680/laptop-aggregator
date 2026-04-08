import Bottleneck from 'bottleneck';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
];

let currentAgentIndex = 0;

export function getRandomUserAgent(): string {
  const agent = USER_AGENTS[currentAgentIndex];
  currentAgentIndex = (currentAgentIndex + 1) % USER_AGENTS.length;
  return agent;
}

export function createRateLimiter(options: {
  minTime: number;
  maxConcurrent: number;
}): Bottleneck {
  return new Bottleneck({
    reservoir: 1,
    reservoirRefreshAmount: 1,
    reservoirRefreshInterval: options.minTime,
    maxConcurrent: options.maxConcurrent,
  });
}

export const amazonRateLimiter = createRateLimiter({
  minTime: 6000,
  maxConcurrent: 1,
});

export const flipkartRateLimiter = createRateLimiter({
  minTime: 6000,
  maxConcurrent: 1,
});