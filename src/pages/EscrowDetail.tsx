import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import type { Escrow, EscrowStatus } from "../types";
import { getEscrow, updateEscrowStatus } from "../services/api";
import { toast } from "react-hot-toast";
import { formatIDR } from "../utils/format";

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg border bg-gray-50">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export default function EscrowDetail(){
  const { id } = useParams();
  const [escrow, setEscrow] = useState<Escrow | null>(null);

  useEffect(() => {
    (async ()=>{
      if (!id) return;
      const e = await getEscrow(id);
      setEscrow(e);
    })();
  }, [id]);

  async function setStatus(s: EscrowStatus) {
    if (!id) return;
    const e = await updateEscrowStatus(id, s);
    setEscrow(e);
    toast.success(`Status updated to ${s}`);
  }

  if (!escrow) return <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 bg-white border rounded-xl shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Escrow {escrow.id}</h2>
        <StatusBadge status={escrow.status}/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  <Info label="Buyer Email" value={escrow.buyer || '—'}/>
  <Info label="Seller Email" value={escrow.seller}/>
        <Info label="Amount" value={formatIDR(escrow.amount)}/>
        <Info label="Created" value={new Date(escrow.createdAt).toLocaleString()}/>
      </div>

      <h3 className="font-semibold mb-2">Actions</h3>
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setStatus("shipped")} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Mark Shipped</button>
        <button onClick={()=>setStatus("released")} className="px-3 py-2 rounded-lg bg-green-600 text-white">Confirm Receipt</button>
        <button onClick={()=>setStatus("disputed")} className="px-3 py-2 rounded-lg bg-red-600 text-white">Raise Dispute</button>
      </div>

      <h3 className="font-semibold mt-8 mb-2">Status Timeline</h3>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["pending_payment","funded","shipped","delivered","released"] as EscrowStatus[]).map((s,i)=> (
          <span key={s} className={`px-2 py-1 rounded-md border ${s===escrow.status?'bg-indigo-600 text-white border-indigo-600':'bg-white'}`}>{i+1}. {s.replace("_"," ")}</span>
        ))}
      </div>
    </div>
  );
}