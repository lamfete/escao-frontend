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
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listEscrows({ limit: 20, offset: 0, status: status === 'all' ? '' : status, as: (user?.role === 'seller' ? 'seller' : 'buyer') });
        setRows(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load escrows');
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, user?.role]);

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
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by ID or Seller" className="w-full md:w-72 border rounded-lg px-3 py-2"/>
          <select value={status} onChange={e=>setStatus(e.target.value as any)} className="border rounded-lg px-3 py-2">
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