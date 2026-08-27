import { Briefcase, Plus, FileText, Search } from 'lucide-react';
import Link from 'next/link';

export default function ActividadesEconomicasPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-500" />
            Actividades Económicas
          </h1>
          <p className="text-slate-500 mt-1">Gestión de empresas, patentes y declaraciones juradas.</p>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Nueva Declaración
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Registrar Empresa
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por RIF o Razón Social..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none">
            <option value="todas">Todas las Empresas</option>
            <option value="activas">Activas</option>
            <option value="solventes">Solventes</option>
            <option value="morosas">Morosas</option>
          </select>
        </div>

        <div className="p-6 text-center text-slate-500">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay empresas registradas aún.</p>
        </div>
      </div>
    </div>
  );
}
