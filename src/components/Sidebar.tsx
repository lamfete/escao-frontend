import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar(){
  return (
    <aside className="w-full md:w-60 shrink-0 border-r bg-white">
      <nav className="p-4 space-y-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg ${isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`
          }
        >
          Overview
        </NavLink>
        <NavLink
          to="/escrow/new"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg ${isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`
          }
        >
          Start Escrow
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg ${isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`
          }
        >
          Admin Panel
        </NavLink>
      </nav>
    </aside>
  );
}
