import { describe, expect, it } from "vitest";
import { SearchMetricsCollector } from "./search-metrics.js";

describe("SearchMetricsCollector", () => {
  it("returns zeros when no searches recorded", () => {
    const collector = new SearchMetricsCollector();
    const metrics = collector.getMetrics();
    expect(metrics).toEqual({
      totalSearches: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      lastSearchMs: 0,
    });
  });

  it("records a single search", () => {
    const collector = new SearchMetricsCollector();
    collector.record(42.5);
    const metrics = collector.getMetrics();
    expect(metrics.totalSearches).toBe(1);
    expect(metrics.avgLatencyMs).toBe(42.5);
    expect(metrics.p50LatencyMs).toBe(42.5);
    expect(metrics.p95LatencyMs).toBe(42.5);
    expect(metrics.lastSearchMs).toBe(42.5);
  });

  it("calculates correct average", () => {
    const collector = new SearchMetricsCollector();
    collector.record(10);
    collector.record(20);
    collector.record(30);
    const metrics = collector.getMetrics();
    expect(metrics.avgLatencyMs).toBe(20);
    expect(metrics.totalSearches).toBe(3);
  });

  it("calculates p50 (median) correctly", () => {
    const collector = new SearchMetricsCollector();
    // Record 1-100
    for (let i = 1; i <= 100; i++) {
      collector.record(i);
    }
    const metrics = collector.getMetrics();
    expect(metrics.p50LatencyMs).toBe(50);
  });

  it("calculates p95 correctly", () => {
    const collector = new SearchMetricsCollector();
    for (let i = 1; i <= 100; i++) {
      collector.record(i);
    }
    const metrics = collector.getMetrics();
    expect(metrics.p95LatencyMs).toBe(95);
  });

  it("tracks lastSearchMs as the most recent recording", () => {
    const collector = new SearchMetricsCollector();
    collector.record(10);
    collector.record(99);
    collector.record(5);
    expect(collector.getMetrics().lastSearchMs).toBe(5);
  });

  it("respects rolling window size", () => {
    const collector = new SearchMetricsCollector(5);
    // Record 10 values; only last 5 should be kept
    for (let i = 1; i <= 10; i++) {
      collector.record(i * 10);
    }
    const metrics = collector.getMetrics();
    // totalSearches counts all recordings, not just window
    expect(metrics.totalSearches).toBe(10);
    // avg should be based on window: [60, 70, 80, 90, 100]
    expect(metrics.avgLatencyMs).toBe(80);
    // p50 of [60, 70, 80, 90, 100] => 80
    expect(metrics.p50LatencyMs).toBe(80);
  });

  it("resets all metrics", () => {
    const collector = new SearchMetricsCollector();
    collector.record(100);
    collector.record(200);
    collector.reset();
    const metrics = collector.getMetrics();
    expect(metrics.totalSearches).toBe(0);
    expect(metrics.avgLatencyMs).toBe(0);
  });

  it("handles window size of 1", () => {
    const collector = new SearchMetricsCollector(1);
    collector.record(10);
    collector.record(20);
    const metrics = collector.getMetrics();
    expect(metrics.totalSearches).toBe(2);
    // Only the last value in the window
    expect(metrics.avgLatencyMs).toBe(20);
    expect(metrics.lastSearchMs).toBe(20);
  });

  it("rounds values to 2 decimal places", () => {
    const collector = new SearchMetricsCollector();
    collector.record(1.111);
    collector.record(2.222);
    collector.record(3.333);
    const metrics = collector.getMetrics();
    // avg = 6.666 / 3 = 2.222
    expect(metrics.avgLatencyMs).toBe(2.22);
  });

  it("works correctly after reset and new recordings", () => {
    const collector = new SearchMetricsCollector();
    collector.record(100);
    collector.reset();
    collector.record(50);
    const metrics = collector.getMetrics();
    expect(metrics.totalSearches).toBe(1);
    expect(metrics.avgLatencyMs).toBe(50);
  });
});
