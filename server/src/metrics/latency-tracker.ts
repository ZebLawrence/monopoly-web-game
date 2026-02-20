const WINDOW_SIZE = 1000;

const latencies: number[] = [];

export function recordLatency(ms: number): void {
  latencies.push(ms);
  if (latencies.length > WINDOW_SIZE) {
    latencies.shift();
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function getLatencyMetrics(): { p50: number; p95: number; p99: number } {
  if (latencies.length === 0) {
    return { p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

export function resetLatencies(): void {
  latencies.length = 0;
}
