'use client';
import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { FileSpreadsheet, Download, Filter, RefreshCw, Zap } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import tarifasData from '@/data/tarifas.json';

export default function EstadoCuentaPage() {
  const { facturas, inmuebles } = useAppContext();
  const [tcmmv, setTcmmv] = useState<number | null>(null);
  const [loadingTasa, setLoadingTasa] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    actualizarTasa();
  }, []);

  const actualizarTasa = async () => {
    setLoadingTasa(true);
    try {
      const res = await fetch('/api/bcv');
      const data = await res.json();
      if (data.tcmmv) {
        setTcmmv(data.tcmmv);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingTasa(false);
  };

  const generarFacturacionMensual = async () => {
    if (!tcmmv) {
      alert("Debes actualizar la tasa TCMMV primero.");
      return;
    }
    
    if (!confirm(`¿Generar facturación usando TCMMV de ${tcmmv} Bs? Esto facturará a los ${inmuebles.length} inmuebles.`)) {
      return;
    }

    setIsGenerating(true);
    
    let noConfigurados: string[] = [];
    const nuevasFacturas = [];
    
    // Obtener mes actual
    const fecha = new Date();
    const emision = fecha.toISOString().split('T')[0];
    fecha.setMonth(fecha.getMonth() + 1);
    const vencimiento = fecha.toISOString().split('T')[0];

    for (let i = 0; i < inmuebles.length; i++) {
      const inm = inmuebles[i];
      const actividad = inm.actividad_principal;
      const clasificacion = inm.clasificacion || 'A';
      
      const tarifasPorActividad = (tarifasData as any)[actividad];
      
      if (!tarifasPorActividad) {
        if (!noConfigurados.includes(actividad)) noConfigurados.push(actividad);
        continue;
      }
      
      const tarifaMMV = tarifasPorActividad[clasificacion] || tarifasPorActividad['A'];
      const montoCalculado = (tarifaMMV * tcmmv).toFixed(2);
      
      nuevasFacturas.push({
        referencia: `FAC-${Date.now().toString().slice(-6)}-${i}`,
        identidad: inm.identidad,
        contribuyente: inm.contribuyente,
        monto: `${montoCalculado} Bs`,
        emision: emision,
        vencimiento: vencimiento,
        estado: 'Pendiente'
      });
    }

    if (noConfigurados.length > 0) {
      alert(`Atención: Las siguientes actividades no están en la ordenanza y no se facturaron:\n${noConfigurados.join(', ')}`);
    }

    // Insertar masivo (en lotes si es necesario, pero supabase acepta arrays grandes)
    // Para simplificar enviamos de 500 en 500
    for(let i=0; i<nuevasFacturas.length; i+=500){
      const chunk = nuevasFacturas.slice(i, i+500);
      await supabase.from('facturas').insert(chunk);
    }

    alert(`Se han generado ${nuevasFacturas.length} facturas exitosamente.`);
    setIsGenerating(false);
    // Idealmente haríamos un refetch del context aquí, o se actualiza en tiempo real
    window.location.reload();
  };

  const columns = [
    { key: 'referencia', header: 'Nro. Factura' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'monto', header: 'Monto' },
    { key: 'estado', header: 'Estado', render: (row: any) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${
        row.estado === 'Pagado' ? 'bg-green-100 text-green-700' :
        row.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
      }`}>{row.estado}</span>
    ) },
    { key: 'emision', header: 'F. Emisión' },
    { key: 'vencimiento', header: 'F. Vencimiento' },
    { key: 'actions', header: 'Acciones', render: () => (
      <button className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
        <Download size={14} /> Descargar
      </button>
    ) }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Estado de Cuenta General
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-200">
            <span className="text-xs font-medium text-slate-500">TCMMV (Euro):</span>
            <span className="text-sm font-bold text-slate-800">
              {tcmmv ? `${tcmmv} Bs` : '---'}
            </span>
            <button 
              onClick={actualizarTasa}
              disabled={loadingTasa}
              className="ml-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="Actualizar Tasa desde BCV"
            >
              <RefreshCw size={14} className={loadingTasa ? 'animate-spin' : ''} />
            </button>
          </div>

          <button 
            onClick={generarFacturacionMensual}
            disabled={isGenerating || !tcmmv}
            className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Zap className="w-4 h-4" /> 
            {isGenerating ? 'Generando...' : 'Generar Facturación'}
          </button>
        </div>
      </div>
      <DataTable data={facturas} columns={columns} itemsPerPage={10} />
    </div>
  );
}
