// server/__tests__/circuit-breaker.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceBreaker, BREAKER_CONFIGS } from '../utils/circuit-breaker';

describe('ServiceBreaker', () => {
  let breaker: ServiceBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    breaker = new ServiceBreaker({ maxFailures: 3, openDurationMs: 30_000, name: 'test' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in CLOSED state', () => {
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.isOpen).toBe(false);
  });

  it('stays CLOSED below failure threshold', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.isOpen).toBe(false);
  });

  it('opens after reaching failure threshold', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('OPEN');
    expect(breaker.isOpen).toBe(true);
  });

  it('transitions to HALF_OPEN after openDuration expires', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('OPEN');

    vi.advanceTimersByTime(30_001);
    expect(breaker.state).toBe('HALF_OPEN');
    expect(breaker.isOpen).toBe(false); // allows one attempt
  });

  it('resets to CLOSED on success', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.failures).toBe(0);
  });

  it('re-opens on failure in HALF_OPEN state', () => {
    // Open the breaker
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state).toBe('OPEN');

    // Wait for half-open
    vi.advanceTimersByTime(30_001);
    expect(breaker.state).toBe('HALF_OPEN');

    // Fail again — re-opens
    breaker.recordFailure();
    expect(breaker.state).toBe('OPEN');
  });

  it('execute() runs function when closed', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await breaker.execute(fn, 'fallback');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('execute() returns fallback when open', async () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    const fn = vi.fn().mockResolvedValue('ok');
    const result = await breaker.execute(fn, 'fallback');
    expect(result).toBe('fallback');
    expect(fn).not.toHaveBeenCalled();
  });

  it('execute() records failure on thrown error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await breaker.execute(fn, 'fallback');
    expect(result).toBe('fallback');
    expect(breaker.failures).toBe(1);
  });

  it('execute() records success on resolved value', async () => {
    breaker.recordFailure();
    breaker.recordFailure();
    const fn = vi.fn().mockResolvedValue('ok');
    await breaker.execute(fn, 'fallback');
    expect(breaker.failures).toBe(0);
  });
});

describe('BREAKER_CONFIGS', () => {
  it('has configs for all expected services', () => {
    expect(BREAKER_CONFIGS).toHaveProperty('hedera');
    expect(BREAKER_CONFIGS).toHaveProperty('blocky402');
    expect(BREAKER_CONFIGS).toHaveProperty('og-broker');
    expect(BREAKER_CONFIGS).toHaveProperty('og-rpc');
    expect(BREAKER_CONFIGS).toHaveProperty('world-id');
    expect(BREAKER_CONFIGS).toHaveProperty('mirror-node');
  });
});
