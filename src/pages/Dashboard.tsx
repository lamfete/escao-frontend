import /*React,*/ { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StatusBadge from "../components/StatusBadge";
import type { Escrow, EscrowStatus } from "../types";
import { listEscrows } from "../services/api";
import { formatIDR } from "../utils/format";
import { useAuth } from "../hooks/useAuth";

export default function Dashboard(){
  const [rows, setRows] = useState<Escrow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EscrowStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [escLimit, setEscLimit] = useState<number>(20);
  const [escOffset, setEscOffset] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listEscrows({ limit: escLimit, offset: escOffset, status: status === 'all' ? '' : status, as: (user?.role === 'seller' ? 'seller' : 'buyer') });
        setRows(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load escrows');
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, escLimit, escOffset, user?.role]);

  const pageItems = useMemo(()=>{
    const q = query.toLowerCase().trim();
    return rows.filter(e => (!q || e.id.toLowerCase().includes(q) || e.seller.toLowerCase().includes(q)) && (status==="all" || e.status===status));
  },[rows, query, status]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
      <Sidebar />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <Link to="/escrow/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">New Escrow</Link>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <input value={query} onChange={e=> { setQuery(e.target.value); setEscOffset(0); }} placeholder="Search by ID or Seller" className="w-full md:w-72 border rounded-lg px-3 py-2"/>
          <select value={status} onChange={e=> { setStatus(e.target.value as any); setEscOffset(0); }} className="border rounded-lg px-3 py-2">
            <option value="all">All Status</option>
            <option value="pending_payment">Pending payment</option>
            <option value="funded">Funded</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="released">Released</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
            <div>Page size:
              <select className="ml-2 border rounded px-2 py-1" value={escLimit} onChange={e=> { setEscLimit(Number(e.target.value)); setEscOffset(0); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=> setEscOffset(o => Math.max(0, o - escLimit))} disabled={escOffset === 0 || loading} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
              <div>Offset {escOffset}</div>
              <button onClick={()=> setEscOffset(o => o + escLimit)} disabled={loading || rows.length < escLimit} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
            </div>
          </div>
          {loading && <div className="py-8 text-center text-gray-500">Loading…</div>}
          {error && !loading && <div className="py-3 mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>}
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="py-2 pr-4">ID</th><th className="py-2 pr-4">Seller</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Status</th></tr></thead>
            <tbody>
              {pageItems.map(e => (
                <tr key={e.id} className="border-t">
                  <td className="py-2 pr-4"><Link className="text-indigo-600 hover:underline" to={`/escrow/${e.id}`}>{e.id}</Link></td>
                  <td className="py-2 pr-4">{e.seller}</td>
                  <td className="py-2 pr-4">{formatIDR(e.amount)}</td>
                  <td className="py-2 pr-4"><StatusBadge status={e.status}/></td>
                </tr>
              ))}
              {pageItems.length===0 && !loading && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">No results</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}