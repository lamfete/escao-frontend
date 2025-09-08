import /* React,*/ { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Navbar(){
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600"/>
          <span className="text-xl font-bold text-indigo-700">{import.meta.env.VITE_APP_NAME || "EscrowPay"}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/" className={({isActive})=> isActive? 'text-indigo-600 font-semibold':'text-gray-600 hover:text-indigo-600'}>Home</NavLink>
          <NavLink to="/dashboard" className={({isActive})=> isActive? 'text-indigo-600 font-semibold':'text-gray-600 hover:text-indigo-600'}>Dashboard</NavLink>
          <NavLink to="/escrow/new" className={({isActive})=> isActive? 'text-indigo-600 font-semibold':'text-gray-600 hover:text-indigo-600'}>New Escrow</NavLink>
          <NavLink to="/admin" className={({isActive})=> isActive? 'text-indigo-600 font-semibold':'text-gray-600 hover:text-indigo-600'}>Admin</NavLink>
          {!user && <NavLink to="/login" className={({isActive})=> isActive? 'text-indigo-600 font-semibold':'text-gray-600 hover:text-indigo-600'}>Login</NavLink>}
          {user && <button onClick={logout} className="text-gray-600 hover:text-indigo-600">Logout</button>}
        </nav>
        <button className="md:hidden inline-flex items-center justify-center p-2 rounded-md border" onClick={()=>setOpen(!open)} aria-label="Toggle menu">☰</button>
      </div>
      {open && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-2">
          <NavLink to="/" onClick={()=>setOpen(false)} className="block text-gray-700">Home</NavLink>
          <NavLink to="/dashboard" onClick={()=>setOpen(false)} className="block text-gray-700">Dashboard</NavLink>
          <NavLink to="/escrow/new" onClick={()=>setOpen(false)} className="block text-gray-700">New Escrow</NavLink>
          <NavLink to="/admin" onClick={()=>setOpen(false)} className="block text-gray-700">Admin</NavLink>
          {!user && <NavLink to="/login" onClick={()=>setOpen(false)} className="block text-gray-700">Login</NavLink>}
          {user && <button onClick={()=>{logout(); setOpen(false);}} className="block text-left text-gray-700">Logout</button>}
        </div>
      )}
    </header>
  );
}
