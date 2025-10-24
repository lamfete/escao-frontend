import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { uploadDisputeEvidence } from "../services/api";

export default function DisputeEvidence(){
  const { id } = useParams(); // dispute id
  const navigate = useNavigate();
  const [disputeId, setDisputeId] = useState<string>(id || "");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeId) { toast.error('Dispute ID is required'); return; }
    if (!fileUrl) { toast.error('Evidence URL is required'); return; }
    setSubmitting(true);
    try {
      await uploadDisputeEvidence(disputeId, { file_url: fileUrl, note });
      toast.success('Evidence uploaded');
      setNote("");
      setFileUrl("");
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload evidence');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      <h2 className="text-2xl font-bold mb-1">Upload Dispute Evidence</h2>
      <p className="text-sm text-gray-600 mb-6">Provide a link to an image/video file and an optional note describing the evidence.</p>

      <form onSubmit={onSubmit} className="bg-white border rounded-xl p-6 shadow space-y-4">
        <div>
          <label className="text-sm font-medium">Dispute ID</label>
          <input value={disputeId} onChange={e=> setDisputeId(e.target.value)} placeholder="UUID" className="mt-1 w-full border rounded-lg p-2" />
        </div>
        <div>
          <label className="text-sm font-medium">Evidence file URL</label>
          <input value={fileUrl} onChange={e=> setFileUrl(e.target.value)} placeholder="https://.../photo-or-video" className="mt-1 w-full border rounded-lg p-2" />
          <p className="text-xs text-gray-500 mt-1">Tip: Upload to a public file host or CDN, then paste the URL here.</p>
        </div>
        <div>
          <label className="text-sm font-medium">Note (optional)</label>
          <textarea value={note} onChange={e=> setNote(e.target.value)} rows={4} placeholder="Describe what the evidence shows" className="mt-1 w-full border rounded-lg p-2" />
        </div>
        <div className="flex gap-2">
          <button disabled={submitting} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">{submitting ? 'Uploading…' : 'Upload'}</button>
          <button type="button" onClick={()=> navigate(-1)} className="px-4 py-2 rounded-lg border">Back</button>
        </div>
      </form>
    </div>
  );
}
