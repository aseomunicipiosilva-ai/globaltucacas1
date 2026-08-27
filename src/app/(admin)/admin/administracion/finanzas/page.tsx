import { LayoutDashboard } from 'lucide-react';

export default function finanzasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <LayoutDashboard className="w-6 h-6 text-indigo-500" />
        Módulo: FINANZAS
      </h1>
      <p className="text-slate-600">Este módulo se encuentra en construcción.</p>
    </div>
  );
}
