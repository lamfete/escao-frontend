import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { formatIDR } from "../utils/format";
import { getEscrow, fundEscrow } from "../services/api";

type NavState = { amount?: number; paymentUrl?: string } | null;

export default function EscrowPayment(){
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as NavState) || null;
  const [amount, setAmount] = useState<number | null>(navState?.amount ?? null);
  const [paymentUrl] = useState<string | undefined>(navState?.paymentUrl);
  const [waiting, setWaiting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [method, setMethod] = useState<'QRIS' | 'BI-FAST'>('QRIS');

  // Generate dummy payment codes once
  const { qrisCode, bifastCode } = useMemo(() => {
    const rand = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random()*10)).join("");
    return {
      qrisCode: `00020101021126680012ID.CO.QRIS01189360091100123456789020303UKE52040000${rand(10)}5802ID5913ESCROW PAYMENT6009JAKARTA6105123406304${rand(4)}`,
      bifastCode: `9001-${rand(4)}-${rand(4)}-${rand(4)}`,
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (amount == null && id) {
      getEscrow(id).then(e => {
        if (!active) return;
        setAmount(e.amount ?? null);
      }).catch(err => {
        toast.error(err?.message || 'Failed to load escrow');
      });
    }
    return () => { active = false; };
  }, [amount, id]);

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied'); } catch {}
  };

  const handleConfirm = async () => {
    if (!id) return;
    setWaiting(true);
    toast('Submitting payment…');
    try {
      // Send funding details to backend (dummy values for now)
    const isQris = method === 'QRIS';
      const makeRef = () => `TXN${Math.random().toString(36).slice(2,8).toUpperCase()}${Date.now().toString().slice(-6)}`;
      await fundEscrow(id, {
        method,
        pg_reference: makeRef(),
        qr_code_url: isQris ? (paymentUrl || 'https://example.com/qr/123') : undefined,
      });
    } catch (err: any) {
      setWaiting(false);
      toast.error(err?.message || 'Failed to submit payment');
      return;
    }

    // Poll the escrow until status becomes funded (basic demo polling)
    let attempts = 0;
    const maxAttempts = 10; // ~20s
    const poll = async () => {
      attempts += 1;
      try {
        const e = await getEscrow(id);
        if (String(e.status).toLowerCase() === 'funded') {
          setConfirmed(true);
          setWaiting(false);
          toast.success('Payment confirmed');
          return;
        }
      } catch {}
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setWaiting(false);
        toast('Still waiting for payment confirmation…');
      }
    };
    setTimeout(poll, 1500);
  };

  const goToEscrow = () => { if (id) navigate(`/escrow/${id}`); };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      <h2 className="text-2xl font-bold mb-1">Complete Payment</h2>
      <p className="text-sm text-gray-600 mb-6">Escrow ID: {id}</p>

      <div className="bg-white border rounded-xl p-6 shadow space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Amount</span>
          <span className="text-lg font-semibold">{amount != null ? formatIDR(amount) : '—'}</span>
        </div>

        <div className="pt-2">
          <h3 className="font-semibold mb-2">Choose Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={()=>setMethod('QRIS')} className={`p-3 border rounded-lg text-sm ${method==='QRIS' ? 'border-indigo-600 ring-2 ring-indigo-200' : ''}`}>QRIS</button>
            <button type="button" onClick={()=>setMethod('BI-FAST')} className={`p-3 border rounded-lg text-sm ${method==='BI-FAST' ? 'border-indigo-600 ring-2 ring-indigo-200' : ''}`}>BI-FAST</button>
          </div>
        </div>

        {paymentUrl && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
            Prefer a hosted checkout? <a className="text-indigo-700 underline" href={paymentUrl} target="_blank" rel="noreferrer">Open payment page</a>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">QRIS</h3>
            <div className="h-40 bg-gray-100 rounded flex items-center justify-center text-gray-400 mb-3">Dummy QR</div>
            <div className="text-xs break-all bg-gray-50 border rounded p-2">{qrisCode}</div>
            <div className="mt-2 flex justify-end">
              <button onClick={()=>handleCopy(qrisCode)} className="text-sm px-3 py-1 border rounded">Copy</button>
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">BI-FAST</h3>
            <p className="text-sm text-gray-600 mb-2">Use this virtual account code in your banking app:</p>
            <div className="text-lg font-mono bg-gray-50 border rounded p-2 text-center">{bifastCode}</div>
            <div className="mt-2 flex justify-end">
              <button onClick={()=>handleCopy(bifastCode)} className="text-sm px-3 py-1 border rounded">Copy</button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          {!confirmed ? (
            <button onClick={handleConfirm} disabled={waiting} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {waiting ? 'Processing…' : 'Confirm Payment'}
            </button>
          ) : (
            <button onClick={goToEscrow} className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">Go to Escrow</button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="font-semibold mb-2">Status</h4>
        {!waiting && !confirmed && (
          <div className="text-sm text-gray-600">Ready to confirm.</div>
        )}
        {waiting && !confirmed && (
          <div className="flex items-center gap-2 text-gray-700 text-sm">
            <span className="inline-block h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
            Waiting for payment…
          </div>
        )}
        {confirmed && (
          <div className="flex items-center gap-2 text-emerald-700 text-sm">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
            Funded
          </div>
        )}
      </div>
    </div>
  );
}
