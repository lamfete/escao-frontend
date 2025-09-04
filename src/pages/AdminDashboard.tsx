import React, { useEffect, useState } from "react";
import StatusBadge from "../components/StatusBadge";
import type { Escrow, EscrowStatus, Dispute } from "../types";
import { listEscrows, listDisputes, resolveDispute } from "../services/api";
import { formatIDR } from "../utils/format";
import { toast } from "react-hot-toast";

export default function AdminDashboard() {
  const [tab, setTab] = useState<"all" | "disputes">("all");
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  useEffect(() => {
    (async () => {
      setEscrows(await listEscrows());
      setDisputes(await listDisputes());
    })();
  }, []);

  async function resolve(id: string, action: EscrowStatus) {
    await resolveDispute(id, action as any);
    toast.success(`Escrow ${id} resolved: ${action}`);
    setDisputes(d => d.filter(x => x.escrowId !== id));
  }

  const rows = tab === "disputes" ? [] : escrows;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

      <div className="flex gap-4 mb-4">
        <button onClick={() => setTab("all")} className={`px-4 py-2 rounded-lg ${tab==='all'?'bg-indigo-600 text-white':'bg-gray-200'}`}>All Escrows</button>
        <button onClick={() => setTab("disputes")} className={`px-4 py-2 rounded-lg ${tab==='disputes'?'bg-red-600 text-white':'bg-gray-200'}`}>Disputes</button>
      </div>

      {tab === "all" && (
        <div className="rounded-xl border bg-white p-4 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Seller</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="py-2 pr-4">{e.id}</td>
                  <td className="py-2 pr-4">{e.seller}</td>
                  <td className="py-2 pr-4">{formatIDR(e.amount)}</td>
                  <td className="py-2 pr-4"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
              {rows.length===0 && <tr><td colSpan={4} className="py-8 text-center text-gray-500">No items</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "disputes" && (
        <div className="rounded-xl border bg-white p-4 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Dispute ID</th>
                <th className="py-2 pr-4">Escrow</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map(d => (
                <tr key={d.id} className="border-t">
                  <td className="py-2 pr-4">{d.id}</td>
                  <td className="py-2 pr-4">{d.escrowId}</td>
                  <td className="py-2 pr-4">{d.reason}</td>
                  <td className="py-2 pr-4"><StatusBadge status={d.status}/></td>
                  <td className="py-2 pr-4 flex flex-wrap gap-2">
                    <button onClick={()=>resolve(d.escrowId,"resolved_refund")} className="px-3 py-1 rounded bg-green-600 text-white">Refund Buyer</button>
                    <button onClick={()=>resolve(d.escrowId,"resolved_release")} className="px-3 py-1 rounded bg-blue-600 text-white">Release Seller</button>
                    <button onClick={()=>resolve(d.escrowId,"resolved_split")} className="px-3 py-1 rounded bg-yellow-500 text-white">Split Settlement</button>
                  </td>
                </tr>
              ))}
              {disputes.length===0 && <tr><td colSpan={5} className="py-8 text-center text-gray-500">No disputes</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}