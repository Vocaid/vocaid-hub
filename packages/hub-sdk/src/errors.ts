export class HubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class HubConfigError extends HubError {}

export class HubConnectionError extends HubError {}

export class HubChainError extends HubError {
  readonly chain: string;

  constructor(chain: string, message: string) {
    super(`[${chain}] ${message}`);
    this.chain = chain;
  }
}

export class HubPaymentError extends HubError {
  readonly chain?: string;
  readonly amount?: string;

  constructor(message: string, details?: { chain?: string; amount?: string }) {
    super(message);
    this.chain = details?.chain;
    this.amount = details?.amount;
  }
}

export class HubIdentityError extends HubError {
  readonly agentId?: string;

  constructor(message: string, details?: { agentId?: string }) {
    super(message);
    this.agentId = details?.agentId;
  }
}
