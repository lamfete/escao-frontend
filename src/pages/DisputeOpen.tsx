import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createDispute } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function DisputeOpen(){
  const { id } = useParams(); // escrow id
  const navigate = useNavigate();
  const { user } = useAuth();
  const [escrowId, setEscrowId] = useState<string>(id || "");
  const [reason, setReason] = useState<string>("item_not_as_described");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id?: string; raw?: any } | null>(null);

  const disabled = submitting || !escrowId || (user?.role !== 'buyer' && !!user);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escrowId) { toast.error('Escrow ID is required'); return; }
    setSubmitting(true);
    setResult(null);
    try {
      const resp = await createDispute(escrowId, { reason, note });
      const disputeId = (resp as any)?.id || (resp as any)?.dispute?.id;
      toast.success('Dispute opened');
      setResult({ id: disputeId, raw: resp });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      <h2 className="text-2xl font-bold mb-1">Open a Dispute</h2>
      <p className="text-sm text-gray-600 mb-6">Raise an issue for an escrow if the item was not received, is defective, or differs from the description.</p>

      {user && user.role !== 'buyer' && (
        <div className="mb-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-sm">Only buyers can open disputes.</div>
      )}

      <form onSubmit={onSubmit} className="bg-white border rounded-xl p-6 shadow space-y-4">
        <div>
          <label className="text-sm font-medium">Escrow ID</label>
          <input value={escrowId} onChange={e=> setEscrowId(e.target.value)} placeholder="e.g. ESC-12345 or UUID" className="mt-1 w-full border rounded-lg p-2" />
        </div>
        <div>
          <label className="text-sm font-medium">Reason</label>
          <select value={reason} onChange={e=> setReason(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
            <option value="not_received">Item not received</option>
            <option value="damaged">Item arrived damaged</option>
            <option value="item_not_as_described">Not as described</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Details (optional)</label>
          <textarea value={note} onChange={e=> setNote(e.target.value)} rows={4} placeholder="Describe the issue" className="mt-1 w-full border rounded-lg p-2" />
        </div>
        <button disabled={disabled} className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60">{submitting ? 'Submitting…' : 'Open Dispute'}</button>
      </form>

      {result?.id && (
        <div className="mt-6 bg-white border rounded-xl p-4">
          <div className="font-semibold mb-1">Dispute created</div>
          <div className="text-sm text-gray-700">ID: <span className="font-mono">{result.id}</span></div>
          <div className="mt-3">
            <button
              onClick={()=> navigate(`/disputes/${result.id}/evidence`)}
              className="px-3 py-2 rounded border text-sm"
            >Upload evidence</button>
          </div>
        </div>
      )}
    </div>
  );
}
