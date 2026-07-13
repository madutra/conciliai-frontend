import Link from "next/link";
import { CalendarDays, ChevronRight, FolderOpen, Landmark, Plus, WifiOff } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewAccountForm } from "@/components/new-account-form";
import { NewBatchForm } from "@/components/new-batch-form";
import { BatchStatusBadge } from "@/components/status-badges";
import { formatDate, formatMonth } from "@/lib/format";
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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 sm:px-10">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight">Conciliações</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Conciliação bancária assistida por agentes de IA — determinístico primeiro, IA só nos órfãos.
        </p>
      </header>

      {loadError && (
        <Card className="animate-fade-up border-destructive/30 ring-destructive/20">
          <CardContent className="flex items-center gap-3">
            <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-full">
              <WifiOff className="size-4" />
            </span>
            <p className="text-destructive text-sm">{loadError}</p>
          </CardContent>
        </Card>
      )}

      <Card className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
        <CardHeader>
          <CardTitle>Nova conta bancária</CardTitle>
          <CardDescription>Cadastre uma conta para começar a conciliar extratos.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewAccountForm />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {accounts.length === 0 && !loadError && (
          <div className="animate-fade-up flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
            <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
              <Landmark className="size-5" />
            </span>
            <p className="text-sm font-medium">Nenhuma conta cadastrada ainda</p>
            <p className="text-muted-foreground text-sm">Crie a primeira conta no formulário acima.</p>
          </div>
        )}

        {accounts.map((account, i) => {
          const batches = batchesByAccount.get(account.id) ?? [];
          return (
            <Card key={account.id} className="animate-fade-up" style={{ "--stagger": i + 2 } as React.CSSProperties}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Landmark className="size-4" />
                  </span>
                  <div>
                    <CardTitle>{account.name}</CardTitle>
                    {(account.bankCode || account.accountNumber) && (
                      <CardDescription className="text-xs">
                        {[account.bankCode && `Banco ${account.bankCode}`, account.accountNumber]
                          .filter(Boolean)
                          .join(" · ")}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <CardAction>
                  <NewBatchForm bankAccountId={account.id} />
                </CardAction>
              </CardHeader>
              <CardContent>
                {batches.length === 0 ? (
                  <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm">
                    <FolderOpen className="size-4" />
                    Nenhuma conciliação ainda — escolha o mês e clique em{" "}
                    <span className="inline-flex items-center gap-0.5 font-medium">
                      <Plus className="size-3" /> Nova conciliação
                    </span>
                    .
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {batches.map((batch) => (
                      <li key={batch.id}>
                        <Link
                          href={`/batches/${batch.id}`}
                          className="group hover:bg-muted/60 hover:border-primary/30 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-all duration-200 hover:shadow-sm"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{formatMonth(batch.referenceMonth)}</span>
                              <span className="text-muted-foreground block text-xs">
                                Criado em {formatDate(batch.createdAt)}
                              </span>
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <BatchStatusBadge status={batch.status} />
                            <ChevronRight className="text-muted-foreground size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
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
