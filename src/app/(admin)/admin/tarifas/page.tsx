'use client';
import { useState, useEffect, useMemo } from 'react';
import { ordenanzaData } from '@/data/ordenanza';
import { Calculator, Building, Home, Coins, Search, Filter } from 'lucide-react';

export default function TarifasPage() {
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [bcvDate, setBcvDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Todas');
  const tabs = ['Todas', 'Residencial', 'Comercial/Institucional'];

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
  const searchTerm = searchQuery.toLowerCase();

  const filteredResidenciales = ordenanzaData.tiposResidenciales.filter(
    (tipo) => tipo.label.toLowerCase().includes(searchTerm)
  );

  const filteredComerciales = ordenanzaData.actividadesComerciales.filter(
    (act) => act.label.toLowerCase().includes(searchTerm)
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Tarifas según Ordenanza
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar tarifa o actividad..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-64 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded border border-blue-200 text-sm font-medium">
            Tasa Oficial BCV: <span className="font-bold">{rate.toFixed(2)} Bs</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pb-2">
        <Filter className="w-4 h-4 text-slate-400 mr-2" />
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Tarifas Residenciales */}
        {(activeTab === 'Todas' || activeTab === 'Residencial') && (
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-200">
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
                {filteredResidenciales.length > 0 ? (
                  filteredResidenciales.map((tipo, idx) => {
                    const monto = (tipo.factor * rate).toFixed(2);
                    return (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">{tipo.label}</td>
                        <td className="px-4 py-3 text-center">{tipo.factor.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700 bg-green-50/30">Bs. {monto}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">No se encontraron clasificaciones residenciales</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Tarifas Comerciales */}
        {(activeTab === 'Todas' || activeTab === 'Comercial/Institucional') && (
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-200">
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
                {filteredComerciales.length > 0 ? (
                  filteredComerciales.map((actividad, idx) => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={ordenanzaData.nivelesMetraje.length + 1} className="px-4 py-8 text-center text-slate-500">
                      No se encontraron actividades comerciales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
