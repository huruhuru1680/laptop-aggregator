import { Request, Response, NextFunction } from 'express';

interface Metrics {
  requestsTotal: Map<string, number>;
  requestDurationMs: Map<string, number[]>;
  errorsTotal: Map<string, number>;
  cacheHits: number;
  cacheMisses: number;
  activeConnections: number;
}

const metrics: Metrics = {
  requestsTotal: new Map(),
  requestDurationMs: new Map(),
  errorsTotal: new Map(),
  cacheHits: 0,
  cacheMisses: 0,
  activeConnections: 0,
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  metrics.activeConnections++;

  res.on('finish', () => {
    metrics.activeConnections--;
    const duration = Number(process.hrtime.bigint() - start) / 1e6;
    const key = `${req.method}:${req.path}:${res.statusCode}`;

    metrics.requestsTotal.set(key, (metrics.requestsTotal.get(key) || 0) + 1);

    const durations = metrics.requestDurationMs.get(key) || [];
    durations.push(duration);
    if (durations.length > 1000) durations.shift();
    metrics.requestDurationMs.set(key, durations);

    if (res.statusCode >= 500) {
      metrics.errorsTotal.set(key, (metrics.errorsTotal.get(key) || 0) + 1);
    }
  });

  next();
}

export function recordCacheHit(): void {
  metrics.cacheHits++;
}

export function recordCacheMiss(): void {
  metrics.cacheMisses++;
}

function quantiles(values: number[]): { p50: number; p95: number; p99: number } {
  if (values.length === 0) return { p50: 0, p95: 0, p99: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
  return { p50, p95, p99 };
}

export async function getMetrics(): Promise<string> {
  const lines: string[] = [
    '# HELP http_requests_total Total HTTP requests',
    '# TYPE http_requests_total counter',
  ];

  for (const [key, count] of metrics.requestsTotal.entries()) {
    const [method, path, statusCode] = key.split(':');
    lines.push(`http_requests_total{method="${method}",path="${path}",status="${statusCode}"} ${count}`);
  }

  lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
  lines.push('# TYPE http_request_duration_ms summary');

  for (const [key, durations] of metrics.requestDurationMs.entries()) {
    const [method, path] = key.split(':');
    const { p50, p95, p99 } = quantiles(durations);
    lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.5"} ${p50}`);
    lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.95"} ${p95}`);
    lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="0.99"} ${p99}`);
  }

  lines.push('# HELP http_errors_total Total HTTP errors (5xx)');
  lines.push('# TYPE http_errors_total counter');
  for (const [key, count] of metrics.errorsTotal.entries()) {
    const [method, path] = key.split(':');
    lines.push(`http_errors_total{method="${method}",path="${path}"} ${count}`);
  }

  lines.push('# HELP cache_hits_total Total cache hits');
  lines.push('# TYPE cache_hits_total counter');
  lines.push(`cache_hits_total ${metrics.cacheHits}`);

  lines.push('# HELP cache_misses_total Total cache misses');
  lines.push('# TYPE cache_misses_total counter');
  lines.push(`cache_misses_total ${metrics.cacheMisses}`);

  lines.push('# HELP active_connections Current active connections');
  lines.push('# TYPE active_connections gauge');
  lines.push(`active_connections ${metrics.activeConnections}`);

  return lines.join('\n');
}

export { metrics };