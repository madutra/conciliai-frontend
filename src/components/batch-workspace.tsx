"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  FileUp,
  Landmark,
  Loader2,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BatchStatusBadge, DivergenceStatusBadge, ConfidenceBadge } from "@/components/status-badges";
import { formatCurrency, formatDate, formatMonth, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getBatch,
  getSummary,
  runReconciliation,
  updateDivergenceStatus,
  uploadBankStatement,
  uploadLedger,
  type BatchSummary,
  type Divergence,
  type ReconciliationBatch,
} from "@/lib/api";

function divergenceRecord(d: Divergence) {
  if (d.type === "MISSING_IN_LEDGER" && d.bankTransaction) {
    return {
      label: "Falta no razão",
      date: d.bankTransaction.date,
      amount: d.bankTransaction.amount,
      description: d.bankTransaction.rawDescription,
    };
  }
  if (d.type === "MISSING_IN_BANK" && d.ledgerEntry) {
    return {
      label: "Falta no extrato",
      date: d.ledgerEntry.date,
      amount: d.ledgerEntry.amount,
      description: d.ledgerEntry.historico,
    };
  }
  return { label: d.type, date: null, amount: null, description: "—" };
}

const STEPS = ["Upload dos arquivos", "Conciliação", "Revisão"] as const;

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto sm:gap-3">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2 sm:gap-3">
            {i > 0 && (
              <span
                className={cn(
                  "h-px w-6 transition-colors duration-500 sm:w-10",
                  done || active ? "bg-primary/60" : "bg-border",
                )}
              />
            )}
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium transition-all duration-300",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-primary/10 text-primary ring-primary/40 ring-1",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap sm:text-sm",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function UploadCard({
  label,
  hint,
  fileName,
  uploading,
  onSelect,
}: {
  label: string;
  hint: string;
  fileName: string | null;
  uploading: boolean;
  onSelect: (file: File) => void;
}) {
  const inputId = useId();
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200",
        fileName
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "hover:border-primary/50 hover:bg-primary/5",
        uploading && "pointer-events-none opacity-70",
      )}
    >
      <input
        id={inputId}
        type="file"
        accept=".csv,.ofx"
        disabled={uploading}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full transition-all duration-200",
          fileName
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:-translate-y-0.5",
        )}
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : fileName ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <FileUp className="size-5" />
        )}
      </span>
      <span className="text-sm font-medium">{label}</span>
      {fileName ? (
        <span className="text-muted-foreground max-w-full truncate text-xs">{fileName}</span>
      ) : (
        <span className="text-muted-foreground text-xs">
          {uploading ? "Importando…" : hint}
        </span>
      )}
    </label>
  );
}

function KpiCard({
  icon,
  title,
  pct,
  matched,
  total,
  stagger,
}: {
  icon: React.ReactNode;
  title: string;
  pct: number;
  matched: number;
  total: number;
  stagger: number;
}) {
  return (
    <Card className="animate-fade-up" style={{ "--stagger": stagger } as React.CSSProperties}>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">{icon}</span>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatPct(pct)}</p>
        <Progress value={pct * 100} />
        <p className="text-muted-foreground text-xs tabular-nums">
          {matched} de {total} lançamentos conciliados
        </p>
      </CardContent>
    </Card>
  );
}

export function BatchWorkspace({
  initialBatch,
  initialSummary,
}: {
  initialBatch: ReconciliationBatch;
  initialSummary: BatchSummary | null;
}) {
  const [batch, setBatch] = useState(initialBatch);
  const [summary, setSummary] = useState(initialSummary);
  const [uploadingBank, setUploadingBank] = useState(false);
  const [uploadingLedger, setUploadingLedger] = useState(false);
  const [running, setRunning] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const bothUploaded = Boolean(batch.bankFileName && batch.ledgerFileName);
  const canRun = bothUploaded && batch.status === "UPLOADED";
  const showDashboard = batch.status === "MATCHED" || batch.status === "REVIEWED";
  const currentStep = batch.status === "REVIEWED" ? 3 : showDashboard ? 2 : bothUploaded ? 1 : 0;

  async function handleUpload(kind: "bank" | "ledger", file: File) {
    const setUploading = kind === "bank" ? setUploadingBank : setUploadingLedger;
    setUploading(true);
    try {
      const result = kind === "bank" ? await uploadBankStatement(batch.id, file) : await uploadLedger(batch.id, file);
      toast.success(`${result.imported} lançamentos importados`);
      setBatch(await getBatch(batch.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    try {
      await runReconciliation(batch.id);
      const [refreshedBatch, refreshedSummary] = await Promise.all([getBatch(batch.id), getSummary(batch.id)]);
      setBatch(refreshedBatch);
      setSummary(refreshedSummary);
      toast.success("Conciliação concluída");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao rodar conciliação");
    } finally {
      setRunning(false);
    }
  }

  async function handleDivergenceStatus(divergenceId: string, status: "RESOLVED" | "IGNORED") {
    setUpdatingId(divergenceId);
    try {
      const updated = await updateDivergenceStatus(batch.id, divergenceId, status);
      setSummary((prev) =>
        prev
          ? { ...prev, divergences: prev.divergences.map((d) => (d.id === divergenceId ? { ...d, ...updated } : d)) }
          : prev,
      );
      const refreshedBatch = await getBatch(batch.id);
      setBatch(refreshedBatch);
      if (refreshedBatch.status === "REVIEWED" && batch.status !== "REVIEWED") {
        toast.success("Revisão concluída — todas as divergências foram tratadas");
      } else {
        toast.success(status === "RESOLVED" ? "Sugestão aceita" : "Divergência ignorada");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar divergência");
    } finally {
      setUpdatingId(null);
    }
  }

  const openCount = summary?.divergences.filter((d) => d.status === "OPEN").length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="animate-fade-up">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground group mb-3 inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" /> Contas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {batch.bankAccount?.name} — {formatMonth(batch.referenceMonth)}
            </h1>
            <p className="text-muted-foreground text-sm">Criado em {formatDate(batch.createdAt)}</p>
          </div>
          <BatchStatusBadge status={batch.status} />
        </div>
      </div>

      <div className="animate-fade-up" style={{ "--stagger": 1 } as React.CSSProperties}>
        <Stepper current={currentStep} />
      </div>

      {!bothUploaded && (
        <Card className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Upload de arquivos</CardTitle>
            <CardDescription>
              Envie o extrato do banco e o razão contábil do mês para liberar a conciliação.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UploadCard
              label="Extrato bancário"
              hint="Clique para escolher um arquivo .csv ou .ofx"
              fileName={batch.bankFileName}
              uploading={uploadingBank}
              onSelect={(file) => handleUpload("bank", file)}
            />
            <UploadCard
              label="Razão contábil (Protheus)"
              hint="Clique para escolher um arquivo .csv ou .ofx"
              fileName={batch.ledgerFileName}
              uploading={uploadingLedger}
              onSelect={(file) => handleUpload("ledger", file)}
            />
          </CardContent>
        </Card>
      )}

      {canRun && (
        <Card className="animate-fade-up border-primary/20 bg-primary/5 ring-primary/15">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Pronto para conciliar</p>
                <p className="text-muted-foreground text-sm">
                  Matching determinístico primeiro; o Investigator Agent (IA) analisa só os lançamentos sem match.
                </p>
              </div>
            </div>
            <Button onClick={handleRun} disabled={running}>
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {running ? "Rodando…" : "Rodar conciliação"}
            </Button>
          </CardContent>
        </Card>
      )}

      {showDashboard && summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              icon={<Landmark className="size-4" />}
              title="Extrato bancário"
              pct={summary.bank.pct}
              matched={summary.bank.matched}
              total={summary.bank.total}
              stagger={2}
            />
            <KpiCard
              icon={<BookOpen className="size-4" />}
              title="Razão contábil"
              pct={summary.ledger.pct}
              matched={summary.ledger.matched}
              total={summary.ledger.total}
              stagger={3}
            />
          </div>

          <Card className="animate-fade-up" style={{ "--stagger": 4 } as React.CSSProperties}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Divergências</CardTitle>
                <Badge variant="secondary" className="tabular-nums">
                  {summary.divergences.length}
                </Badge>
                {openCount > 0 && (
                  <Badge variant="outline" className="gap-1.5">
                    <span className="size-1.5 rounded-full bg-red-500 dark:bg-red-400" />
                    {openCount} em aberto
                  </Badge>
                )}
              </div>
              {summary.divergences.length > 0 && (
                <CardDescription>
                  Revise cada lançamento sem correspondência: aceite a causa sugerida pela IA ou ignore a divergência.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {summary.divergences.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <p className="text-sm font-medium">Nenhuma divergência</p>
                  <p className="text-muted-foreground text-sm">Todos os lançamentos foram conciliados.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="px-3">Tipo</TableHead>
                        <TableHead className="px-3">Lançamento</TableHead>
                        <TableHead className="px-3 text-right">Valor</TableHead>
                        <TableHead className="px-3">Análise da IA</TableHead>
                        <TableHead className="px-3">Confiança</TableHead>
                        <TableHead className="px-3">Status</TableHead>
                        <TableHead className="px-3 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.divergences.map((d, i) => {
                        const rec = divergenceRecord(d);
                        const amount = rec.amount === null ? null : Number(rec.amount);
                        return (
                          <TableRow
                            key={d.id}
                            className="animate-fade-in"
                            style={{ "--stagger": Math.min(i, 8) } as React.CSSProperties}
                          >
                            <TableCell className="px-3">
                              <Badge variant="outline" className="whitespace-nowrap">
                                {rec.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-56 px-3 py-3">
                              <p className="truncate text-sm font-medium" title={rec.description ?? undefined}>
                                {rec.description}
                              </p>
                              {rec.date && (
                                <p className="text-muted-foreground text-xs">{formatDate(rec.date)}</p>
                              )}
                            </TableCell>
                            <TableCell className="px-3 text-right">
                              {amount === null ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : (
                                <span
                                  className={cn(
                                    "text-sm font-medium whitespace-nowrap tabular-nums",
                                    amount < 0
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-emerald-700 dark:text-emerald-400",
                                  )}
                                >
                                  {formatCurrency(amount)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-72 px-3 py-3 whitespace-normal">
                              {d.suggestedCause ? (
                                <p className="text-sm capitalize">
                                  {d.suggestedCause.toLowerCase().replaceAll("_", " ")}
                                </p>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                              {d.aiExplanation && (
                                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                                  {d.aiExplanation}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="px-3">
                              <ConfidenceBadge confidence={d.aiConfidence} />
                            </TableCell>
                            <TableCell className="px-3">
                              <DivergenceStatusBadge status={d.status} />
                            </TableCell>
                            <TableCell className="px-3 text-right">
                              {d.status === "OPEN" &&
                                (updatingId === d.id ? (
                                  <Loader2 className="text-muted-foreground ml-auto size-4 animate-spin" />
                                ) : (
                                  <div className="flex justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={updatingId !== null}
                                      onClick={() => handleDivergenceStatus(d.id, "RESOLVED")}
                                    >
                                      <Check className="size-3.5" /> Aceitar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={updatingId !== null}
                                      onClick={() => handleDivergenceStatus(d.id, "IGNORED")}
                                    >
                                      <X className="size-3.5" /> Ignorar
                                    </Button>
                                  </div>
                                ))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
