// import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { register as apiRegister } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const schema = z.object({ email: z.string().email(), password: z.string().min(6), role: z.enum(["buyer","seller"]) });

export default function Register(){
  const { register, handleSubmit, formState:{errors} } = useForm({ resolver: zodResolver(schema) });
  const navigate = useNavigate();
  const { login } = useAuth();

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow border mt-10">
      <h2 className="text-2xl font-bold mb-4">Create Account</h2>
      <form onSubmit={handleSubmit(async (data:any)=>{
        const user = await apiRegister(data.email, data.password, data.role);
        login(user);
        toast.success("Account created");
        navigate("/dashboard");
      })} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input type="email" className="mt-1 w-full border rounded-lg p-2" {...register("email")} />
          {errors.email && <p className="text-sm text-red-600">{String(errors.email.message)}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input type="password" className="mt-1 w-full border rounded-lg p-2" {...register("password")} />
          {errors.password && <p className="text-sm text-red-600">{String(errors.password.message)}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Role</label>
          <select className="mt-1 w-full border rounded-lg p-2" {...register("role")}>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
        </div>
        <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Create Account</button>
      </form>
    </div>
  );
}