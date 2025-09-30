import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import type { Escrow, EscrowStatus } from "../types";
import { getEscrow, shipEscrow, confirmReceipt, getMyKycStatus } from "../services/api";
import { toast } from "react-hot-toast";
import { formatIDR } from "../utils/format";
import { useAuth } from "../hooks/useAuth";

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
  const { user } = useAuth();

  const isBuyer = useMemo(()=> user?.role === 'buyer', [user]);
  const isSeller = useMemo(()=> user?.role === 'seller', [user]);
  const [uploading, setUploading] = useState(false);
  const [shipForm, setShipForm] = useState({ receipt: '', media: null as File | null });
  const [shipSuccess, setShipSuccess] = useState<{
    trackingNumber?: string;
    audit?: { fileName?: string; fileType?: string; fileSize?: number };
    raw?: any;
  } | null>(null);
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);
  const [kycInfo, setKycInfo] = useState<{ status?: string; level?: string } | null>(null);
  const [shipError, setShipError] = useState<string | null>(null);
  // buyer upload not used (seller uploads shipping proof)

  useEffect(() => {
    (async ()=>{
      if (!id) return;
      const e = await getEscrow(id);
      setEscrow(e);
    })();
  }, [id]);

  useEffect(() => {
    (async ()=>{
      try {
        const kyc = await getMyKycStatus();
        setKycVerified(Boolean(kyc?.verified) || (String(kyc?.status || '').toLowerCase() === 'verified'));
        setKycInfo({ status: kyc?.status, level: (kyc as any)?.level });
      } catch {
        setKycVerified(false);
      }
    })();
  }, []);

  // status updates happen via specific endpoints now

  async function handleShip() {
    if (!id) return;
    if (!(escrow && escrow.status === 'funded')) { toast.error('You can ship only when the escrow is funded'); return; }
    if (!shipForm.receipt) { toast.error('Shipping receipt is required'); return; }
    setShipError(null);
    setUploading(true);
    try {
      const resp = await shipEscrow(id, { shipping_receipt: shipForm.receipt, media: shipForm.media || undefined });
      // Extract tracking number and audit metadata from server response
      const tn = resp?.tracking_number || resp?.tracking_no || resp?.shipping_receipt || resp?.shipping_receipt_number || shipForm.receipt;
      const audit = (() => {
        const file = resp?.audit?.file || resp?.file || (Array.isArray(resp?.files) ? resp.files[0] : undefined);
        if (!file) return undefined;
        const fileName = file?.originalname || file?.name || file?.filename;
        const fileType = file?.mimetype || file?.type || file?.contentType;
        const fileSize = typeof file?.size === 'number' ? file.size : undefined;
        return { fileName, fileType, fileSize };
      })();
      setShipSuccess({ trackingNumber: tn, audit, raw: resp });
      toast.success('Shipment submitted');
      const e = await getEscrow(id);
      setEscrow(e);
    } catch (err: any) {
      const serverMsg = err?.data?.message || err?.data?.error || err?.message;
      setShipError(serverMsg || 'Failed to submit shipment');
      toast.error(serverMsg || 'Failed to submit shipment');
    } finally {
      setUploading(false);
    }
  }

  // no buyer upload handler

  async function handleConfirmReceipt() {
    if (!id) return;
    setUploading(true);
    try {
      await confirmReceipt(id);
      toast.success('Receipt confirmed');
      const e = await getEscrow(id);
      setEscrow(e);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to confirm');
    } finally {
      setUploading(false);
    }
  }

  if (!escrow) return <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 mt-6 bg-white border rounded-xl shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Escrow {escrow.id}</h2>
        <StatusBadge status={escrow.status}/>
      </div>

      {shipSuccess && (
        <div className="mb-6 p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Shipment submitted</p>
              <p className="text-sm">Tracking number: <span className="font-mono">{shipSuccess.trackingNumber || '—'}</span></p>
              {shipSuccess.audit && (
                <div className="mt-1 text-xs text-emerald-900">
                  {shipSuccess.audit.fileName && <p>File: {shipSuccess.audit.fileName}</p>}
                  {shipSuccess.audit.fileType && <p>Type: {shipSuccess.audit.fileType}</p>}
                  {typeof shipSuccess.audit.fileSize === 'number' && <p>Size: {Math.round(shipSuccess.audit.fileSize/1024)} KB</p>}
                </div>
              )}
            </div>
            <button onClick={()=>setShipSuccess(null)} className="text-emerald-800 hover:text-emerald-900 text-sm">Dismiss</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  <Info label="Buyer Email" value={escrow.buyer || '—'}/>
  <Info label="Seller Email" value={escrow.seller}/>
        <Info label="Amount" value={formatIDR(escrow.amount)}/>
        <Info label="Created" value={new Date(escrow.createdAt).toLocaleString()}/>
      </div>

      <h3 className="font-semibold mb-2">Actions</h3>
      {isSeller && (
        <div className="space-y-3">
          {kycVerified === false && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">KYC verification required before shipping.</p>
                  <p className="text-sm">Status: <span className="font-medium">{kycInfo?.status || 'Unknown'}</span>{kycInfo?.level ? ` • Level: ${kycInfo.level}` : ''}</p>
                </div>
                <Link to="/kyc" className="text-sm px-3 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700">Go to KYC</Link>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Upload shipping proof (image/video)</label>
            <input type="file" accept="image/*,video/*" className="mt-1 block w-full" onChange={e=> setShipForm(f=>({ ...f, media: e.target.files?.[0] || null }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Shipping receipt number</label>
            <input className={`mt-1 w-full border rounded-lg p-2 ${shipError ? 'border-red-500' : ''}`} placeholder="e.g. JNE123456789" value={shipForm.receipt} onChange={e=> setShipForm(f=>({ ...f, receipt: e.target.value }))} />
            {shipError && <p className="mt-1 text-sm text-red-600">{shipError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleShip} disabled={uploading || escrow.status !== 'funded' || kycVerified === false} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">{uploading ? 'Submitting…' : 'Ship Item'}</button>
          </div>
          {kycVerified === false && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">KYC verification required before shipping.</p>
          )}
        </div>
      )}

      {isBuyer && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={handleConfirmReceipt} disabled={uploading || !(escrow.status === 'shipped' || escrow.status === 'delivered')} className="px-3 py-2 rounded-lg bg-green-600 text-white disabled:opacity-60">{uploading ? 'Processing…' : 'Finish (Confirm)'}</button>
          </div>
          {!(escrow.status === 'shipped' || escrow.status === 'delivered') && (
            <p className="text-sm text-gray-600">Finish will be available after the seller ships the item.</p>
          )}
        </div>
      )}

      <h3 className="font-semibold mt-8 mb-2">Status Timeline</h3>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["pending_payment","funded","shipped","delivered","released"] as EscrowStatus[]).map((s,i)=> (
          <span key={s} className={`px-2 py-1 rounded-md border ${s===escrow.status?'bg-indigo-600 text-white border-indigo-600':'bg-white'}`}>{i+1}. {s.replace("_"," ")}</span>
        ))}
      </div>
    </div>
  );
}