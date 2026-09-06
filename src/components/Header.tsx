'use client';
import { Power, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  
  return (
    <header className="h-16 bg-[#1e293b] fixed top-0 right-0 left-64 flex items-center justify-between px-6 z-10 border-b border-slate-700 shadow-sm">
      <div className="flex items-center gap-6">
        <button className="text-slate-300 hover:text-white transition-colors mr-2">
          <Menu className="w-6 h-6" />
        </button>
        {/* Banner de Logos */}
        <div className="hidden md:flex items-center gap-3 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
          <img src="/logos/alcaldia.jpg" alt="Alcaldia" className="h-12 w-auto object-contain rounded" />
          <img src="/logos/isma.jpg" alt="ISMA" className="h-12 w-auto object-contain rounded" />
          <img src="/logos/global_rec.jpg" alt="Global Rec" className="h-12 w-auto object-contain rounded bg-white p-0.5" />
          <img src="/logos/basura_cero.jpg" alt="Basura Cero" className="h-12 w-auto object-contain rounded bg-white p-0.5" />
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-right">
          <div className="font-medium text-yellow-500">Usuario Oficial</div>
          <div className="text-xs text-slate-300">Última Conexión: Hoy</div>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
          title="Cerrar sesión"
        >
          <Power className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
