import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePolling } from './hooks/use-polling';
import { ConsoleApiError } from './model/console-api';
import { ago, describeOutcome, describeProblem, healthTone, shortImage, usageTone } from './model/describe';

describe('describe', () => {
  it('colours a health word, and treats an unfamiliar one as a warning', () => {
    expect(['healthy', 'running', 'starting', 'completed', 'paused', 'unhealthy', 'restarting', 'exited'].map(healthTone)).toEqual(['ok', 'ok', 'signal', 'mute', 'warn', 'crit', 'crit', 'crit']);
    expect(healthTone('removing')).toBe('warn');
    expect([0.2, 0.8, 0.95].map(usageTone)).toEqual(['signal', 'warn', 'crit']);
    expect(describeOutcome('invalid')).toEqual({ label: 'bad request', tone: 'crit' });
  });

  it('shortens an image reference without losing what it is', () => {
    expect(shortImage('nginx:1.30')).toBe('nginx:1.30');
    expect(shortImage('ghcr.io/acme/platform/api:2.4@sha256:abc')).toBe('platform/api:2.4');
    expect(shortImage('sha256:0123456789abcdef0123')).toBe('image 0123456789ab');
  });

  it('says how long ago something happened', () => {
    const now = Date.parse('2026-10-10T12:00:00Z');
    const at = (secondsAgo: number) => new Date(now - secondsAgo * 1000).toISOString();
    expect([2, 42, 180, 7200, 200_000].map((seconds) => ago(at(seconds), now))).toEqual(['just now', '42 s ago', '3 min ago', '2 h ago', '2 d ago']);
    expect(ago(at(-30), now)).toBe('just now');
    expect(ago('not a date', now)).toBe('—');
  });

  it('turns a failed request into a sentence', () => {
    expect(describeProblem(new ConsoleApiError(400, { error: 'invalid_params', message: 'filter_pattern is too long' }))).toBe('filter_pattern is too long');
    expect(describeProblem(new ConsoleApiError(429, {}))).toMatch(/Too many requests/);
    expect(describeProblem(new ConsoleApiError(502, {}))).toMatch(/did not answer/);
    expect(describeProblem(new ConsoleApiError(403, { error: 'cross_site_request' }))).toMatch(/did not come from this site/);
    expect(describeProblem(new ConsoleApiError(418, { error: 'teapot' }))).toBe('The console service answered 418.');
    expect(describeProblem(new TypeError('Failed to fetch'))).toMatch(/did not answer/);
  });
});

describe('usePolling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  /** Lets the pending promise callbacks run. */
  const settle = () => act(async () => void (await Promise.resolve()));

  it('loads at once, then on every interval', async () => {
    let count = 0;
    const load = vi.fn(async () => (count += 1));
    const { result } = renderHook(() => usePolling(load, 1000));
    await settle();
    expect(result.current.data).toBe(1);
    await act(async () => void vi.advanceTimersByTime(2000));
    await settle();
    expect(result.current.data).toBe(3);
    expect(result.current.refreshedAt).not.toBeNull();
  });

  it('loads once and waits when the interval is null, until refreshed', async () => {
    const load = vi.fn(async () => 'x');
    const { result } = renderHook(() => usePolling(load, null));
    await settle();
    await act(async () => void vi.advanceTimersByTime(60_000));
    expect(load).toHaveBeenCalledTimes(1);
    act(() => result.current.refresh());
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not ask while the tab is hidden, or while disabled', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const load = vi.fn(async () => 'x');
    renderHook(() => usePolling(load, 1000));
    await act(async () => void vi.advanceTimersByTime(5000));
    expect(load).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    const idle = vi.fn(async () => 'x');
    renderHook(() => usePolling(idle, 1000, false));
    await act(async () => void vi.advanceTimersByTime(5000));
    expect(idle).not.toHaveBeenCalled();
  });

  it('keeps the last answer when a refresh fails, and reports why', async () => {
    const load = vi.fn<() => Promise<string>>().mockResolvedValueOnce('first').mockRejectedValue(new ConsoleApiError(502, {}));
    const { result } = renderHook(() => usePolling(load, 1000));
    await settle();
    await act(async () => void vi.advanceTimersByTime(1000));
    await settle();
    expect(result.current.data).toBe('first');
    expect(result.current.error).toMatch(/did not answer/);
  });

  it('never shows the answer to a question it is no longer asking', async () => {
    const first = vi.fn(async () => 'shop');
    const second = vi.fn(() => new Promise<string>(() => undefined));
    const { result, rerender } = renderHook(({ load }) => usePolling(load, null), { initialProps: { load: first } });
    await settle();
    expect(result.current.data).toBe('shop');
    rerender({ load: second });
    expect(result.current.data).toBeNull();
  });
});
