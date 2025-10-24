import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { resolveDisputeDecision } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function DisputeResolve(){
  const { id } = useParams(); // dispute id
  const navigate = useNavigate();
  const { user } = useAuth();
  const [disputeId, setDisputeId] = useState<string>(id || "");
  const [decision, setDecision] = useState<'favor_buyer'|'favor_seller'|'split'>('favor_buyer');
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const notAdmin = useMemo(()=> !!user && user.role !== 'admin', [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeId) { toast.error('Dispute ID is required'); return; }
    if (!note.trim()) { toast.error('A resolution note is required'); return; }
    setSubmitting(true);
    try {
      await resolveDisputeDecision(disputeId, decision, note);
      toast.success('Dispute resolved');
      navigate('/admin');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resolve dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      <h2 className="text-2xl font-bold mb-1">Resolve Dispute</h2>
      <p className="text-sm text-gray-600 mb-6">Issue a final decision for a dispute. This action may release funds, refund the buyer, or split settlement.</p>

      {notAdmin && (
        <div className="mb-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-sm">Admin role required to resolve disputes.</div>
      )}

      <form onSubmit={onSubmit} className="bg-white border rounded-xl p-6 shadow space-y-4">
        <div>
          <label className="text-sm font-medium">Dispute ID</label>
          <input value={disputeId} onChange={e=> setDisputeId(e.target.value)} placeholder="UUID" className="mt-1 w-full border rounded-lg p-2" />
        </div>
        <div>
          <label className="text-sm font-medium">Decision</label>
          <select value={decision} onChange={e=> setDecision(e.target.value as any)} className="mt-1 w-full border rounded-lg p-2">
            <option value="favor_buyer">Favor buyer (refund)</option>
            <option value="favor_seller">Favor seller (release)</option>
            <option value="split">Split settlement</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Resolution note</label>
          <textarea value={note} onChange={e=> setNote(e.target.value)} rows={4} placeholder="Briefly explain the decision" className="mt-1 w-full border rounded-lg p-2" />
        </div>
        <button disabled={submitting || notAdmin} className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg disabled:opacity-60">{submitting ? 'Submitting…' : 'Resolve Dispute'}</button>
      </form>
    </div>
  );
}
