import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewAccountForm } from "@/components/new-account-form";
import { NewBatchForm } from "@/components/new-batch-form";
import { BatchStatusBadge } from "@/components/status-badges";
import { formatDate } from "@/lib/format";
import { listBankAccounts, listBatches, type BankAccount, type ReconciliationBatch } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  let accounts: BankAccount[] = [];
  let loadError: string | null = null;

  try {
    accounts = await listBankAccounts();
  } catch {
    loadError = "Não foi possível conectar ao backend. Confirme se ele está rodando em http://localhost:3001.";
  }

  const batchesByAccount = new Map<string, ReconciliationBatch[]>();
  if (!loadError) {
    await Promise.all(
      accounts.map(async (account) => {
        batchesByAccount.set(account.id, await listBatches({ bankAccountId: account.id }));
      }),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">ConciliAI</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Conciliação bancária assistida por agentes de IA — determinístico primeiro, IA só nos órfãos.
        </p>
      </header>

      {loadError && (
        <Card className="border-destructive/50">
          <CardContent className="text-destructive text-sm">{loadError}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contas bancárias</CardTitle>
        </CardHeader>
        <CardContent>
          <NewAccountForm />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {accounts.length === 0 && !loadError && (
          <p className="text-muted-foreground text-sm">Nenhuma conta cadastrada ainda — crie uma acima.</p>
        )}

        {accounts.map((account) => {
          const batches = batchesByAccount.get(account.id) ?? [];
          return (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{account.name}</CardTitle>
                  {(account.bankCode || account.accountNumber) && (
                    <p className="text-muted-foreground text-xs">
                      {[account.bankCode, account.accountNumber].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <NewBatchForm bankAccountId={account.id} />
              </CardHeader>
              <CardContent>
                {batches.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma conciliação ainda.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {batches.map((batch) => (
                      <li key={batch.id}>
                        <Link
                          href={`/batches/${batch.id}`}
                          className="hover:bg-muted flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors"
                        >
                          <span>
                            Referência {batch.referenceMonth} — criado em {formatDate(batch.createdAt)}
                          </span>
                          <BatchStatusBadge status={batch.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
