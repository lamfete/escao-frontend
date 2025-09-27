import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createEscrow } from "../services/api";

const schema = z.object({
  sellerId: z.string().min(3, "Seller ID required"),
  amount: z.coerce.number().positive(),
});

export default function EscrowNew(){
  const { register, handleSubmit, formState:{errors}, getValues } = useForm({ resolver: zodResolver(schema) });
  const navigate = useNavigate();
  const [showEula, setShowEula] = useState(false);
  const [creating, setCreating] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | undefined>(undefined);

  const onSubmit = () => {
    // First show EULA; we’ll actually create on Agree
    setShowEula(true);
  };

  const handleAgree = async () => {
    const data: any = getValues();
    setCreating(true);
    try {
      const e = await createEscrow(data);
      if (!e?.id) throw new Error("Missing escrow id in response");
      setPaymentUrl(e.paymentUrl);
      toast.success("Escrow created");
      setShowEula(false);
      // Go to Payment screen; pass paymentUrl if available
      navigate(`/escrow/${e.id}/payment`, { state: { amount: data.amount, paymentUrl: e.paymentUrl } });
    } catch (err: any) {
      const msg = err?.message || (err?.data && JSON.stringify(err.data)) || "Failed to create escrow";
      toast.error(msg);
      setShowEula(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      <h2 className="text-2xl font-bold mb-4">Create New Escrow</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white border rounded-xl p-6 shadow">
        <div><label className="text-sm font-medium">Seller ID</label><input className="mt-1 w-full border rounded-lg p-2" placeholder="uuid or username" {...register("sellerId")}/>{errors.sellerId && <p className="text-sm text-red-600">{String(errors.sellerId.message)}</p>}</div>
        <div><label className="text-sm font-medium">Amount (IDR)</label><input type="number" className="mt-1 w-full border rounded-lg p-2" placeholder="250000" {...register("amount")}/>{errors.amount && <p className="text-sm text-red-600">{String(errors.amount.message)}</p>}</div>
        {/* Deadline is now defaulted to 24 hours server-side; field removed */}
        <button disabled={creating} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60">{creating ? 'Creating…' : 'Create & Generate QR'}</button>
      </form>

      {paymentUrl && (
        <div className="mt-6 bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-2">Payment Link</h3>
          <a className="text-indigo-600 underline break-all" href={paymentUrl} target="_blank" rel="noreferrer">{paymentUrl}</a>
        </div>
      )}

      {showEula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-lg font-semibold">Escrow Terms & Conditions</h3>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto text-sm space-y-3">
              <p>Before creating an escrow, please review and accept the End User License Agreement (EULA) and the escrow service terms. By clicking Agree, you acknowledge:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Funds are held until delivery is confirmed according to platform policy.</li>
                <li>Disputes will be resolved per our dispute resolution process; outcomes may include refund, release, or split.</li>
                <li>Payment processing is handled by our partners; fees may apply.</li>
                <li>Your use complies with local regulations and the platform’s acceptable use policy.</li>
              </ul>
              <p>Full terms may be updated from time to time. Continued use constitutes acceptance of any changes.</p>
            </div>
            <div className="px-5 py-4 border-t flex items-center justify-end gap-3">
              <button onClick={()=> setShowEula(false)} className="px-4 py-2 rounded-lg border">Disagree</button>
              <button onClick={handleAgree} disabled={creating} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60">{creating ? 'Processing…' : 'Agree'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}