import { Badge } from "@/components/ui/badge";
import type { BatchStatus, DivergenceStatus } from "@/lib/api";

const BATCH_STATUS_STYLE: Record<BatchStatus, string> = {
  UPLOADED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  PROCESSING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  MATCHED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  REVIEWED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  CLOSED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  UPLOADED: "Aguardando arquivos",
  PROCESSING: "Processando",
  MATCHED: "Conciliado",
  REVIEWED: "Revisado",
  CLOSED: "Fechado",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <Badge className={BATCH_STATUS_STYLE[status]}>{BATCH_STATUS_LABEL[status]}</Badge>;
}

const DIVERGENCE_STATUS_STYLE: Record<DivergenceStatus, string> = {
  OPEN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  IGNORED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const DIVERGENCE_STATUS_LABEL: Record<DivergenceStatus, string> = {
  OPEN: "Em aberto",
  RESOLVED: "Resolvida",
  IGNORED: "Ignorada",
};

export function DivergenceStatusBadge({ status }: { status: DivergenceStatus }) {
  return <Badge className={DIVERGENCE_STATUS_STYLE[status]}>{DIVERGENCE_STATUS_LABEL[status]}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return <span className="text-muted-foreground text-xs">—</span>;
  const style =
    confidence >= 0.75
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
      : confidence >= 0.4
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  return <Badge className={style}>{Math.round(confidence * 100)}%</Badge>;
}
