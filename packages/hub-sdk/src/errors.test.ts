import { describe, expect, it } from "vitest";
import {
  HubError,
  HubConfigError,
  HubConnectionError,
  HubChainError,
  HubPaymentError,
  HubIdentityError,
} from "./errors.js";

describe("Error hierarchy", () => {
  it("HubConfigError extends HubError", () => {
    const err = new HubConfigError("bad config");
    expect(err).toBeInstanceOf(HubError);
    expect(err).toBeInstanceOf(HubConfigError);
    expect(err.message).toBe("bad config");
    expect(err.name).toBe("HubConfigError");
  });

  it("HubChainError includes chain name", () => {
    const err = new HubChainError("hedera", "connection refused");
    expect(err.chain).toBe("hedera");
    expect(err.message).toBe("[hedera] connection refused");
  });

  it("HubPaymentError includes amount and chain", () => {
    const err = new HubPaymentError("insufficient balance", { chain: "base", amount: "1.50" });
    expect(err.chain).toBe("base");
    expect(err.amount).toBe("1.50");
  });

  it("HubIdentityError includes agentId", () => {
    const err = new HubIdentityError("not registered", { agentId: "0x123" });
    expect(err.agentId).toBe("0x123");
  });
});
