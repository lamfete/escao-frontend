// import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Home(){
  const { user } = useAuth();
  
  return (
    <section className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Secure & Simple Escrow Payments</h1>
          <p className="text-lg text-gray-600">Protect transactions with BI-FAST & QRIS. Built for Indonesia’s digital economy.</p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/register" className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700">Create Account</Link>
                <Link to="/login" className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl hover:bg-gray-300">Login</Link>
              </>
            )}
          </div>
        </div>
        <div className="md:justify-self-end">
          <div className="rounded-2xl shadow-lg w-full max-w-lg h-64 bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center text-indigo-700 font-semibold">Illustration</div>
        </div>
      </div>
    </section>
  );
}
