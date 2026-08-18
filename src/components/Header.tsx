'use client';
import { Power, Menu } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 bg-[#1e293b] fixed top-0 right-0 left-64 flex items-center justify-between px-6 z-10 border-b border-slate-700 shadow-sm">
      <div className="flex items-center">
        <button className="text-slate-300 hover:text-white transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-right">
          <div className="font-medium text-yellow-500">Usuario Oficial</div>
          <div className="text-xs text-slate-300">Última Conexión: Hoy</div>
        </div>
        <button className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
          <Power className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
