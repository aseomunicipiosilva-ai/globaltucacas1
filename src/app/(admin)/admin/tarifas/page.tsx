'use client';
import { useState, useEffect } from 'react';
import { ordenanzaData } from '@/data/ordenanza';
import { Calculator, Building, Home, Coins } from 'lucide-react';

export default function TarifasPage() {
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [bcvDate, setBcvDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBcv = async () => {
      try {
        const res = await fetch('/api/bcv');
        const data = await res.json();
        setBcvRate(data.tcmmv);
        setBcvDate(new Date(data.timestamp).toLocaleString());
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBcv();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Cargando tasas y ordenanza...</div>;
  }

  const rate = bcvRate || 1;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Tarifas según Ordenanza
          </h1>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded border border-blue-200 text-sm font-medium">
          Tasa Oficial BCV: <span className="font-bold">{rate.toFixed(2)} Bs</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Tarifas Residenciales */}
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Home className="w-4 h-4 text-slate-600" />
            <h2 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Tarifas Residenciales</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Clasificador</th>
                  <th className="px-4 py-3 font-semibold text-center w-32">Factor (TCMMV)</th>
                  <th className="px-4 py-3 font-semibold text-right w-40">Monto Mensual (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenanzaData.tiposResidenciales.map((tipo, idx) => {
                  const monto = (tipo.factor * rate).toFixed(2);
                  return (
                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700">{tipo.label}</td>
                      <td className="px-4 py-3 text-center">{tipo.factor.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700 bg-green-50/30">Bs. {monto}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tarifas Comerciales */}
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-600" />
            <h2 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Tarifas Comerciales / Institucionales</h2>
          </div>
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
            Los cálculos muestran el monto final en Bolívares (Factor TCMMV × Tasa BCV) para cada nivel de metraje.
          </div>
          <div className="overflow-x-auto h-[600px] relative">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase border-r border-slate-200 bg-slate-100">Actividad Económica</th>
                  {ordenanzaData.nivelesMetraje.map((nivel, idx) => (
                    <th key={idx} className="px-4 py-3 font-bold text-center border-r border-slate-200 bg-slate-100 w-32">
                      <div className="text-[10px] text-slate-500 font-normal uppercase mb-1">Nivel {idx + 1}</div>
                      {nivel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenanzaData.actividadesComerciales.map((actividad, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700 border-r border-slate-100 bg-white sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {actividad.label}
                    </td>
                    {actividad.factores.map((factor, fIdx) => {
                      const monto = (factor * rate).toFixed(2);
                      return (
                        <td key={fIdx} className="px-4 py-2 text-center border-r border-slate-100 group relative cursor-default">
                          <div className="text-[10px] text-slate-400 mb-0.5">{factor.toFixed(2)} TCMMV</div>
                          <div className="font-bold text-green-700">Bs. {monto}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
