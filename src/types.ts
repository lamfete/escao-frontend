export type EscrowStatus =
  | "pending_payment"
  | "funded"
  | "shipped"
  | "delivered"
  | "released"
  | "disputed"
  | "resolved_refund"
  | "resolved_release"
  | "resolved_split";

export type Escrow = {
  id: string;
  buyer?: string;
  seller: string;
  amount: number;        // IDR
  status: EscrowStatus;
  createdAt: string;     // ISO
  paymentMethod?: "QRIS" | "BIFAST" | "BANK_TRANSFER";
};

export type Dispute = {
  id: string;
  escrowId: string;
  reason: string;
  status: EscrowStatus;  // 'disputed' or resolved_*
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  role: "buyer" | "seller" | "admin";
  token?: string;
};