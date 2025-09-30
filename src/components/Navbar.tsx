import /* React,*/ { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getMyKycStatus } from "../services/api";

export default function Navbar(){
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) { if (active) setKycVerified(null); return; }
      try {
        const kyc = await getMyKycStatus();
        if (!active) return;
        const verified = Boolean((kyc as any)?.verified) || String((kyc as any)?.status || '').toLowerCase() === 'verified';
        setKycVerified(verified);
      } catch {
        if (active) setKycVerified(null);
      }
    }
    load();
    return () => { active = false; };
  }, [user]);

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
          {user && kycVerified === false && (
            <NavLink to="/kyc" className={({isActive})=> isActive? 'text-amber-700 font-semibold':'text-amber-700 hover:text-amber-800'}>KYC</NavLink>
          )}
          {!user && <NavLink to="/login" className={({isActive})=> isActive? 'text-indigo-600 font-semibold':'text-gray-600 hover:text-indigo-600'}>Login</NavLink>}
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-gray-600">{user.email}</span>
              <button onClick={logout} className="text-gray-600 hover:text-indigo-600">Logout</button>
            </div>
          )}
        </nav>
        <button className="md:hidden inline-flex items-center justify-center p-2 rounded-md border" onClick={()=>setOpen(!open)} aria-label="Toggle menu">☰</button>
      </div>
      {open && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-2">
          <NavLink to="/" onClick={()=>setOpen(false)} className="block text-gray-700">Home</NavLink>
          <NavLink to="/dashboard" onClick={()=>setOpen(false)} className="block text-gray-700">Dashboard</NavLink>
          <NavLink to="/escrow/new" onClick={()=>setOpen(false)} className="block text-gray-700">New Escrow</NavLink>
          <NavLink to="/admin" onClick={()=>setOpen(false)} className="block text-gray-700">Admin</NavLink>
          {user && kycVerified === false && (
            <NavLink to="/kyc" onClick={()=>setOpen(false)} className="block text-amber-700">KYC</NavLink>
          )}
          {!user && <NavLink to="/login" onClick={()=>setOpen(false)} className="block text-gray-700">Login</NavLink>}
          {user && (
            <>
              <div className="text-gray-600">{user.email}</div>
              <button onClick={()=>{logout(); setOpen(false);}} className="block text-left text-gray-700">Logout</button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
