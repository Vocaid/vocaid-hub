import { describe, expect, it, vi } from "vitest";
import { createX402Fetch } from "../x402-fetch.js";
import { HubPaymentError } from "../../errors.js";

describe("createX402Fetch", () => {
  it("passes through non-402 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    }));

    const x402Fetch = createX402Fetch({
      onPaymentRequired: vi.fn(),
    });

    const response = await x402Fetch("https://example.com/api");
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);

    vi.restoreAllMocks();
  });

  it("handles 402 by calling onPaymentRequired and retrying", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        status: 402,
        ok: false,
        json: () => Promise.resolve({
          payment_required: {
            amount: "0.05",
            currency: "USDC",
            recipient: "0.0.98765",
          },
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

    vi.stubGlobal("fetch", mockFetch);

    const onPaymentRequired = vi.fn().mockResolvedValue({
      version: "x402-v2",
      chain: "hedera",
      transactionId: "0.0.123@456",
      amount: "0.05",
      currency: "USDC",
    });

    const x402Fetch = createX402Fetch({ onPaymentRequired });
    const response = await x402Fetch("https://example.com/api");

    expect(response.status).toBe(200);
    expect(onPaymentRequired).toHaveBeenCalledWith({
      amount: "0.05",
      currency: "USDC",
      recipient: "0.0.98765",
    });
    // Second call should include X-PAYMENT header
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });

  it("throws HubPaymentError when 402 body is malformed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 402,
      ok: false,
      json: () => Promise.resolve({ error: "pay up" }),
    }));

    const x402Fetch = createX402Fetch({
      onPaymentRequired: vi.fn(),
    });

    await expect(x402Fetch("https://example.com/api")).rejects.toThrow(HubPaymentError);

    vi.restoreAllMocks();
  });

  it("throws after max retries if payment keeps failing", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 402,
      ok: false,
      json: () => Promise.resolve({
        payment_required: {
          amount: "0.05",
          currency: "USDC",
          recipient: "0.0.98765",
        },
      }),
    });

    vi.stubGlobal("fetch", mockFetch);

    const x402Fetch = createX402Fetch({
      onPaymentRequired: vi.fn().mockResolvedValue({
        version: "x402-v2",
        chain: "hedera",
        transactionId: "0.0.123@456",
        amount: "0.05",
        currency: "USDC",
      }),
      maxRetries: 2,
    });

    await expect(x402Fetch("https://example.com/api")).rejects.toThrow("Payment failed after 2 attempts");

    vi.restoreAllMocks();
  });
});
