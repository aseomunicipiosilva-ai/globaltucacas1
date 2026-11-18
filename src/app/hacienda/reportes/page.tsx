'use client';
import { useState } from 'react';
import { BarChart3, Download, Printer, Calendar, DollarSign } from 'lucide-react';

export default function ReportesHaciendaPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-sky-400" />
          Reportes y Cierres Diarios de Hacienda
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Libro diario de ingresos tributarios, recaudación de ISAE y cuadre de caja municipal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-base">Cierre Diario de Caja</h3>
          <p className="text-xs text-slate-400">Total recaudado hoy en taquilla de hacienda discriminado por forma de pago.</p>
          <button
            onClick={() => alert('Generando Cuadre Diario de Hacienda en PDF...')}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Printer className="w-4 h-4" /> Imprimir Cuadre Diario
          </button>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-base">Listado de Contribuyentes</h3>
          <p className="text-xs text-slate-400">Padrón de empresas comerciales e industriales con estatus de solvencia.</p>
          <button
            onClick={() => alert('Descargando Padrón Comercial en Excel...')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <Download className="w-4 h-4" /> Exportar Padrón (Excel)
          </button>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-base">Morosidad Comercial</h3>
          <p className="text-xs text-slate-400">Listado de comercios con meses pendientes por declarar o cancelar.</p>
          <button
            onClick={() => alert('Generando Informe de Morosidad...')}
            className="w-full py-2.5 bg-amber-600/30 text-amber-300 hover:bg-amber-600 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-amber-500/40 transition-all"
          >
            <Download className="w-4 h-4" /> Reporte de Morosos
          </button>
        </div>
      </div>
    </div>
  );
}
