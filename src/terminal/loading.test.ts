import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { createProgressBar, createSpinner } from "./loading.js";

// Helper: create a fake writable stream that captures output as string.
function createFakeStream(): NodeJS.WriteStream & { output: string } {
  const pt = new PassThrough();
  let output = "";
  pt.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  // Mark as non-TTY so visual mode falls back to plain writes
  (pt as unknown as Record<string, unknown>).isTTY = false;
  const stream = pt as unknown as NodeJS.WriteStream & { output: string };
  Object.defineProperty(stream, "output", {
    get: () => output,
  });
  return stream;
}

// ---------------------------------------------------------------------------
// Spinner — accessible mode
// ---------------------------------------------------------------------------

describe("createSpinner (accessible)", () => {
  it("prints Loading message on creation", () => {
    const stream = createFakeStream();
    const handle = createSpinner({ message: "Connecting...", accessible: true, stream });
    expect(stream.output).toContain("Loading: Connecting...");
    handle.stop();
  });

  it("prints updated messages", () => {
    const stream = createFakeStream();
    const handle = createSpinner({ message: "Step 1", accessible: true, stream });
    handle.update("Step 2");
    expect(stream.output).toContain("Loading: Step 2");
    handle.stop();
  });

  it("prints Done on stop", () => {
    const stream = createFakeStream();
    const handle = createSpinner({ message: "Working", accessible: true, stream });
    handle.stop("Finished!");
    expect(stream.output).toContain("Done: Finished!");
  });

  it("prints generic Done when stopped without message", () => {
    const stream = createFakeStream();
    const handle = createSpinner({ message: "Working", accessible: true, stream });
    handle.stop();
    expect(stream.output).toContain("Done.");
  });

  it("ignores updates after stop", () => {
    const stream = createFakeStream();
    const handle = createSpinner({ message: "Init", accessible: true, stream });
    handle.stop();
    const afterStop = stream.output;
    handle.update("Should not appear");
    // No new output after stop
    expect(stream.output).toBe(afterStop);
  });
});

// ---------------------------------------------------------------------------
// Progress bar — accessible mode
// ---------------------------------------------------------------------------

describe("createProgressBar (accessible)", () => {
  it("prints initial 0/total on creation", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Downloading",
      total: 10,
      accessible: true,
      stream,
    });
    expect(stream.output).toContain("Progress: 0/10");
    handle.stop();
  });

  it("increments progress", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Files",
      total: 5,
      accessible: true,
      stream,
    });
    handle.increment();
    expect(stream.output).toContain("Progress: 1/5 complete");
    handle.increment(2);
    expect(stream.output).toContain("Progress: 3/5 complete");
    handle.stop();
  });

  it("does not exceed total", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Items",
      total: 3,
      accessible: true,
      stream,
    });
    handle.increment(100);
    expect(stream.output).toContain("Progress: 3/3 complete");
    handle.stop();
  });

  it("setProgress sets absolute value", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Upload",
      total: 100,
      accessible: true,
      stream,
    });
    handle.setProgress(42);
    expect(stream.output).toContain("Progress: 42/100 complete");
    handle.stop();
  });

  it("setProgress clamps to 0..total", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Sync",
      total: 10,
      accessible: true,
      stream,
    });
    handle.setProgress(-5);
    expect(stream.output).toContain("Progress: 0/10 complete");
    handle.setProgress(999);
    expect(stream.output).toContain("Progress: 10/10 complete");
    handle.stop();
  });

  it("prints final message on stop", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Indexing",
      total: 50,
      accessible: true,
      stream,
    });
    handle.stop("All indexed.");
    expect(stream.output).toContain("Done: All indexed.");
  });

  it("prints generic completion on stop without message", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Build",
      total: 20,
      accessible: true,
      stream,
    });
    handle.stop();
    expect(stream.output).toContain("Done: 20/20 complete");
  });

  it("update changes displayed message", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Phase 1",
      total: 10,
      accessible: true,
      stream,
    });
    handle.update("Phase 2");
    expect(stream.output).toContain("Phase 2");
    handle.stop();
  });

  it("ignores operations after stop", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Done test",
      total: 5,
      accessible: true,
      stream,
    });
    handle.stop();
    const afterStop = stream.output;
    handle.increment();
    handle.setProgress(3);
    handle.update("Nope");
    expect(stream.output).toBe(afterStop);
  });
});

// ---------------------------------------------------------------------------
// Visual mode fallback (non-TTY stream behaves like plain text)
// ---------------------------------------------------------------------------

describe("createSpinner (visual, non-TTY fallback)", () => {
  it("prints message without animation on non-TTY", () => {
    const stream = createFakeStream();
    const handle = createSpinner({ message: "Building", accessible: false, stream });
    expect(stream.output).toContain("Building");
    handle.stop();
  });
});

describe("createProgressBar (visual, non-TTY fallback)", () => {
  it("prints percentage on non-TTY", () => {
    const stream = createFakeStream();
    const handle = createProgressBar({
      message: "Compiling",
      total: 100,
      accessible: false,
      stream,
    });
    expect(stream.output).toContain("[0%]");
    handle.increment(50);
    expect(stream.output).toContain("[50%]");
    handle.stop();
  });
});
