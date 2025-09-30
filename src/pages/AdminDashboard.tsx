import /*React,*/ { useEffect, useState } from "react";
import StatusBadge from "../components/StatusBadge";
import type { Escrow, EscrowStatus, Dispute } from "../types";
import { listEscrows, listDisputes, resolveDispute, adminVerifyUserKyc, listKycPendingSellers, getUserKycDetails } from "../services/api";
import { formatIDR } from "../utils/format";
import { toast } from "react-hot-toast";

export default function AdminDashboard() {
  const [tab, setTab] = useState<"all" | "disputes" | "kyc">("all");
  const [kycLoading, setKycLoading] = useState<boolean>(false);
  const [kycList, setKycList] = useState<Array<{ id: string; email?: string; status?: string; level?: string; submitted_at?: string }>>([]);
  const [kycOffset, setKycOffset] = useState<number>(0);
  const kycLimit = 20;
  const [kycModal, setKycModal] = useState<{ open: boolean; userId?: string; loading?: boolean; error?: string | null; details?: { full_name?: string; id_number?: string; document_url?: string; selfie_url?: string; submitted_at?: string; status?: string } }>({ open: false });

  // Helper to turn /uploads/... into absolute backend URL so it opens correctly during dev
  function toAbsoluteFileUrl(url?: string) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/uploads')) {
      const raw = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_BASE_URL_PROD || (import.meta as any).env?.VITE_API_BASE_URL_LOCAL;
      try {
        const origin = raw ? new URL(raw as string).origin : window.location.origin;
        return origin.replace(/\/$/, '') + url;
      } catch {
        return url; // fallback
      }
    }
    return url;
  }
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  useEffect(() => {
    (async () => {
      setEscrows(await listEscrows());
      setDisputes(await listDisputes());
    })();
  }, []);

  // Auto-load KYC list when switching to KYC tab
  useEffect(() => {
    if (tab !== 'kyc') return;
    let cancelled = false;
    (async () => {
      setKycLoading(true);
      try {
        const list = await listKycPendingSellers({ limit: kycLimit, offset: kycOffset });
        if (!cancelled) setKycList(list);
      } catch (e:any) {
        if (!cancelled) toast.error(e?.message || 'Failed to load KYC list');
      } finally {
        if (!cancelled) setKycLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, kycOffset]);

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
        <button onClick={() => setTab("kyc")} className={`px-4 py-2 rounded-lg ${tab==='kyc'?'bg-amber-600 text-white':'bg-gray-200'}`}>KYC</button>
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

      {tab === "kyc" && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Pending KYC (Sellers)</h3>
            <button
              onClick={async ()=>{
                setKycLoading(true);
                try {
                  const list = await listKycPendingSellers({ limit: kycLimit, offset: kycOffset });
                  setKycList(list);
                } catch (e:any) {
                  toast.error(e?.message || 'Failed to load KYC list');
                } finally {
                  setKycLoading(false);
                }
              }}
              className="px-3 py-2 rounded border text-gray-700 hover:bg-gray-50"
            >
              {kycLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">User ID</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Submitted</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {kycList.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2 pr-4 font-mono text-xs">
                      <button
                        className="underline text-indigo-700 hover:text-indigo-900"
                        onClick={async ()=>{
                          setKycModal({ open: true, userId: u.id, loading: true, error: null });
                          try {
                            const d = await getUserKycDetails(u.id);
                            setKycModal({ open: true, userId: u.id, loading: false, error: null, details: d });
                          } catch (e:any) {
                            setKycModal({ open: true, userId: u.id, loading: false, error: e?.message || 'Failed to load KYC details' });
                          }
                        }}
                      >
                        {u.id}
                      </button>
                    </td>
                    <td className="py-2 pr-4">{u.email || '—'}</td>
                    <td className="py-2 pr-4 capitalize">{u.status || 'submitted'}</td>
                    <td className="py-2 pr-4">{u.submitted_at ? new Date(u.submitted_at).toLocaleString() : '—'}</td>
                    <td className="py-2 pr-4 flex gap-2">
                      <button
                        onClick={async ()=>{
                          await adminVerifyUserKyc(u.id, 'verified');
                          toast.success('KYC verified');
                          setKycList(list => list.filter(x => x.id !== u.id));
                        }}
                        className="px-3 py-1 rounded bg-green-600 text-white"
                      >Verify</button>
                      <button
                        onClick={async ()=>{
                          await adminVerifyUserKyc(u.id, 'rejected');
                          toast.success('KYC rejected');
                          setKycList(list => list.filter(x => x.id !== u.id));
                        }}
                        className="px-3 py-1 rounded bg-red-600 text-white"
                      >Reject</button>
                    </td>
                  </tr>
                ))}
                {kycList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">No pending sellers</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={()=> setKycOffset(o => Math.max(0, o - kycLimit))}
              disabled={kycOffset === 0 || kycLoading}
              className="px-3 py-2 rounded border text-gray-700 disabled:opacity-50"
            >Prev</button>
            <div className="text-sm text-gray-500">Offset {kycOffset}</div>
            <button
              onClick={()=> setKycOffset(o => o + kycLimit)}
              disabled={kycLoading || kycList.length < kycLimit}
              className="px-3 py-2 rounded border text-gray-700 disabled:opacity-50"
            >Next</button>
          </div>
        </div>
      )}

      {/* KYC details modal */}
      {kycModal.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">KYC Submission</h4>
              <button onClick={()=> setKycModal({ open: false })} className="text-gray-600 hover:text-gray-900">Close</button>
            </div>
            {kycModal.loading && <div className="p-3 border rounded">Loading…</div>}
            {!kycModal.loading && kycModal.error && (
              <div className="p-3 border rounded text-red-700">{kycModal.error}</div>
            )}
            {!kycModal.loading && !kycModal.error && kycModal.details && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">User ID</div>
                  <div className="font-mono text-xs">{kycModal.userId}</div>
                  <div className="text-sm text-gray-600 mt-2">Name</div>
                  <div className="font-medium">{kycModal.details.full_name || '—'}</div>
                  <div className="text-sm text-gray-600 mt-2">ID Number</div>
                  <div className="font-medium">{kycModal.details.id_number || '—'}</div>
                  <div className="text-sm text-gray-600 mt-2">Status</div>
                  <div className="capitalize">{kycModal.details.status || 'submitted'}</div>
                  <div className="text-sm text-gray-600 mt-2">Submitted</div>
                  <div>{kycModal.details.submitted_at ? new Date(kycModal.details.submitted_at).toLocaleString() : '—'}</div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Document</div>
                    {kycModal.details.document_url ? (
                      <a href={toAbsoluteFileUrl(kycModal.details.document_url)} target="_blank" rel="noreferrer" className="block p-2 border rounded hover:bg-gray-50 break-all">{toAbsoluteFileUrl(kycModal.details.document_url)}</a>
                    ) : (
                      <div className="p-2 border rounded text-gray-500">No document URL</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Selfie</div>
                    {kycModal.details.selfie_url ? (
                      <a href={toAbsoluteFileUrl(kycModal.details.selfie_url)} target="_blank" rel="noreferrer" className="block p-2 border rounded hover:bg-gray-50 break-all">{toAbsoluteFileUrl(kycModal.details.selfie_url)}</a>
                    ) : (
                      <div className="p-2 border rounded text-gray-500">No selfie URL</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}