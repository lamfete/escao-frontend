import type { Escrow, EscrowStatus, Dispute, User } from "../types";
import { getToken, setAuth, clearAuth } from "./authStorage";
import { toast } from "react-hot-toast";

// Determine API base URL via env; prefer VITE_API_BASE_URL when set, otherwise use local/prod split.
const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const baseFromSingle = (import.meta.env.VITE_API_BASE_URL as string | undefined);
const baseFromSplit = isLocal
  ? (import.meta.env.VITE_API_BASE_URL_LOCAL as string | undefined)
  : (import.meta.env.VITE_API_BASE_URL_PROD as string | undefined);
const baseRaw: string | undefined = baseFromSingle || baseFromSplit;

// Normalize base and adapt for local dev: if pointing to localhost/127.0.0.1 with '/api' path,
// prefer hitting the Vite proxy by using '/api' relative base to avoid CORS/body parsing issues.
let BASE = (baseRaw || "").replace(/\/$/, "");
if (isLocal && baseRaw) {
  try {
    const u = new URL(baseRaw);
    const hostIsLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    const path = u.pathname.replace(/\/+$/, '');
    if (hostIsLocal && path === '/api') {
      BASE = '/api';
    }
  } catch {
    // ignore invalid URL strings; keep as-is
  }
}

function joinUrl(base: string, path: string) {
  if (!base) return path; // relative to current origin
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

// Ensure we only trigger one toast+redirect even if multiple requests fail concurrently
let sessionRedirectScheduled = false;

async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = joinUrl(BASE, path);
  // Attach bearer token if present in storage
  const token = getToken();
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  let res: Response;
  try {
    const isForm = typeof FormData !== 'undefined' && (opts as any).body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...authHeader,
      ...(opts.headers as any || {}),
    };
    res = await fetch(url, { headers, ...opts });
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
    // Detect invalid/expired token and force re-authentication
    const status = res.status;
    const msg = (payload && typeof payload === 'object')
      ? String((payload as any).message || (payload as any).error || (payload as any).detail || '')
      : '';
    const msgLower = msg.toLowerCase();
    const isAuthProblem = status === 401 ||
      (status === 403 && msgLower.includes('token')) ||
      msgLower.includes('invalid or expired token');
    if (isAuthProblem) {
      try { clearAuth(); localStorage.removeItem('auth_user'); } catch {}
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        if (!sessionRedirectScheduled) {
          sessionRedirectScheduled = true;
          // Non-blocking toast so users know why they were redirected
          try { toast.error('Your session expired, please log in again', { id: 'session-expired' }); } catch {}
          // Give the toast a brief moment to render, then redirect
          setTimeout(() => {
            try { window.location.replace('/login'); } finally { sessionRedirectScheduled = false; }
          }, 1200);
        }
      }
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
export async function listEscrows(params?: { limit?: number; offset?: number; status?: string; as?: 'buyer'|'seller' }): Promise<Escrow[]> {
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;
  const status = params?.status ?? '';
  const as = params?.as ?? undefined;
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('offset', String(offset));
  if (status) qs.set('status', status);
  if (as) qs.set('as', as);
  const resp = await http<any>(`/escrow?${qs.toString()}`, { method: 'GET' });
  const arr: any[] = Array.isArray(resp) ? resp : (resp?.escrows || resp?.data || resp?.items || []);
  return arr.map(mapBackendEscrow);
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

export async function createEscrow(input: { sellerId: string; amount: number }): Promise<Pick<Escrow, 'id'> & { paymentUrl?: string }> {
  const payload = {
    amount: input.amount,
    currency: "IDR",
    counterparty_id: input.sellerId,
  };
  const resp = await http<{ message?: string; escrow?: { id?: string; payment_url?: string; paymentLink?: string } } | { id?: string; payment_url?: string; paymentLink?: string }>("/escrow", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const id = (resp as any)?.escrow?.id ?? (resp as any)?.id;
  const paymentUrl = (resp as any)?.payment_url || (resp as any)?.paymentLink || (resp as any)?.escrow?.payment_url || (resp as any)?.escrow?.paymentLink;
  if (!id) {
    const err = new Error("Create escrow response missing escrow.id") as Error & { data?: unknown };
    err.data = resp;
    throw err;
  }
  return { id, paymentUrl };
}

export async function updateEscrowStatus(id: string, status: EscrowStatus): Promise<Escrow> {
  const e = await getEscrow(id);
  return { ...e, status };
}

// Payments
export async function fundEscrow(
  escrowId: string,
  payload: { method: 'bank_transfer' | 'qris'; pg_reference: string; qr_code_url?: string }
): Promise<any> {
  return http<any>(`/escrow/${escrowId}/fund`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Shipping (seller)
export async function shipEscrow(
  escrowId: string,
  input: { shipping_receipt: string; media?: File }
): Promise<any> {
  // Prefer canonical field 'tracking_number'; backend now accepts JSON or multipart.
  if (input.media) {
    const form = new FormData();
    form.append('tracking_number', input.shipping_receipt);
    form.append('media', input.media);
    return http<any>(`/escrow/${escrowId}/ship`, { method: 'POST', body: form });
  }
  return http<any>(`/escrow/${escrowId}/ship`, {
    method: 'POST',
    body: JSON.stringify({ tracking_number: input.shipping_receipt }),
  });
}

// Buyer uploads received proof
export async function uploadReceivedProof(
  escrowId: string,
  file: File
): Promise<any> {
  const form = new FormData();
  form.append('media', file);
  return http<any>(`/escrow/${escrowId}/received-proof`, {
    method: 'POST',
    body: form,
  });
}

// Buyer confirms receipt (finish)
export async function confirmReceipt(escrowId: string): Promise<any> {
  return http<any>(`/escrow/${escrowId}/confirm-receipt`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// KYC
export type KycInfo = { status?: string; kyc_status?: string; verified?: boolean; level?: string; [k: string]: any };

function normalizeKyc(resp: any): KycInfo {
  const raw = resp || {};
  const rawStatus: string | undefined = raw.kyc_status || raw.status || raw.kycStatus;
  const status = rawStatus ? String(rawStatus).toLowerCase() : undefined;
  const verified = raw?.verified === true || status === 'verified' || status === 'approved';
  return {
    ...raw,
    kyc_status: rawStatus ?? status,
    status,
    verified,
  } as KycInfo;
}

export async function getMyKycStatus(): Promise<KycInfo> {
  const resp = await http<any>(`/users/me/kyc`, { method: 'GET' });
  return normalizeKyc(resp);
}

// Get a user's KYC status (admin)
export async function getUserKycStatus(userId: string): Promise<KycInfo> {
  const resp = await http<any>(`/users/${encodeURIComponent(userId)}/kyc`, { method: 'GET' });
  return normalizeKyc(resp);
}

// Try to find a user id by email using common patterns; returns null if not found.
export async function findUserIdByEmail(email: string): Promise<{ id: string; email?: string } | null> {
  const envPath = (import.meta as any).env?.VITE_USER_EMAIL_LOOKUP_PATH as string | undefined;
  const candidates = [
    envPath ? (envPath.includes('{email}') ? envPath.replace('{email}', encodeURIComponent(email)) : `${envPath}${encodeURIComponent(email)}`) : null,
    `/users?email=${encodeURIComponent(email)}`,
    `/admin/users?email=${encodeURIComponent(email)}`,
  ].filter(Boolean) as string[];
  for (const path of candidates) {
    try {
      const resp = await http<any>(path, { method: 'GET' });
      // Parse diverse response shapes
      const arr = Array.isArray(resp) ? resp
        : (resp?.users || resp?.data || resp?.items || (resp?.user ? [resp.user] : []));
      const match = (arr || []).find((u: any) => String(u?.email || '').toLowerCase() === email.toLowerCase() || String(u?.id || '') === email);
      if (match && match.id) {
        return { id: String(match.id), email: match.email };
      }
      // If single object and matches
      if (resp && typeof resp === 'object' && !Array.isArray(resp) && resp.id && (resp.email?.toLowerCase?.() === email.toLowerCase())) {
        return { id: String(resp.id), email: resp.email };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

// Submit KYC (user) - supports file uploads or URLs
export async function submitKyc(input: {
  full_name: string;
  id_number: string;
  document_url?: string;
  selfie_url?: string;
  document?: File;
  selfie?: File;
}): Promise<any> {
  const hasFiles = !!(input.document || input.selfie);
  if (hasFiles) {
    const form = new FormData();
    form.append('full_name', input.full_name);
    form.append('id_number', input.id_number);
    if (input.document) form.append('document', input.document);
    if (input.selfie) form.append('selfie', input.selfie);
    if (input.document_url) form.append('document_url', input.document_url);
    if (input.selfie_url) form.append('selfie_url', input.selfie_url);
    return http<any>(`/users/kyc`, { method: 'POST', body: form });
  }
  // fallback to JSON when only URLs provided
  return http<any>(`/users/kyc`, {
    method: 'POST',
    body: JSON.stringify({
      full_name: input.full_name,
      id_number: input.id_number,
      document_url: input.document_url,
      selfie_url: input.selfie_url,
    }),
  });
}

// Verify KYC (admin)
export async function adminVerifyUserKyc(userId: string, decision: 'verified' | 'rejected', note?: string): Promise<any> {
  return http<any>(`/users/${encodeURIComponent(userId)}/kyc/verify`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  });
}

export type KycUser = { id: string; email?: string; role?: string; kyc_status?: string; status?: string; level?: string; submitted_at?: string };

function mapKycUser(u: any): KycUser | null {
  if (!u) return null;
  const id = u.id || u.user_id || u.userId || u.uid;
  if (!id) return null;
  const email = u.email || u.user?.email || u.contact?.email;
  const role = u.role || u.user?.role;
  const status = (u.kyc_status || u.status || '').toString().toLowerCase();
  const level = u.level || u.kyc_level;
  const submitted_at = u.submitted_at || u.created_at || u.createdAt;
  return { id: String(id), email, role, kyc_status: status, status, level, submitted_at };
}

export async function listKycPendingSellers(params?: { role?: string; email?: string; limit?: number; offset?: number }): Promise<KycUser[]> {
  const role = params?.role || 'seller';
  const email = params?.email || '';
  const limit = typeof params?.limit === 'number' ? params!.limit! : 20;
  const offset = typeof params?.offset === 'number' ? params!.offset! : 0;
  const qs = new URLSearchParams();
  if (role) qs.set('role', role);
  if (email !== undefined) qs.set('email', email);
  qs.set('limit', String(limit));
  qs.set('offset', String(offset));

  const envPath = (import.meta as any).env?.VITE_KYC_PENDING_PATH as string | undefined;
  const main = `/users/kyc/pending?${qs.toString()}`;
  const candidates = [envPath ? `${envPath}${envPath.includes('?') ? '&' : '?'}${qs.toString()}` : null, main, '/admin/users?role=seller&kyc_status=submitted', '/users?role=seller&kyc_status=submitted', '/admin/kyc?status=submitted']
    .filter(Boolean) as string[];

  function needsReview(s?: string) {
    const v = (s || '').toLowerCase();
    return ['submitted', 'pending', 'pending_review', 'under_review'].includes(v);
  }

  for (const path of candidates) {
    try {
      const resp = await http<any>(path!, { method: 'GET' });
      const arr = Array.isArray(resp) ? resp : (resp?.users || resp?.data || resp?.items || resp?.results || []);
      const mapped = (arr as any[]).map(mapKycUser).filter(Boolean) as KycUser[];
      const filtered = mapped.filter(u => (u.role ? u.role === 'seller' : true) && needsReview(u.kyc_status || u.status));
      if (filtered.length || envPath || path === main) return filtered; // return even empty if explicit env or the canonical endpoint
    } catch {
      // try next
    }
  }
  return [];
}

// Detailed KYC submission info for a user, including resolved document/selfie URLs
export type KycSubmission = {
  userId: string;
  full_name?: string;
  id_number?: string;
  document_url?: string;
  selfie_url?: string;
  status?: string;
  submitted_at?: string;
};

export async function getUserKycDetails(userId: string): Promise<KycSubmission> {
  const resp = await http<any>(`/users/${encodeURIComponent(userId)}/kyc`, { method: 'GET' });
  const obj = resp && typeof resp === 'object' ? resp : {};
  const submission = obj && typeof obj === 'object' ? (obj.submission || obj.kyc || obj.kyc_submission || null) : null;
  const user = obj && typeof obj === 'object' ? (obj.user || null) : null;

  function pickUrl(r: any, keys: string[], fileHints: string[]): string | undefined {
    for (const k of keys) {
      const v = r?.[k];
      if (typeof v === 'string' && v) return v;
      if (v && typeof v === 'object' && typeof v.url === 'string') return v.url;
    }
    const files = Array.isArray(r?.files) ? r.files : Array.isArray(r?.documents) ? r.documents : undefined;
    if (Array.isArray(files)) {
      for (const f of files) {
        const name = String(f?.name || f?.filename || f?.originalname || '').toLowerCase();
        const kind = String(f?.kind || f?.type || f?.fieldname || '').toLowerCase();
        const hint = `${name} ${kind}`;
        if (fileHints.some(h => hint.includes(h))) {
          if (typeof f?.url === 'string') return f.url;
          if (typeof f?.path === 'string') return f.path;
        }
      }
      // fallback: first file with explicit url
      const firstWithUrl = files.find((f: any) => typeof f?.url === 'string');
      if (firstWithUrl) return firstWithUrl.url;
    }
    return undefined;
  }

  const resolvedUserId = user?.id || submission?.user_id || userId;
  const full_name = submission?.full_name || obj.full_name || obj.name || obj.legal_name;
  const id_number = submission?.id_number || obj.id_number || obj.nik || obj.document_number;
  const status = String(submission?.status || obj.kyc_status || obj.status || '').toLowerCase();
  const submitted_at = submission?.submitted_at || submission?.created_at || submission?.createdAt || obj.submitted_at || obj.created_at || obj.createdAt;
  const document_url = submission?.document_url || pickUrl(obj, ['document_url', 'documentURL'], ['document', 'ktp', 'passport', 'id']);
  const selfie_url = submission?.selfie_url || pickUrl(obj, ['selfie_url', 'selfieURL', 'selfie'], ['selfie']);
  return { userId: String(resolvedUserId), full_name, id_number, document_url, selfie_url, status, submitted_at };
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