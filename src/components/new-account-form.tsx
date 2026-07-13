"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBankAccount } from "@/lib/api";

export function NewAccountForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createBankAccount({
        name: name.trim(),
        bankCode: bankCode.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
      });
      setName("");
      setBankCode("");
      setAccountNumber("");
      toast.success("Conta bancária criada");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar conta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Nome da conta</Label>
        <Input
          id="name"
          placeholder="Conta Corrente Principal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-56"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bankCode">Banco</Label>
        <Input
          id="bankCode"
          placeholder="341"
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          className="w-24"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="accountNumber">Conta</Label>
        <Input
          id="accountNumber"
          placeholder="12345-6"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="w-32"
        />
      </div>
      <Button type="submit" disabled={submitting || !name.trim()}>
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {submitting ? "Criando…" : "Nova conta"}
      </Button>
    </form>
  );
}
