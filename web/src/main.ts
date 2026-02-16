import "./styles.css";
import { WebWalletApi, type UserRole } from "./api";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing root app node");
}

app.innerHTML = `
<div class="container">
  <section class="header">
    <h1>Offline QR Wallet Web Console</h1>
    <p>Browser-only operations console for deployment environments without iOS app availability.</p>
    <div class="backend-row">
      <input id="baseUrl" value="http://localhost:8080" placeholder="Backend URL" />
      <button id="healthBtn" type="button">Check Health</button>
    </div>
  </section>

  <section class="grid">
    <article class="card" id="createAccountCard">
      <h2>Create Account</h2>
      <p>Provision internal user identity and roles.</p>
      <form id="createAccountForm">
        <input name="externalIdentity" placeholder="external identity" required />
        <input name="displayName" placeholder="display name" required />
        <input name="roles" placeholder="roles (comma separated: payer,cashier,admin)" value="payer" required />
        <button>Create Account</button>
      </form>
      <pre class="output" id="createAccountOut"></pre>
    </article>

    <article class="card" id="registerDeviceCard">
      <h2>Register Device</h2>
      <p>Bind a role-specific public key identity to account.</p>
      <form id="registerDeviceForm">
        <input name="accountId" placeholder="account UUID" required />
        <select name="role" required>
          <option value="payer">payer</option>
          <option value="cashier">cashier</option>
          <option value="admin">admin</option>
        </select>
        <input name="publicKey" placeholder="device public key" required />
        <input name="keyVersion" type="number" min="1" value="1" required />
        <button>Register Device</button>
      </form>
      <pre class="output" id="registerDeviceOut"></pre>
    </article>

    <article class="card" id="topupCard">
      <h2>Top-up Wallet</h2>
      <p>Credit wallet value in central ledger.</p>
      <form id="topupForm">
        <input name="accountId" placeholder="account UUID" required />
        <input name="amountCents" type="number" min="1" placeholder="amount cents" required />
        <input name="reference" placeholder="reference" value="web-topup" required />
        <input name="actorAccountId" placeholder="actor account UUID (optional)" />
        <button>Top Up</button>
      </form>
      <pre class="output" id="topupOut"></pre>
    </article>

    <article class="card" id="balanceCard">
      <h2>Query Balance</h2>
      <p>Read current authoritative wallet snapshot.</p>
      <form id="balanceForm">
        <input name="accountId" placeholder="account UUID" required />
        <button>Get Balance</button>
      </form>
      <pre class="output" id="balanceOut"></pre>
    </article>

    <article class="card" id="transferStartCard">
      <h2>Start Card Transfer</h2>
      <p>Generate transfer challenge to move card to new phone.</p>
      <form id="transferStartForm">
        <input name="accountId" placeholder="account UUID" required />
        <input name="fromDeviceId" placeholder="current device UUID" required />
        <input name="actorAccountId" placeholder="actor account UUID" required />
        <button>Start Transfer</button>
      </form>
      <pre class="output" id="transferStartOut"></pre>
    </article>

    <article class="card" id="transferCompleteCard">
      <h2>Complete Card Transfer</h2>
      <p>Activate new device and revoke old card device.</p>
      <form id="transferCompleteForm">
        <input name="transferCode" placeholder="transfer code" required />
        <input name="newDevicePublicKey" placeholder="new device public key" required />
        <input name="keyVersion" type="number" min="1" value="1" required />
        <input name="actorAccountId" placeholder="actor account UUID" required />
        <button>Complete Transfer</button>
      </form>
      <pre class="output" id="transferCompleteOut"></pre>
    </article>

    <article class="card" id="freezeCard">
      <h2>Freeze Device</h2>
      <p>Risk control action for compromised devices.</p>
      <form id="freezeForm">
        <input name="deviceId" placeholder="device UUID" required />
        <input name="reason" placeholder="freeze reason" required />
        <input name="actorAccountId" placeholder="actor account UUID" required />
        <button>Freeze Device</button>
      </form>
      <pre class="output" id="freezeOut"></pre>
    </article>

    <article class="card" id="syncCard">
      <h2>Offline Sync Upload</h2>
      <p>Manual merchant sync for queued offline transactions (JSON array).</p>
      <form id="syncForm">
        <input name="merchantDeviceId" placeholder="merchant device UUID" required />
        <textarea name="transactions" placeholder='[{"txId":"...", ...}]' required></textarea>
        <button>Upload Sync</button>
      </form>
      <pre class="output" id="syncOut"></pre>
    </article>
  </section>
</div>
`;

const getBaseUrl = (): string => {
  const input = document.querySelector<HTMLInputElement>("#baseUrl");
  if (!input || !input.value.trim()) {
    throw new Error("Missing backend URL");
  }
  return input.value.trim();
};

const writeOutput = (selector: string, data: unknown, isError = false): void => {
  const out = document.querySelector<HTMLElement>(selector);
  if (!out) {
    return;
  }

  out.classList.toggle("error", isError);
  out.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
};

const withApi = async <T>(fn: (api: WebWalletApi) => Promise<T>): Promise<T> => fn(new WebWalletApi({ baseUrl: getBaseUrl() }));

const bindForm = (formSelector: string, outSelector: string, handler: (form: HTMLFormElement, api: WebWalletApi) => Promise<unknown>) => {
  const form = document.querySelector<HTMLFormElement>(formSelector);
  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit'], button:not([type])") as HTMLButtonElement | null;
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const result = await withApi((api) => handler(form, api));
      writeOutput(outSelector, result);
    } catch (error) {
      writeOutput(outSelector, error instanceof Error ? error.message : String(error), true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
};

const parseRoles = (raw: string): UserRole[] => {
  const roles = raw
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  const allowed: UserRole[] = ["payer", "cashier", "admin"];
  for (const role of roles) {
    if (!allowed.includes(role as UserRole)) {
      throw new Error(`Unsupported role: ${role}`);
    }
  }
  return roles as UserRole[];
};

const field = (form: HTMLFormElement, name: string): string => {
  const input = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  if (!input) {
    throw new Error(`Missing form field: ${name}`);
  }
  return input.value.trim();
};

bindForm("#createAccountForm", "#createAccountOut", async (form, api) =>
  api.createAccount({
    externalIdentity: field(form, "externalIdentity"),
    displayName: field(form, "displayName"),
    roles: parseRoles(field(form, "roles")),
  }),
);

bindForm("#registerDeviceForm", "#registerDeviceOut", async (form, api) =>
  api.registerDevice({
    accountId: field(form, "accountId"),
    role: field(form, "role") as UserRole,
    publicKey: field(form, "publicKey"),
    keyVersion: Number(field(form, "keyVersion")),
  }),
);

bindForm("#topupForm", "#topupOut", async (form, api) => {
  const actor = field(form, "actorAccountId");
  return api.topUp({
    accountId: field(form, "accountId"),
    amountCents: Number(field(form, "amountCents")),
    reference: field(form, "reference"),
    actorAccountId: actor || undefined,
  });
});

bindForm("#balanceForm", "#balanceOut", (form, api) => api.getBalance(field(form, "accountId")));

bindForm("#transferStartForm", "#transferStartOut", (form, api) =>
  api.startTransfer({
    accountId: field(form, "accountId"),
    fromDeviceId: field(form, "fromDeviceId"),
    actorAccountId: field(form, "actorAccountId"),
  }),
);

bindForm("#transferCompleteForm", "#transferCompleteOut", (form, api) =>
  api.completeTransfer({
    transferCode: field(form, "transferCode"),
    newDevicePublicKey: field(form, "newDevicePublicKey"),
    keyVersion: Number(field(form, "keyVersion")),
    actorAccountId: field(form, "actorAccountId"),
  }),
);

bindForm("#freezeForm", "#freezeOut", (form, api) =>
  api.freezeDevice({
    deviceId: field(form, "deviceId"),
    reason: field(form, "reason"),
    actorAccountId: field(form, "actorAccountId"),
  }),
);

bindForm("#syncForm", "#syncOut", (form, api) => {
  const transactionsRaw = field(form, "transactions");
  const transactions = JSON.parse(transactionsRaw) as unknown[];
  return api.syncOffline({
    merchantDeviceId: field(form, "merchantDeviceId"),
    submittedAt: new Date().toISOString(),
    transactions,
  });
});

const healthBtn = document.querySelector<HTMLButtonElement>("#healthBtn");
healthBtn?.addEventListener("click", async () => {
  healthBtn.disabled = true;
  try {
    const url = new URL("/health", getBaseUrl()).toString();
    const response = await fetch(url);
    const payload = await response.json();
    window.alert(`Backend healthy: ${payload.timestamp}`);
  } catch (error) {
    window.alert(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    healthBtn.disabled = false;
  }
});
