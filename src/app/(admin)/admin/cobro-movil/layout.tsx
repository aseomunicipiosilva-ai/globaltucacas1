'use client';
import { AppProvider } from '@/store/AppContext';
import AdminAuthWrapper from '@/components/AdminAuthWrapper';
import { Smartphone } from 'lucide-react';

export default function CobroMovilLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthWrapper>
      <AppProvider>
        <div className="min-h-screen bg-slate-900 flex flex-col">
          {/* Mini header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span className="text-white font-bold text-sm">Cobro Móvil</span>
              <span className="text-slate-400 text-xs">· Aseo Urbano</span>
            </div>
            <a href="/admin" className="text-slate-400 text-xs underline">Panel Principal</a>
          </div>
          <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
            {children}
          </div>
        </div>
      </AppProvider>
    </AdminAuthWrapper>
  );
}
