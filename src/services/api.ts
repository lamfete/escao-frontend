import type { Escrow, EscrowStatus, Dispute, User } from "../types";
import { getToken, setAuth } from "./authStorage";

// Determine API base URL via env; prefer VITE_API_BASE_URL when set, otherwise use local/prod split.
const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const baseFromSingle = (import.meta.env.VITE_API_BASE_URL as string | undefined);
const baseFromSplit = isLocal
  ? (import.meta.env.VITE_API_BASE_URL_LOCAL as string | undefined)
  : (import.meta.env.VITE_API_BASE_URL_PROD as string | undefined);
const baseRaw: string | undefined = baseFromSingle || baseFromSplit;

// Normalize base (remove trailing slash); if not provided, use empty string to make requests relative
const BASE = (baseRaw || "").replace(/\/$/, "");

function joinUrl(base: string, path: string) {
  if (!base) return path; // relative to current origin
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = joinUrl(BASE, path);
  // Attach bearer token if present in storage
  const token = getToken();
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...authHeader, ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    // Parse error response as JSON if possible and include context
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    const err = new Error(
      `Request failed: ${res.status} ${res.statusText} for ${url}`
    ) as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = payload;
    throw err;
  }
  return res.json();
}

// Auth
type LoginResponse = {
  accessToken: string;
  user: { id: string; email: string; role: User["role"] };
};

export async function login(email: string, password: string): Promise<User> {
  const resp = await http<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  // Map backend shape to our User type
  const user: User = {
    id: resp.user.id,
    email: resp.user.email,
    role: resp.user.role,
    token: resp.accessToken,
  };
  // Persist token and user id for durability across refreshes
  setAuth(user.token, user.id);
  return user;
}

export async function register(email: string, password: string, role: "buyer"|"seller"): Promise<User> {
  return http<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

// Escrows
export async function listEscrows(): Promise<Escrow[]> {
  // Replace with GET /escrows
  return [
    { id: "ESC-1029", seller: "Toko Andalas", amount: 1_250_000, status: "pending_payment", createdAt: new Date().toISOString(), paymentMethod: "QRIS" },
    { id: "ESC-1030", seller: "Gadget Nusantara", amount: 2_499_000, status: "funded", createdAt: new Date().toISOString(), paymentMethod: "QRIS" },
    { id: "ESC-1031", seller: "Batik Ayu", amount: 540_000, status: "released", createdAt: new Date().toISOString(), paymentMethod: "BIFAST" },
  ];
}

export async function getEscrow(id: string): Promise<Escrow> {
  return http<Escrow>(`/escrow/${id}`, {
    method: "GET",
  });
}

export async function createEscrow(input: { sellerId: string; amount: number; deadlineConfirm: string }): Promise<Escrow> {
  return http<Escrow>("/escrow", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEscrowStatus(id: string, status: EscrowStatus): Promise<Escrow> {
  const e = await getEscrow(id);
  return { ...e, status };
}

// Disputes
export async function listDisputes(): Promise<Dispute[]> {
  return [
    { id: "DSP-1", escrowId: "ESC-1030", reason: "Item not as described", status: "disputed", createdAt: new Date().toISOString() },
  ];
}

export async function resolveDispute(escrowId: string, action: "resolved_refund"|"resolved_release"|"resolved_split"): Promise<Dispute> {
  return http<Dispute>(`/disputes/${escrowId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}