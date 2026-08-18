'use client';
import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { FileSpreadsheet, Download, Filter, RefreshCw, Zap, Printer, X } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import tarifasData from '@/data/tarifas.json';
import { ReciboImprimible } from '@/components/ReciboImprimible';

export default function EstadoCuentaPage() {
  const { facturas, inmuebles } = useAppContext();
  const [tcmmv, setTcmmv] = useState<number | null>(null);
  const [loadingTasa, setLoadingTasa] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecibo, setSelectedRecibo] = useState<any>(null);

  const handleOpenRecibo = (row: any) => {
    const montoNumerico = parseFloat((row.monto || "0").replace(/[^\d.]/g, '')) || 0;
    
    // Obtener mes y año
    let mesTexto = '---';
    if (row.emision) {
      const date = new Date(row.emision);
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      // Se ajusta usando la fecha local o UTC dependiendo del formato (YYYY-MM-DD usa UTC si se parsea directo o local si tiene T)
      // Extraemos los trozos manualmente para evitar desfases horarios:
      const parts = row.emision.split('-');
      if(parts.length >= 2) {
        mesTexto = `${meses[parseInt(parts[1]) - 1]} ${parts[0]}`;
      }
    }

    setSelectedRecibo({
      reciboNo: row.referencia ? row.referencia.split('-').pop()?.padStart(7, '0') : '0000001',
      controlWeb: row.estado === 'Pagado' ? 'WEB-0000001' : '',
      fechaEmision: row.emision || new Date().toISOString().split('T')[0],
      codContribuyente: row.identidad || '---',
      razonSocial: row.contribuyente || '---',
      domicilioFiscal: "ZONA TUCACAS (SECTOR NO ESPECIFICADO)",
      rifCi: row.identidad || '---',
      caja: "F-OMAR",
      conceptos: [
        { 
          descripcion: `Servicio Aseo Residencial/Comercial. Correspondiente al mes de: ${mesTexto}`, 
          precioUnit: montoNumerico, 
          total: montoNumerico 
        }
      ],
      subTotal: montoNumerico,
      exento: montoNumerico,
      iva: 0,
      total: montoNumerico,
      formaPago: row.estado === 'Pagado' ? 'TRANSFERENCIA' : 'POR PAGAR',
      banco: row.estado === 'Pagado' ? 'BANCO CONFIRMADO' : '---',
      referencia: row.estado === 'Pagado' ? Math.floor(Math.random() * 90000000 + 10000000).toString() : '---'
    });
  };

  const handleTest6Meses = () => {
    const meses = ['MARZO 2026', 'ABRIL 2026', 'MAYO 2026', 'JUNIO 2026', 'JULIO 2026', 'AGOSTO 2026'];
    const montoUnitario = 150.00;
    const conceptos = meses.map(mes => ({
      descripcion: `Servicio Aseo Residencial/Comercial. Correspondiente al mes de: ${mes}`,
      precioUnit: montoUnitario,
      total: montoUnitario
    }));

    setSelectedRecibo({
      reciboNo: '0000888',
      controlWeb: 'WEB-0000001',
      fechaEmision: new Date().toISOString().split('T')[0],
      codContribuyente: 'V-12345678',
      razonSocial: 'CONTRIBUYENTE DE PRUEBA (6 MESES)',
      domicilioFiscal: "ZONA TUCACAS (SECTOR NO ESPECIFICADO)",
      rifCi: 'V-12345678',
      caja: "F-OMAR",
      conceptos: conceptos,
      subTotal: montoUnitario * 6,
      exento: montoUnitario * 6,
      iva: 0,
      total: montoUnitario * 6,
      formaPago: 'TRANSFERENCIA',
      banco: 'BANESCO',
      referencia: Math.floor(Math.random() * 90000000 + 10000000).toString()
    });
  };

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
    { key: 'actions', header: 'Acciones', render: (row: any) => (
      <button 
        onClick={() => handleOpenRecibo(row)}
        className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded text-xs flex items-center gap-2 transition-colors font-medium border border-blue-200"
      >
        <Printer size={14} /> Recibo
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
            onClick={handleTest6Meses}
            className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
          >
            Prueba 6 Meses
          </button>
          
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

      {selectedRecibo && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-lg print:hidden">
              <h3 className="font-semibold text-slate-800">Vista Previa del Recibo</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Printer size={16} /> Imprimir
                </button>
                <button 
                  onClick={() => setSelectedRecibo(null)}
                  className="text-slate-400 hover:text-slate-600 p-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Contenedor imprimible */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-200 print:bg-white print:p-0 print:overflow-visible" id="printable-receipt">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * { visibility: hidden; }
                  #printable-receipt, #printable-receipt * { visibility: visible; }
                  #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
                }
              `}} />
              <ReciboImprimible data={selectedRecibo} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
