import { getBatch, getSummary } from "@/lib/api";
import { BatchWorkspace } from "@/components/batch-workspace";
import { CONTAINER_WIDE } from "@/lib/layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getBatch(id);
  const summary = batch.status === "MATCHED" || batch.status === "REVIEWED" ? await getSummary(id) : null;

  return (
    <div className={cn(CONTAINER_WIDE, "flex-1 py-12")}>
      <BatchWorkspace initialBatch={batch} initialSummary={summary} />
    </div>
  );
}
