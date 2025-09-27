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
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...authHeader, ...(opts.headers || {}) },
      ...opts,
    });
  } catch (e: any) {
    const err = new Error(`Network error while requesting ${url}: ${e?.message || String(e)}`) as Error & {
      network?: boolean;
      cause?: unknown;
      url?: string;
    };
    err.network = true;
    err.cause = e;
    err.url = url;
    throw err;
  }
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

function mapStatus(s: unknown): EscrowStatus {
  const val = String(s || '').toLowerCase();
  switch (val) {
    case 'pending':
    case 'pending_payment':
      return 'pending_payment';
    case 'funded':
      return 'funded';
    case 'shipped':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    case 'released':
      return 'released';
    case 'disputed':
      return 'disputed';
    case 'resolved_refund':
    case 'resolved_release':
    case 'resolved_split':
      return val as EscrowStatus;
    default:
      return 'pending_payment';
  }
}

function mapBackendEscrow(b: any): Escrow {
  return {
    id: b?.id ?? '',
    buyer: b?.buyer_email || b?.buyer || b?.buyer_id || undefined,
    seller: b?.seller_email || b?.counterparty_email || b?.counterparty_id || b?.seller || 'Unknown',
    amount: typeof b?.amount === 'number' ? b.amount : Number(b?.amount ?? 0),
    status: mapStatus(b?.status),
    createdAt: b?.created_at || b?.createdAt || new Date().toISOString(),
    // paymentMethod is optional and not provided by backend; leave undefined
  };
}

export async function getEscrow(id: string): Promise<Escrow> {
  const resp = await http<{ escrow?: any } | any>(`/escrow/${id}`, { method: 'GET' });
  const raw = (resp && typeof resp === 'object' && 'escrow' in resp) ? (resp as any).escrow : resp;
  const mapped = mapBackendEscrow(raw);
  if (!mapped.id) {
    const err = new Error('Escrow not found or missing id in response') as Error & { data?: unknown };
    err.data = resp;
    throw err;
  }
  return mapped;
}

export async function createEscrow(input: { sellerId: string; amount: number }): Promise<Pick<Escrow, 'id'>> {
  const payload = {
    amount: input.amount,
    currency: "IDR",
    counterparty_id: input.sellerId,
  };
  const resp = await http<{ message?: string; escrow?: { id?: string } }>("/escrow", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const id = resp?.escrow?.id;
  if (!id) {
    const err = new Error("Create escrow response missing escrow.id") as Error & { data?: unknown };
    err.data = resp;
    throw err;
  }
  return { id };
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