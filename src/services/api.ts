import type { Escrow, EscrowStatus, Dispute, User } from "../types";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    // Parse error response as JSON if possible
    let error;
    try {
      error = await res.json();
    } catch {
      error = { error: res.statusText };
    }
    throw error;
  }
  return res.json();
}

// Auth (mock-friendly)
export async function login(email: string, password: string): Promise<User> {
  // Replace with /auth/login when backend ready
  // return { id: "u1", email, role: email.includes("admin") ? "admin" : "buyer", token: "mock-token" };
  return http<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string, role: "buyer"|"seller"): Promise<User> {
  return http<User>("/api/auth/register", {
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
  // Replace with GET /escrows/:id
  // return { id, seller: "Gadget Nusantara", amount: 2_499_000, status: "funded", createdAt: new Date().toISOString(), paymentMethod: "QRIS" };
  return http<Escrow>(`/api/escrow/${id}`, {
    method: "GET",
  });
}

export async function createEscrow(input: { sellerId: string; amount: number; deadlineConfirm: string }): Promise<Escrow> {
  // Replace with POST /escrows
  /*return {
    id: `ESC-${Math.floor(Math.random()*9000)+1000}`,
    seller: input.sellerId,
    amount: input.amount,
    status: "pending_payment",
    createdAt: new Date().toISOString(),
    paymentMethod: "QRIS"
  };*/
  return http<Escrow>("/api/escrow", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEscrowStatus(id: string, status: EscrowStatus): Promise<Escrow> {
  // Replace with PATCH /escrows/:id/status
  const e = await getEscrow(id);
  return { ...e, status };
}

// Disputes
export async function listDisputes(): Promise<Dispute[]> {
  // Replace with GET /disputes
  return [
    { id: "DSP-1", escrowId: "ESC-1030", reason: "Item not as described", status: "disputed", createdAt: new Date().toISOString() },
  ];
}

export async function resolveDispute(escrowId: string, action: "resolved_refund"|"resolved_release"|"resolved_split"): Promise<Dispute> {
  // Replace with POST /disputes/:id/resolve
  // return { id: "DSP-1", escrowId, reason: "n/a", status: action, createdAt: new Date().toISOString() };
  return http<Dispute>(`/api/disputes/${escrowId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}