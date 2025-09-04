import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createEscrow } from "../services/api";

const schema = z.object({
  sellerId: z.string().min(3, "Seller ID required"),
  amount: z.coerce.number().positive(),
  deadlineConfirm: z.string().min(10, "Use ISO date e.g. 2025-12-31T00:00:00Z"),
});

export default function EscrowNew(){
  const { register, handleSubmit, formState:{errors} } = useForm({ resolver: zodResolver(schema) });
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
      <h2 className="text-2xl font-bold mb-4">Create New Escrow</h2>
      <form onSubmit={handleSubmit(async (data:any)=>{
        const e = await createEscrow(data);
        toast.success("Escrow created");
        navigate(`/escrow/${e.id}`);
      })} className="space-y-4 bg-white border rounded-xl p-6 shadow">
        <div><label className="text-sm font-medium">Seller ID</label><input className="mt-1 w-full border rounded-lg p-2" placeholder="uuid or username" {...register("sellerId")}/>{errors.sellerId && <p className="text-sm text-red-600">{String(errors.sellerId.message)}</p>}</div>
        <div><label className="text-sm font-medium">Amount (IDR)</label><input type="number" className="mt-1 w-full border rounded-lg p-2" placeholder="250000" {...register("amount")}/>{errors.amount && <p className="text-sm text-red-600">{String(errors.amount.message)}</p>}</div>
        <div><label className="text-sm font-medium">Deadline Confirm (ISO)</label><input className="mt-1 w-full border rounded-lg p-2" placeholder="2025-12-31T00:00:00Z" {...register("deadlineConfirm")}/>{errors.deadlineConfirm && <p className="text-sm text-red-600">{String(errors.deadlineConfirm.message)}</p>}</div>
        <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Create & Generate QR</button>
      </form>
    </div>
  );
}