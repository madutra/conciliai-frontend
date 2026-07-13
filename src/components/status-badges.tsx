import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BatchStatus, DivergenceStatus } from "@/lib/api";

function DotBadge({ dotClassName, pulse = false, children }: { dotClassName: string; pulse?: boolean; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="gap-1.5 bg-card/50">
      <span className={cn("size-1.5 shrink-0 rounded-full", dotClassName, pulse && "animate-pulse")} />
      {children}
    </Badge>
  );
}

const BATCH_STATUS_DOT: Record<BatchStatus, string> = {
  UPLOADED: "bg-zinc-400 dark:bg-zinc-500",
  PROCESSING: "bg-amber-500 dark:bg-amber-400",
  MATCHED: "bg-blue-500 dark:bg-blue-400",
  REVIEWED: "bg-emerald-500 dark:bg-emerald-400",
  CLOSED: "bg-zinc-400 dark:bg-zinc-500",
};

const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  UPLOADED: "Aguardando arquivos",
  PROCESSING: "Processando",
  MATCHED: "Conciliado",
  REVIEWED: "Revisado",
  CLOSED: "Fechado",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <DotBadge dotClassName={BATCH_STATUS_DOT[status]} pulse={status === "PROCESSING"}>
      {BATCH_STATUS_LABEL[status]}
    </DotBadge>
  );
}

const DIVERGENCE_STATUS_DOT: Record<DivergenceStatus, string> = {
  OPEN: "bg-red-500 dark:bg-red-400",
  RESOLVED: "bg-emerald-500 dark:bg-emerald-400",
  IGNORED: "bg-zinc-400 dark:bg-zinc-500",
};

const DIVERGENCE_STATUS_LABEL: Record<DivergenceStatus, string> = {
  OPEN: "Em aberto",
  RESOLVED: "Resolvida",
  IGNORED: "Ignorada",
};

export function DivergenceStatusBadge({ status }: { status: DivergenceStatus }) {
  return <DotBadge dotClassName={DIVERGENCE_STATUS_DOT[status]}>{DIVERGENCE_STATUS_LABEL[status]}</DotBadge>;
}

export function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return <span className="text-muted-foreground text-xs">—</span>;
  const style =
    confidence >= 0.75
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : confidence >= 0.4
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  const barColor =
    confidence >= 0.75
      ? "bg-emerald-600 dark:bg-emerald-400"
      : confidence >= 0.4
        ? "bg-amber-600 dark:bg-amber-400"
        : "bg-red-600 dark:bg-red-400";
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge className={cn("tabular-nums", style)}>{Math.round(confidence * 100)}%</Badge>
      <span className="bg-muted block h-1 w-12 overflow-hidden rounded-full">
        <span
          className={cn("block h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${Math.round(confidence * 100)}%` }}
        />
      </span>
    </div>
  );
}
