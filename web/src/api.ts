export type UserRole = "payer" | "cashier" | "admin";

export interface RequestOptions {
  baseUrl: string;
}

export class WebWalletApi {
  constructor(private readonly options: RequestOptions) {}

  private async request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    const url = new URL(path, this.options.baseUrl).toString();
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      const message = payload?.error?.message ?? payload?.error?.code ?? `HTTP ${response.status}`;
      throw new Error(message);
    }

    return payload as T;
  }

  createAccount(input: { externalIdentity: string; displayName: string; roles: UserRole[] }) {
    return this.request("/v1/accounts", "POST", input);
  }

  registerDevice(input: {
    accountId: string;
    role: UserRole;
    publicKey: string;
    keyVersion: number;
  }) {
    return this.request("/v1/devices/register", "POST", input);
  }

  topUp(input: {
    accountId: string;
    amountCents: number;
    reference: string;
    actorAccountId?: string;
  }) {
    return this.request("/v1/wallet/topup", "POST", {
      ...input,
      currency: "CNY",
    });
  }

  getBalance(accountId: string) {
    return this.request(`/v1/wallet/${accountId}/balance`, "GET");
  }

  freezeDevice(input: { deviceId: string; reason: string; actorAccountId: string }) {
    return this.request(`/v1/devices/${input.deviceId}/freeze`, "POST", {
      reason: input.reason,
      actorAccountId: input.actorAccountId,
    });
  }

  startTransfer(input: { accountId: string; fromDeviceId: string; actorAccountId: string }) {
    return this.request("/v1/cards/transfer/start", "POST", input);
  }

  completeTransfer(input: {
    transferCode: string;
    newDevicePublicKey: string;
    keyVersion: number;
    actorAccountId: string;
  }) {
    return this.request("/v1/cards/transfer/complete", "POST", input);
  }

  syncOffline(input: {
    merchantDeviceId: string;
    submittedAt: string;
    transactions: unknown[];
  }) {
    return this.request("/v1/offline-transactions/sync", "POST", input);
  }
}
