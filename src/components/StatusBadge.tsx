import React from "react";
import type { EscrowStatus } from "../types";

const colors: Record<EscrowStatus,string> = {
  pending_payment:'bg-amber-100 text-amber-700',
  funded:'bg-blue-100 text-blue-700',
  shipped:'bg-purple-100 text-purple-700',
  delivered:'bg-cyan-100 text-cyan-700',
  released:'bg-green-100 text-green-700',
  disputed:'bg-red-100 text-red-700',
  resolved_refund:'bg-green-100 text-green-700',
  resolved_release:'bg-green-100 text-green-700',
  resolved_split:'bg-green-100 text-green-700',
};

export default function StatusBadge({status}:{status:EscrowStatus}){
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${colors[status]}`}>{status.replace("_"," ")}</span>;
}