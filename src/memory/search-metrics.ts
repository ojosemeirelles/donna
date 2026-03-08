/**
 * Lightweight in-memory search latency metrics collector.
 *
 * Uses a rolling window (default 1000 entries) so memory usage stays bounded.
 * No persistence — metrics reset when the process restarts.
 */

export interface SearchMetrics {
  totalSearches: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  lastSearchMs: number;
}

const DEFAULT_WINDOW_SIZE = 1000;

export class SearchMetricsCollector {
  private readonly maxWindow: number;
  private latencies: number[] = [];
  private totalSearches = 0;
  /** Cache sorted copy; invalidated on each record(). */
  private sortedCache: number[] | null = null;

  constructor(windowSize: number = DEFAULT_WINDOW_SIZE) {
    this.maxWindow = Math.max(1, windowSize);
  }

  /** Record a search latency in milliseconds. */
  record(latencyMs: number): void {
    this.totalSearches += 1;
    this.latencies.push(latencyMs);
    if (this.latencies.length > this.maxWindow) {
      this.latencies.shift();
    }
    this.sortedCache = null;
  }

  /** Get current metrics snapshot. Returns zeros if no searches recorded. */
  getMetrics(): SearchMetrics {
    if (this.latencies.length === 0) {
      return {
        totalSearches: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        lastSearchMs: 0,
      };
    }

    const sorted = this.getSorted();
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    const avg = sum / this.latencies.length;

    return {
      totalSearches: this.totalSearches,
      avgLatencyMs: round2(avg),
      p50LatencyMs: round2(percentile(sorted, 50)),
      p95LatencyMs: round2(percentile(sorted, 95)),
      lastSearchMs: round2(this.latencies[this.latencies.length - 1]!),
    };
  }

  /** Reset all collected metrics. */
  reset(): void {
    this.latencies = [];
    this.totalSearches = 0;
    this.sortedCache = null;
  }

  private getSorted(): number[] {
    if (!this.sortedCache) {
      this.sortedCache = this.latencies.toSorted((a, b) => a - b);
    }
    return this.sortedCache;
  }
}

/**
 * Calculate the p-th percentile from a sorted array using nearest-rank.
 * Assumes `sorted` is non-empty and sorted ascending.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) {
    return sorted[0]!;
  }
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]!;
}

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
