'use client';
import { useState } from 'react';
import { BarChart3, Download, Printer } from 'lucide-react';

export default function ReportesCatastroPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-stone-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-orange-400" />
          Reportes y Cierres Catastrales
        </h1>
        <p className="text-xs text-stone-400 mt-1">
          Libro de recaudación de Derecho de Frente, estadísticas de avalúo y solvencias catastrales.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-base">Cierre Diario de Caja Catastro</h3>
          <p className="text-xs text-stone-400">Total recaudado por concepto de Derecho de Frente y tasas catastrales.</p>
          <button
            onClick={() => alert('Generando Cuadre Diario de Catastro en PDF...')}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Printer className="w-4 h-4" /> Imprimir Cuadre
          </button>
        </div>

        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-base">Censo General Inmobiliario</h3>
          <p className="text-xs text-stone-400">Padrón de parcelas, metros cuadrados de terreno y construcción.</p>
          <button
            onClick={() => alert('Exportando Padrón Inmobiliario a Excel...')}
            className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-orange-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-stone-700 transition-all"
          >
            <Download className="w-4 h-4" /> Exportar Parcelas (Excel)
          </button>
        </div>

        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-base">Morosidad Derecho de Frente</h3>
          <p className="text-xs text-stone-400">Listado de inmuebles con trimestres pendientes por tributar.</p>
          <button
            onClick={() => alert('Generando Listado de Morosos Inmobiliarios...')}
            className="w-full py-2.5 bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-red-500/40 transition-all"
          >
            <Download className="w-4 h-4" /> Morosos Catastrales
          </button>
        </div>
      </div>
    </div>
  );
}
