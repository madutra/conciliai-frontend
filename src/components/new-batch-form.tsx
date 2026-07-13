"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBatch } from "@/lib/api";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function NewBatchForm({ bankAccountId }: { bankAccountId: string }) {
  const router = useRouter();
  const [referenceMonth, setReferenceMonth] = useState(currentMonth());
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const batch = await createBatch({ bankAccountId, referenceMonth });
      toast.success("Nova conciliação criada");
      router.push(`/batches/${batch.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar conciliação");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="month"
        value={referenceMonth}
        onChange={(e) => setReferenceMonth(e.target.value)}
        className="w-40"
      />
      <Button type="submit" size="sm" variant="secondary" disabled={submitting}>
        {submitting ? "Criando…" : "Nova conciliação"}
      </Button>
    </form>
  );
}
