"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

// Server returns English messages; show them in Portuguese.
const ERROR_PT: Record<string, string> = {
  "Invalid credentials": "Usuário ou senha inválidos",
  "Invalid invite code": "Código de convite inválido",
  "Invalid or expired token": "Sessão expirada, entre novamente",
  "Password must be at least 8 characters":
    "A senha precisa ter ao menos 8 caracteres",
  "Too many attempts, try again later": "Muitas tentativas, tente mais tarde",
  "Username must be 3-32 chars: lowercase letters, digits, underscore":
    "Usuário: 3 a 32 caracteres — letras minúsculas, números e _",
  "Username taken": "Esse usuário já existe",
};
const translateError = (msg: string) => ERROR_PT[msg] ?? msg;

export function AuthForm() {
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const logout = useAuth((s) => s.logout);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "in" && user) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm">
          Logado como <strong>{user.displayName}</strong>{" "}
          <span className="text-muted-foreground">@{user.username}</span>
        </p>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/")}>Ver figurinhas</Button>
          <Button variant="outline" onClick={() => logout()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(
          username.trim(),
          displayName.trim() || username.trim(),
          password,
          invite.trim(),
        );
      }
      router.push("/");
    } catch (err) {
      setError(
        err instanceof ApiError ? translateError(err.message) : "Algo deu errado",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-sm flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm"
    >
      <h1 className="font-display text-2xl uppercase">
        {mode === "login" ? "Entrar" : "Criar conta"}
      </h1>

      <label className="flex flex-col gap-1 text-sm">
        Usuário
        <input
          className={inputClass}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoComplete="username"
          required
        />
      </label>

      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          type="password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </label>

      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm">
          Código de convite
          <input
            className={inputClass}
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            required
          />
        </label>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={busy} className="mt-1">
        {busy ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "login" ? "Criar conta" : "Já tem conta? Entrar"}
      </button>
    </form>
  );
}
