'use client';
import { useState } from 'react';
import { MoreVertical, Printer, FileText, Send, Calendar, CheckSquare } from 'lucide-react';

export default function EstadoCuentaPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden text-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700 uppercase flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            ESTADO DE CUENTA
          </h2>
        </div>
        
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-indigo-50/50 text-indigo-900 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3 font-semibold">Inmueble</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Uso</th>
                <th className="px-4 py-3 font-semibold">Solvente</th>
                <th className="px-4 py-3 font-semibold text-right">Deuda</th>
                <th className="px-4 py-3 font-semibold">Base</th>
                <th className="px-4 py-3 font-semibold">Dirección</th>
                <th className="px-4 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4 text-slate-700">I-000252</td>
                <td className="px-4 py-4 text-slate-600">Casa</td>
                <td className="px-4 py-4 text-slate-600">Residencial</td>
                <td className="px-4 py-4">
                  <span className="text-red-600 font-semibold text-xs flex flex-col">
                    <span>NO</span>
                    <span className="text-[10px] text-slate-500">Con deudas</span>
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-red-600 font-semibold">49.153,50</span>
                </td>
                <td className="px-4 py-4 text-slate-600">Pro</td>
                <td className="px-4 py-4 text-slate-500 text-xs whitespace-normal min-w-[250px]">
                  Avenida Hugo Chavez Casa 05 El Calvario Municipio Silva, Falcón Zona Postal 2055
                </td>
                <td className="px-4 py-4 text-center relative">
                  <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-600" />
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpen && (
                    <div className="absolute right-8 top-10 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-10 py-1 text-left">
                      <button className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2">
                        <span className="text-lg leading-none">+</span> Detalle Pagos
                      </button>
                      <button className="w-full px-4 py-2 text-sm text-blue-600 bg-blue-50/50 hover:bg-blue-50 flex items-center gap-2 border-l-2 border-blue-600">
                        <FileText className="w-4 h-4" />
                        Ver Estado de Cuenta
                      </button>
                      <button className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Printer className="w-4 h-4 text-slate-500" />
                        Imprimir Recibo
                      </button>
                      <button className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Send className="w-4 h-4 text-slate-500" />
                        Reenviar Recibo
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
