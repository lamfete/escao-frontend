// import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { login as apiLogin } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export default function Login(){
  const { register, handleSubmit, formState:{errors} } = useForm({ resolver: zodResolver(schema) });
  const navigate = useNavigate();
  const { login } = useAuth();

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow border mt-10">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <form onSubmit={handleSubmit(async (data) => {
  try {
    const user = await apiLogin(data.email, data.password);
    login(user);
    toast.success("Welcome back!");
    navigate("/dashboard");
  } catch (err: any) {
    let msg = "Login failed. Please try again.";
    if (typeof err === "object" && err !== null) {
      if (err["error"] === "Invalid email or password") {
        msg = "Invalid email or password. Please check your credentials and try again.";
      }
    }
    toast.error(msg, {
      icon: "🚫",
      style: { background: "#fee", color: "#b00", fontWeight: "bold" }
    });
  }
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
        <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Login</button>
      </form>
    </div>
  );
}