// import React from "react";
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
  const { register, handleSubmit, formState:{errors} } = useForm({ resolver: zodResolver(schema) });
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      <h2 className="text-2xl font-bold mb-4">Create New Escrow</h2>
      <form onSubmit={handleSubmit(async (data:any)=>{
        try {
          const e = await createEscrow(data);
          if (!e?.id) throw new Error("Missing escrow id in response");
          toast.success("Escrow created");
          navigate(`/escrow/${e.id}`);
        } catch (err: any) {
          const msg = err?.message || (err?.data && JSON.stringify(err.data)) || "Failed to create escrow";
          toast.error(msg);
        }
      })} className="space-y-4 bg-white border rounded-xl p-6 shadow">
        <div><label className="text-sm font-medium">Seller ID</label><input className="mt-1 w-full border rounded-lg p-2" placeholder="uuid or username" {...register("sellerId")}/>{errors.sellerId && <p className="text-sm text-red-600">{String(errors.sellerId.message)}</p>}</div>
        <div><label className="text-sm font-medium">Amount (IDR)</label><input type="number" className="mt-1 w-full border rounded-lg p-2" placeholder="250000" {...register("amount")}/>{errors.amount && <p className="text-sm text-red-600">{String(errors.amount.message)}</p>}</div>
  {/* Deadline is now defaulted to 24 hours server-side; field removed */}
        <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Create & Generate QR</button>
      </form>
    </div>
  );
}