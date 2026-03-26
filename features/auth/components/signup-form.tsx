"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingInvite, setIsVerifyingInvite] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const inviteCode = String(formData.get("inviteCode") ?? "");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, inviteCode }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(result.message ?? "Signup failed. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyInvite(event: FormEvent<HTMLButtonElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInviteMessage(null);

    const form = event.currentTarget.form;
    if (!form) return;

    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const code = String(formData.get("inviteCode") ?? "");

    setIsVerifyingInvite(true);
    try {
      const response = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const result = (await response.json()) as { message?: string; alreadyRedeemed?: boolean };
      if (!response.ok) {
        setErrorMessage(result.message ?? "Unable to verify invite code.");
        return;
      }

      setInviteMessage(result.alreadyRedeemed ? "Invite already redeemed for this email." : "Invite verified successfully.");
    } catch {
      setErrorMessage("Network error while verifying invite.");
    } finally {
      setIsVerifyingInvite(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">Bước 2 / 3</span>
        <span className="h-px w-12 bg-[var(--brand)]" />
      </div>
      <div className="space-y-2.5">
        <label className="block text-xs font-bold uppercase leading-none tracking-[0.14em] text-zinc-700">Họ và tên</label>
        <input name="name" type="text" placeholder="Nguyen Van A" className="auth-input" required />
      </div>
      <div className="space-y-2.5">
        <label className="block text-xs font-bold uppercase leading-none tracking-[0.14em] text-zinc-700">Địa chỉ email</label>
        <input name="email" type="email" placeholder="name@example.com" className="auth-input" required />
      </div>
      <div className="space-y-2.5">
        <label className="block text-xs font-bold uppercase leading-none tracking-[0.14em] text-zinc-700">Mật khẩu</label>
        <input name="password" type="password" placeholder="Ít nhất 8 ký tự" className="auth-input" required />
      </div>
      <div className="space-y-2.5">
        <label className="block text-xs font-bold uppercase leading-none tracking-[0.14em] text-zinc-700">Mã giới thiệu</label>
        <input name="inviteCode" type="text" placeholder="KV-BETA-2026" className="auth-input uppercase" required />
      </div>
      <button
        type="button"
        onClick={handleVerifyInvite}
        disabled={isVerifyingInvite}
        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-black hover:text-black disabled:opacity-60"
      >
        {isVerifyingInvite ? "Đang xác minh invite..." : "Verify Invite Code"}
      </button>
      {inviteMessage ? <p className="text-sm text-emerald-600">{inviteMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-black px-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-zinc-800 disabled:opacity-70"
      >
        {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
      </button>
      <p className="text-xs leading-relaxed text-zinc-500">
        Bằng cách tiếp tục, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của Ryan Exchange.
      </p>
    </form>
  );
}
