import { getBatch, getSummary } from "@/lib/api";
import { BatchWorkspace } from "@/components/batch-workspace";

export const dynamic = "force-dynamic";

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getBatch(id);
  const summary = batch.status === "MATCHED" || batch.status === "REVIEWED" ? await getSummary(id) : null;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <BatchWorkspace initialBatch={batch} initialSummary={summary} />
    </div>
  );
}
