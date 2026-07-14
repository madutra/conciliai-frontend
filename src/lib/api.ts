const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type BatchStatus = "UPLOADED" | "PROCESSING" | "MATCHED" | "REVIEWED" | "CLOSED";
export type TxStatus = "UNMATCHED" | "MATCHED" | "PARTIAL";
export type AccountNature = "ASSET" | "LIABILITY";
export type MatchLeg = "BANK_VS_FINANCIAL" | "FINANCIAL_VS_LEDGER" | "BANK_VS_LEDGER";
export type DivergenceType =
  | "MISSING_IN_LEDGER"
  | "MISSING_IN_BANK"
  | "MISSING_IN_FINANCIAL"
  | "VALUE_MISMATCH"
  | "DUPLICATE";
export type DivergenceStatus = "OPEN" | "RESOLVED" | "IGNORED";

export interface BankAccount {
  id: string;
  name: string;
  bankCode: string | null;
  accountNumber: string | null;
  nature: AccountNature;
  createdAt: string;
}

export interface ReconciliationBatch {
  id: string;
  bankAccountId: string;
  referenceMonth: string;
  status: BatchStatus;
  bankFileName: string | null;
  financialFileName: string | null;
  ledgerFileName: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccount?: BankAccount;
}

export interface BankTransaction {
  id: string;
  batchId: string;
  date: string;
  amount: string;
  rawDescription: string;
  fitId: string | null;
  status: TxStatus;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  batchId: string;
  date: string;
  amount: string;
  historico: string;
  documentNumber: string | null;
  accountCode: string | null;
  status: TxStatus;
  createdAt: string;
}

export interface FinancialEntry {
  id: string;
  batchId: string;
  date: string;
  amount: string;
  description: string;
  documentNumber: string | null;
  statusVsBank: TxStatus;
  statusVsLedger: TxStatus;
  createdAt: string;
}

export interface Divergence {
  id: string;
  batchId: string;
  leg: MatchLeg;
  type: DivergenceType;
  bankTransactionId: string | null;
  bankTransaction: BankTransaction | null;
  financialEntryId: string | null;
  financialEntry: FinancialEntry | null;
  ledgerEntryId: string | null;
  ledgerEntry: LedgerEntry | null;
  aiExplanation: string | null;
  suggestedCause: string | null;
  suggestedAccount: string | null;
  aiConfidence: number | null;
  status: DivergenceStatus;
  createdAt: string;
}

export interface BatchSummary {
  threeWay: boolean;
  bank: { total: number; matched: number; pct: number };
  financial: {
    total: number;
    matchedVsBank: number;
    matchedVsLedger: number;
    pctVsBank: number;
    pctVsLedger: number;
  };
  ledger: { total: number; matched: number; pct: number };
  divergences: Divergence[];
}

export interface LegStats {
  internalOffset: number;
  docNumber: number;
  exact: number;
  fuzzyDate: number;
  manyToOne: number;
  remainingA: number;
  remainingB: number;
}

export interface RunReconciliationResult {
  matching: {
    threeWay: boolean;
    legs: Record<string, LegStats>;
  };
  investigation: { investigated: number };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json", ...init?.headers }
        : init?.headers,
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      message = JSON.parse(body).message ?? body;
    } catch {
      // corpo não é JSON, mantém texto cru
    }
    throw new Error(`${res.status}: ${message}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function listBankAccounts(): Promise<BankAccount[]> {
  return apiFetch("/bank-accounts");
}

export function createBankAccount(data: {
  name: string;
  bankCode?: string;
  accountNumber?: string;
  nature?: AccountNature;
}): Promise<BankAccount> {
  return apiFetch("/bank-accounts", { method: "POST", body: JSON.stringify(data) });
}

export function listBatches(params?: { bankAccountId?: string }): Promise<ReconciliationBatch[]> {
  const qs = params?.bankAccountId ? `?bankAccountId=${params.bankAccountId}` : "";
  return apiFetch(`/batches${qs}`);
}

export function getBatch(batchId: string): Promise<ReconciliationBatch> {
  return apiFetch(`/batches/${batchId}`);
}

export function createBatch(data: { bankAccountId: string; referenceMonth: string }): Promise<ReconciliationBatch> {
  return apiFetch("/batches", { method: "POST", body: JSON.stringify(data) });
}

export function uploadBankStatement(batchId: string, file: File): Promise<{ imported: number; source: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch(`/batches/${batchId}/upload/bank-statement`, { method: "POST", body: form });
}

export function uploadFinancialStatement(
  batchId: string,
  file: File,
): Promise<{ imported: number; source: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch(`/batches/${batchId}/upload/financial-statement`, { method: "POST", body: form });
}

export function uploadLedger(batchId: string, file: File): Promise<{ imported: number; source: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch(`/batches/${batchId}/upload/ledger`, { method: "POST", body: form });
}

export function runReconciliation(batchId: string): Promise<RunReconciliationResult> {
  return apiFetch(`/batches/${batchId}/run`, { method: "POST" });
}

export function getSummary(batchId: string): Promise<BatchSummary> {
  return apiFetch(`/batches/${batchId}/summary`);
}

export function updateDivergenceStatus(
  batchId: string,
  divergenceId: string,
  status: DivergenceStatus,
): Promise<Divergence> {
  return apiFetch(`/batches/${batchId}/divergences/${divergenceId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
