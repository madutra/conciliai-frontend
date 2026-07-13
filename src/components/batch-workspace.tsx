"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate, formatPct } from "@/lib/format";
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

function UploadRow({
  label,
  fileName,
  uploading,
  onSelect,
}: {
  label: string;
  fileName: string | null;
  uploading: boolean;
  onSelect: (file: File) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {fileName ? (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> {fileName}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">Nenhum arquivo enviado ainda</p>
        )}
      </div>
      <div>
        <input
          type="file"
          accept=".csv,.ofx"
          disabled={uploading}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-secondary-foreground file:text-sm hover:file:bg-secondary/80"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = "";
          }}
        />
        {uploading && <Loader2 className="ml-2 inline size-4 animate-spin" />}
      </div>
    </div>
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
      toast.success(status === "RESOLVED" ? "Sugestão aceita" : "Divergência ignorada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar divergência");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-3.5" /> Contas
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {batch.bankAccount?.name} — {batch.referenceMonth}
            </h1>
            <p className="text-muted-foreground text-sm">Criado em {formatDate(batch.createdAt)}</p>
          </div>
          <BatchStatusBadge status={batch.status} />
        </div>
      </div>

      {!bothUploaded && (
        <Card>
          <CardHeader>
            <CardTitle>Upload de arquivos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <UploadRow
              label="Extrato bancário"
              fileName={batch.bankFileName}
              uploading={uploadingBank}
              onSelect={(file) => handleUpload("bank", file)}
            />
            <UploadRow
              label="Razão contábil (Protheus)"
              fileName={batch.ledgerFileName}
              uploading={uploadingLedger}
              onSelect={(file) => handleUpload("ledger", file)}
            />
          </CardContent>
        </Card>
      )}

      {canRun && (
        <Card>
          <CardHeader>
            <CardTitle>Pronto para conciliar</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Os dois arquivos foram importados. Rode o pipeline: matching determinístico primeiro, Investigator
              Agent (IA) só nos lançamentos que sobrarem sem match.
            </p>
            <Button onClick={handleRun} disabled={running}>
              {running && <Loader2 className="mr-2 size-4 animate-spin" />}
              {running ? "Rodando…" : "Rodar conciliação"}
            </Button>
          </CardContent>
        </Card>
      )}

      {showDashboard && summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Extrato bancário</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-2xl font-semibold">{formatPct(summary.bank.pct)}</p>
                <Progress value={summary.bank.pct * 100} />
                <p className="text-muted-foreground text-xs">
                  {summary.bank.matched} de {summary.bank.total} lançamentos conciliados
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Razão contábil</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-2xl font-semibold">{formatPct(summary.ledger.pct)}</p>
                <Progress value={summary.ledger.pct * 100} />
                <p className="text-muted-foreground text-xs">
                  {summary.ledger.matched} de {summary.ledger.total} lançamentos conciliados
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Divergências ({summary.divergences.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.divergences.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma divergência — tudo conciliado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Lançamento</TableHead>
                      <TableHead>Causa sugerida (IA)</TableHead>
                      <TableHead>Explicação</TableHead>
                      <TableHead>Confiança</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.divergences.map((d) => {
                      const rec = divergenceRecord(d);
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="whitespace-nowrap text-xs">{rec.label}</TableCell>
                          <TableCell className="max-w-52">
                            <p className="truncate text-sm">{rec.description}</p>
                            <p className="text-muted-foreground text-xs">
                              {rec.date && formatDate(rec.date)} · {rec.amount !== null && formatCurrency(rec.amount)}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            {d.suggestedCause?.toLowerCase().replaceAll("_", " ") ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-64">
                            <p className="text-muted-foreground text-xs">{d.aiExplanation ?? "—"}</p>
                          </TableCell>
                          <TableCell>
                            <ConfidenceBadge confidence={d.aiConfidence} />
                          </TableCell>
                          <TableCell>
                            <DivergenceStatusBadge status={d.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {d.status === "OPEN" && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updatingId === d.id}
                                  onClick={() => handleDivergenceStatus(d.id, "RESOLVED")}
                                >
                                  Aceitar sugestão
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={updatingId === d.id}
                                  onClick={() => handleDivergenceStatus(d.id, "IGNORED")}
                                >
                                  Ignorar
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
