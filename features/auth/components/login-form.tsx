"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(result.message ?? "Login failed. Please try again.");
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

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Email / Số điện thoại</label>
        <input name="email" type="email" placeholder="Nhập email hoặc số điện thoại" className="auth-input" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Mật khẩu</label>
          <Link href="/support" className="text-xs font-semibold text-zinc-700 transition hover:text-black">
            Quên mật khẩu?
          </Link>
        </div>
        <input name="password" type="password" placeholder="Nhập mật khẩu của bạn" className="auth-input" required />
      </div>
      {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-black px-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-zinc-800 disabled:opacity-70"
      >
        {isSubmitting ? "Đang đăng nhập..." : "Tiếp tục"}
      </button>
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200" />
        </div>
        <div className="relative mx-auto w-fit bg-white px-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
          Hoặc tiếp tục với
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <button type="button" className="h-12 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700">
          Google
        </button>
        <button type="button" className="h-12 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700">
          Apple
        </button>
        <button type="button" className="h-12 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700">
          QR
        </button>
        <button type="button" className="h-12 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700">
          Web3
        </button>
      </div>
    </form>
  );
}
