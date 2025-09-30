import { useEffect, useState } from "react";
import { getMyKycStatus, submitKyc, type KycInfo } from "../services/api";
import { toast } from "react-hot-toast";

export default function KycPage() {
  const [kyc, setKyc] = useState<KycInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [form, setForm] = useState({
    full_name: "",
    id_number: "",
    document_url: "",
    selfie_url: "",
    document: null as File | null,
    selfie: null as File | null,
  });
  const [resolvedUrls, setResolvedUrls] = useState<{ document_url?: string; selfie_url?: string } | null>(null);

  const kycUrl = (import.meta as any).env?.VITE_KYC_URL as string | undefined;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyKycStatus();
      setKyc(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load KYC status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = String(kyc?.status || (kyc?.verified ? 'verified' : 'unverified')).toLowerCase();
  const level = kyc?.level || '-';

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold mb-4">KYC Verification</h1>

      {loading && (
        <div className="p-4 rounded border bg-white">Loading KYC status…</div>
      )}

      {!loading && error && (
        <div className="p-4 rounded border bg-white text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          <div className="p-4 rounded border bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Current status</div>
                <div className="text-lg font-medium capitalize">{status}</div>
                <div className="text-sm text-gray-500">Level: {level}</div>
              </div>
              {status === 'verified' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">Verified</span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800">Action required</span>
              )}
            </div>
          </div>

          {status !== 'verified' && (
            <div className="p-4 rounded border bg-white space-y-3">
              <p className="text-gray-700">To ship items and receive funds as a seller, please complete your identity verification.</p>

              {/* Inline simple submission form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full name</label>
                  <input
                    className="mt-1 w-full border rounded p-2"
                    value={form.full_name}
                    onChange={(e)=>setForm({...form, full_name: e.target.value})}
                    placeholder="Your legal name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ID number</label>
                  <input
                    className="mt-1 w-full border rounded p-2"
                    value={form.id_number}
                    onChange={(e)=>setForm({...form, id_number: e.target.value})}
                    placeholder="e.g. KTP / Passport"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Document (upload or URL)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="mt-1 block w-full"
                    onChange={(e)=>setForm({...form, document: e.target.files?.[0] || null})}
                  />
                  <input
                    className="mt-2 w-full border rounded p-2"
                    value={form.document_url}
                    onChange={(e)=>setForm({...form, document_url: e.target.value})}
                    placeholder="https://... (KTP/passport scan)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Provide a file or a URL</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Selfie (upload or URL)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block w-full"
                    onChange={(e)=>setForm({...form, selfie: e.target.files?.[0] || null})}
                  />
                  <input
                    className="mt-2 w-full border rounded p-2"
                    value={form.selfie_url}
                    onChange={(e)=>setForm({...form, selfie_url: e.target.value})}
                    placeholder="https://... (selfie holding ID)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Provide a file or a URL</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  disabled={submitting}
                  onClick={async ()=>{
                    // validation: name, id required; document and selfie require either file or URL.
                    if (!form.full_name || !form.id_number) {
                      toast.error('Full name and ID number are required');
                      return;
                    }
                    if (!(form.document || form.document_url)) {
                      toast.error('Document file or URL is required');
                      return;
                    }
                    if (!(form.selfie || form.selfie_url)) {
                      toast.error('Selfie file or URL is required');
                      return;
                    }
                    setSubmitting(true);
                    try {
                      const resp = await submitKyc({
                        full_name: form.full_name,
                        id_number: form.id_number,
                        document_url: form.document_url || undefined,
                        selfie_url: form.selfie_url || undefined,
                        document: form.document || undefined,
                        selfie: form.selfie || undefined,
                      });
                      setSubmitted(true);
                      toast.success('KYC submitted');
                      if (resp && (resp.document_url || resp.selfie_url)) {
                        setResolvedUrls({ document_url: resp.document_url, selfie_url: resp.selfie_url });
                      } else {
                        setResolvedUrls(null);
                      }
                      await load();
                    } catch (e: any) {
                      toast.error(e?.message || 'Failed to submit KYC');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit KYC'}
                </button>
                {kycUrl && (
                  <a
                    href={kycUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded border text-gray-700 hover:bg-gray-50"
                  >
                    Open KYC Portal
                  </a>
                )}
                <button
                  onClick={load}
                  className="inline-flex items-center px-3 py-2 rounded border text-gray-700 hover:bg-gray-50"
                >
                  Refresh status
                </button>
              </div>

              {submitted && (
                <div className="mt-2 text-sm text-green-700">
                  Your KYC has been submitted. You’ll be notified after review.
                  {resolvedUrls && (
                    <div className="mt-2 text-gray-700">
                      {resolvedUrls.document_url && (
                        <div>Document URL: <a href={resolvedUrls.document_url} target="_blank" rel="noreferrer" className="text-indigo-700 underline">{resolvedUrls.document_url}</a></div>
                      )}
                      {resolvedUrls.selfie_url && (
                        <div>Selfie URL: <a href={resolvedUrls.selfie_url} target="_blank" rel="noreferrer" className="text-indigo-700 underline">{resolvedUrls.selfie_url}</a></div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
