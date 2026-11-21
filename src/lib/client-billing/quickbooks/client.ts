import type { Firm } from "@/generated/prisma/client";
import { intuitApiBase, INTUIT_MINOR_VERSION, type IntuitConfig, type IntuitEnvironment } from "./config";
import { QuickBooksError } from "./errors";
import { persistQuickBooksTokens, readStoredQuickBooksTokens, refreshQuickBooksTokens, type IntuitFetcher, type QuickBooksTokens } from "./tokens";

export type { IntuitFetcher, QuickBooksTokens };

const refreshSkewMs = 5 * 60 * 1000;

export type QboRef = { value?: string; name?: string };
export type QboCustomer = { Id?: string; DisplayName?: string; PrimaryEmailAddr?: { Address?: string } };
export type QboItem = { Id?: string; Name?: string; Type?: string };
export type QboAccount = { Id?: string; Name?: string; AccountType?: string; AccountSubType?: string };
export type QboLinkedTxn = { TxnId?: string; TxnType?: string };
export type QboInvoice = {
  Id?: string;
  SyncToken?: string;
  DocNumber?: string;
  TotalAmt?: number;
  Balance?: number;
  EmailStatus?: string;
  InvoiceLink?: string;
  LinkedTxn?: QboLinkedTxn[];
};
export type QboPayment = {
  Id?: string;
  TotalAmt?: number;
  TxnDate?: string;
  Line?: Array<{ Amount?: number; LinkedTxn?: QboLinkedTxn[] }>;
};
export type QboCompanyInfo = { Id?: string; CompanyName?: string };

type FaultBody = { Fault?: { Error?: Array<{ Message?: string; Detail?: string; code?: string }> } };

export function isQuickBooksEntityId(value: string | null | undefined): value is string {
  return Boolean(value && /^\d+$/.test(value));
}

export function escapeQuickBooksLiteral(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function quickBooksErrorFromResponse(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as FaultBody;
    const first = parsed.Fault?.Error?.[0];
    return new QuickBooksError(first?.Detail || first?.Message || `QuickBooks request failed (${response.status}).`, first?.code, response.status);
  } catch {
    return new QuickBooksError(`QuickBooks request failed (${response.status}).`, undefined, response.status);
  }
}

export class QuickBooksClient {
  private tokens: QuickBooksTokens;

  constructor(
    private readonly options: {
      config: IntuitConfig;
      environment: IntuitEnvironment;
      realmId: string;
      tokens: QuickBooksTokens;
      fetcher?: IntuitFetcher;
      onTokens?: (tokens: QuickBooksTokens) => Promise<void>;
    },
  ) {
    if (!isQuickBooksEntityId(options.realmId)) {
      throw new QuickBooksError("Unexpected QuickBooks company id.", "invalid_realm");
    }

    this.tokens = options.tokens;
  }

  currentTokens() {
    return this.tokens;
  }

  private fetcher() {
    return this.options.fetcher ?? fetch;
  }

  private endpoint(path: string, params?: Record<string, string>) {
    const url = new URL(`${intuitApiBase(this.options.environment)}${path}`);
    url.searchParams.set("minorversion", INTUIT_MINOR_VERSION);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async ensureAccessToken() {
    if (this.tokens.accessTokenExpiresAt.getTime() - Date.now() > refreshSkewMs) {
      return;
    }

    await this.refreshAccessToken();
  }

  private async refreshAccessToken() {
    const next = await refreshQuickBooksTokens(this.options.config, this.tokens.refreshToken, this.fetcher());
    this.tokens = next;
    await this.options.onTokens?.(next);
  }

  private async request<T>(method: string, path: string, options?: { params?: Record<string, string>; body?: unknown; emptyBody?: boolean }): Promise<T> {
    await this.ensureAccessToken();

    const send = () => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        Accept: "application/json",
      };
      let body: string | undefined;
      if (options?.emptyBody) {
        headers["Content-Type"] = "application/octet-stream";
        body = "";
      } else if (options?.body !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(options.body);
      }

      return this.fetcher()(this.endpoint(path, options?.params), { method, headers, body });
    };

    let response = await send();
    if (response.status === 401) {
      await response.text().catch(() => undefined);
      await this.refreshAccessToken();
      response = await send();
    }

    if (!response.ok) {
      throw await quickBooksErrorFromResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  private companyPath(suffix: string) {
    return `/v3/company/${this.options.realmId}${suffix}`;
  }

  async query<T>(statement: string, entity: string) {
    const payload = await this.request<{ QueryResponse?: Record<string, unknown> }>("GET", this.companyPath("/query"), {
      params: { query: statement },
    });
    const rows = payload.QueryResponse?.[entity];
    return Array.isArray(rows) ? (rows as T[]) : [];
  }

  async getCompanyInfo() {
    const payload = await this.request<{ CompanyInfo?: QboCompanyInfo }>("GET", this.companyPath(`/companyinfo/${this.options.realmId}`));
    if (!payload.CompanyInfo) {
      throw new QuickBooksError("QuickBooks did not return company info.", "invalid_response");
    }
    return payload.CompanyInfo;
  }

  async getCustomer(customerId: string) {
    this.assertEntityId(customerId);
    const payload = await this.request<{ Customer?: QboCustomer }>("GET", this.companyPath(`/customer/${customerId}`));
    return payload.Customer;
  }

  async createCustomer(body: Record<string, unknown>) {
    const payload = await this.request<{ Customer?: QboCustomer }>("POST", this.companyPath("/customer"), { body });
    if (!payload.Customer?.Id) {
      throw new QuickBooksError("QuickBooks did not return a customer.", "invalid_response");
    }
    return payload.Customer;
  }

  async getItem(itemId: string) {
    this.assertEntityId(itemId);
    const payload = await this.request<{ Item?: QboItem }>("GET", this.companyPath(`/item/${itemId}`));
    return payload.Item;
  }

  async createItem(body: Record<string, unknown>) {
    const payload = await this.request<{ Item?: QboItem }>("POST", this.companyPath("/item"), { body });
    if (!payload.Item?.Id) {
      throw new QuickBooksError("QuickBooks did not return an item.", "invalid_response");
    }
    return payload.Item;
  }

  async createInvoice(body: Record<string, unknown>) {
    const payload = await this.request<{ Invoice?: QboInvoice }>("POST", this.companyPath("/invoice"), { body });
    if (!payload.Invoice?.Id) {
      throw new QuickBooksError("QuickBooks did not return an invoice.", "invalid_response");
    }
    return payload.Invoice;
  }

  async getInvoice(invoiceId: string) {
    this.assertEntityId(invoiceId);
    const payload = await this.request<{ Invoice?: QboInvoice }>("GET", this.companyPath(`/invoice/${invoiceId}`), {
      params: { include: "invoiceLink" },
    });
    if (!payload.Invoice?.Id) {
      throw new QuickBooksError("QuickBooks did not return an invoice.", "invalid_response");
    }
    return payload.Invoice;
  }

  async sendInvoice(invoiceId: string, email: string) {
    this.assertEntityId(invoiceId);
    const payload = await this.request<{ Invoice?: QboInvoice }>("POST", this.companyPath(`/invoice/${invoiceId}/send`), {
      params: { sendTo: email },
      emptyBody: true,
    });
    return payload.Invoice;
  }

  async getPayment(paymentId: string) {
    this.assertEntityId(paymentId);
    const payload = await this.request<{ Payment?: QboPayment }>("GET", this.companyPath(`/payment/${paymentId}`));
    if (!payload.Payment?.Id) {
      throw new QuickBooksError("QuickBooks did not return a payment.", "invalid_response");
    }
    return payload.Payment;
  }

  private assertEntityId(id: string) {
    if (!isQuickBooksEntityId(id)) {
      throw new QuickBooksError("Unexpected QuickBooks id.", "invalid_id");
    }
  }
}

export function firmQuickBooksEnvironment(firm: Pick<Firm, "quickbooksEnvironment">, config: IntuitConfig): IntuitEnvironment {
  if (firm.quickbooksEnvironment === "production" || firm.quickbooksEnvironment === "sandbox") {
    return firm.quickbooksEnvironment;
  }

  return config.environment;
}

export async function quickBooksClientForFirm(firm: Firm, config: IntuitConfig, fetcher?: IntuitFetcher) {
  if (!isQuickBooksEntityId(firm.quickbooksRealmId)) {
    throw new QuickBooksError("QuickBooks is not connected for this office.", "not_connected");
  }

  let tokens: QuickBooksTokens | null;
  try {
    tokens = readStoredQuickBooksTokens(firm, config);
  } catch (error) {
    if (error instanceof QuickBooksError && error.code === "token_unreadable") {
      throw error;
    }
    throw error;
  }

  if (!tokens) {
    throw new QuickBooksError("QuickBooks is not connected for this office.", "not_connected");
  }

  return new QuickBooksClient({
    config,
    environment: firmQuickBooksEnvironment(firm, config),
    realmId: firm.quickbooksRealmId,
    tokens,
    fetcher,
    onTokens: async (next) => {
      await persistQuickBooksTokens(firm.id, next, config);
    },
  });
}
