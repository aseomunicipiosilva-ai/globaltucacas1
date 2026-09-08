'use client';
import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Download, Settings2, ShieldAlert, RefreshCw } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { exportToExcelWithLogos } from '@/lib/excelExport';
import { logos } from '@/lib/logosBase64';

export default function ReportesPage() {
  const { facturas } = useAppContext();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  // ── FILTRO DE RECAUDACIÓN POR PERÍODO ──────────────────────────────────────
  const [periodoFilter, setPeriodoFilter] = useState<'esta_semana' | 'semana_pasada' | 'este_mes' | 'mes_pasado' | 'personalizado'>('este_mes');
  const [fechaDesde, setFechaDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [recaudacionData, setRecaudacionData] = useState<any[]>([]);
  const [isLoadingRecaud, setIsLoadingRecaud] = useState(false);
  const [recaudTotal, setRecaudTotal] = useState(0);

  const getPeriodDates = (period: string) => {
    const now = new Date();
    let desde = new Date();
    let hasta = new Date();
    switch (period) {
      case 'esta_semana':
        desde = new Date(now); desde.setDate(now.getDate() - now.getDay());
        hasta = new Date();
        break;
      case 'semana_pasada':
        desde = new Date(now); desde.setDate(now.getDate() - now.getDay() - 7);
        hasta = new Date(now); hasta.setDate(now.getDate() - now.getDay() - 1);
        break;
      case 'este_mes':
        desde = new Date(now.getFullYear(), now.getMonth(), 1);
        hasta = new Date();
        break;
      case 'mes_pasado':
        desde = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        hasta = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default: return null;
    }
    return { desde: desde.toISOString().split('T')[0], hasta: hasta.toISOString().split('T')[0] };
  };

  const cargarRecaudacion = async () => {
    setIsLoadingRecaud(true);
    try {
      let desde = fechaDesde;
      let hasta = fechaHasta;
      if (periodoFilter !== 'personalizado') {
        const dates = getPeriodDates(periodoFilter);
        if (dates) { desde = dates.desde; hasta = dates.hasta; }
      }
      const { data, error } = await supabase
        .from('pagos_reportados')
        .select('*')
        .eq('estado', 'Aprobado')
        .gte('created_at', `${desde}T00:00:00.000Z`)
        .lte('created_at', `${hasta}T23:59:59.999Z`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecaudacionData(data || []);
      setRecaudTotal((data || []).reduce((acc: number, p: any) => acc + (parseFloat(p.monto) || 0), 0));
    } catch (e: any) {
      alert('Error cargando recaudación: ' + e.message);
    }
    setIsLoadingRecaud(false);
  };

  const exportarRecaudacion = () => {
    if (recaudacionData.length === 0) return alert('No hay datos para exportar. Aplica un filtro primero.');
    const excelData = recaudacionData.map((p: any) => {
      let detalles: any = {};
      try { detalles = JSON.parse(p.detalles); } catch(e){}
      return {
        'Fecha': new Date(p.created_at).toLocaleString('es-VE'),
        'Identidad': p.identidad,
        'Contribuyente': p.contribuyente || '---',
        'Método de Pago': p.tipo,
        'Banco': p.banco || '---',
        'Referencia': p.referencia || '---',
        'Monto (Bs)': parseFloat(p.monto) || 0,
        'Cajero': detalles.cajero || 'Sistema',
        'Estado': p.estado
      };
    });
    exportToExcelWithLogos(excelData, `Recaudacion_${periodoFilter}_${new Date().toISOString().split('T')[0]}.xlsx`, 'Recaudación');
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Helper to load image as base64
  const loadImage = async (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject('No 2d context');
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const generarFacturasAnuladas = async () => {
    setIsGeneratingPdf(true);
    try {
      const anuladas = (facturas || []).filter((f: any) => f.estado === 'Anulado' || f.estado === 'Reversado');
      
      const doc = new jsPDF('landscape');
      
      // Load logos
      
      doc.addImage(logos.alcaldia, 'JPEG', 14, 10, 20, 25);
      doc.addImage(logos.isma, 'JPEG', 40, 12, 20, 20);
      doc.addImage(logos.global_rec, 'JPEG', 230, 15, 35, 12);
      doc.addImage(logos.basura_cero, 'JPEG', 270, 12, 20, 20);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURAS ANULADAS Y REVERSADAS", 140, 25, { align: 'center' });
      
      const tableData = anuladas.map((f: any) => [
        f.identidad || '---',
        f.contribuyente || '---',
        f.referencia || '---',
        f.emision || '---',
        f.estado || '---',
        f.nota || 'Sin comentarios'
      ]);

      autoTable(doc, {
        startY: 45,
        headStyles: { fillColor: [30, 41, 59] },
        head: [['Código/RIF', 'Nombre / Razón Social', 'Nro. Factura', 'Fecha Emisión', 'Estatus', 'Comentarios']],
        body: tableData,
        theme: 'striped'
      });

      doc.save(`Facturas_Anuladas_${new Date().getTime()}.pdf`);
    } catch (error: any) {
      alert("Error al generar el PDF: " + error.message);
      console.error(error);
    }
    setIsGeneratingPdf(false);
  };

  const generarConciliacionBancaria = async () => {
    setIsGeneratingExcel(true);
    try {
      // Fetch pagos_reportados
      const { data: pagos, error } = await supabase
        .from('pagos_reportados')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      const excelData = (pagos || []).map((p: any) => {
        let detalles: any = {};
        try { detalles = JSON.parse(p.detalles); } catch(e){}
        
        return {
          "FECHA": p.created_at ? new Date(p.created_at).toLocaleDateString() : '---',
          "BANCO": p.banco,
          "REFERENCIA": p.referencia,
          "TIPO": "Transferencia",
          "MONTO BS": p.monto,
          "FECHA PAGO": p.created_at ? new Date(p.created_at).toLocaleDateString() : '---',
          "RECIBO NRO": detalles.recibos ? detalles.recibos.join(', ') : '---',
          "CÓDIGO/RIF": p.identidad,
          "NOMBRE": p.contribuyente || '---',
          "MONTO FACTURA": p.monto,
          "TASA BCV": detalles.tcmmv || 16, // example
          "IGTF": 0,
          "RET ISLR": 0,
          "RET IVA": 0,
          "TOTAL A DEPOSITAR": p.monto,
          "MONTO DEPOSITADO": p.monto
        };
      });

      await exportToExcelWithLogos(excelData, `Conciliacion_Bancaria_${new Date().getTime()}.xlsx`, "Conciliación");
    } catch (error) {
      alert("Error al generar Excel");
      console.error(error);
    }
    setIsGeneratingExcel(false);
  };

  const generarMontoRecaudado = async () => {
    setIsGeneratingExcel(true);
    try {
      const { data: pagos, error } = await supabase
        .from('pagos_reportados')
        .select('*')
        .eq('estado', 'Aprobado')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      const { exportMontoRecaudadoExcel } = await import('@/lib/montoRecaudadoExport');
      await exportMontoRecaudadoExcel(pagos || [], `Monto_Diario_Recaudado_${new Date().getTime()}.xlsx`);
    } catch (error) {
      alert("Error al generar Excel");
      console.error(error);
    }
    setIsGeneratingExcel(false);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Módulo de Reportes
          </h1>
        </div>
      </div>

      {/* ── DASHBOARD RECAUDACIÓN POR PERÍODO ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          Recaudación por Período
        </h2>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          {(['esta_semana','semana_pasada','este_mes','mes_pasado','personalizado'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodoFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                periodoFilter === p
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50'
              }`}
            >
              {p === 'esta_semana' ? 'Esta Semana' : p === 'semana_pasada' ? 'Semana Pasada' : p === 'este_mes' ? 'Este Mes' : p === 'mes_pasado' ? 'Mes Pasado' : 'Personalizado'}
            </button>
          ))}
          {periodoFilter === 'personalizado' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-semibold">Desde:</label>
                <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-semibold">Hasta:</label>
                <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs"
                />
              </div>
            </>
          )}
          <button
            onClick={cargarRecaudacion}
            disabled={isLoadingRecaud}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoadingRecaud ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Consultar
          </button>
          {recaudacionData.length > 0 && (
            <button
              onClick={exportarRecaudacion}
              className="bg-slate-700 hover:bg-slate-800 text-white font-bold py-1.5 px-4 rounded-lg text-xs flex items-center gap-2 transition-colors"
            >
              <FileSpreadsheet className="w-3 h-3" />
              Exportar Excel ({recaudacionData.length})
            </button>
          )}
        </div>

        {recaudacionData.length > 0 ? (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-emerald-800">Total Recaudado en el Período:</span>
              <span className="text-2xl font-black text-emerald-700">Bs. {recaudTotal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 font-bold">Fecha</th>
                    <th className="px-3 py-2 font-bold">Identidad</th>
                    <th className="px-3 py-2 font-bold">Contribuyente</th>
                    <th className="px-3 py-2 font-bold">Método</th>
                    <th className="px-3 py-2 font-bold">Referencia</th>
                    <th className="px-3 py-2 font-bold text-right">Monto (Bs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recaudacionData.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">{new Date(p.created_at).toLocaleDateString('es-VE')}</td>
                      <td className="px-3 py-2 font-semibold">{p.identidad}</td>
                      <td className="px-3 py-2">{p.contribuyente || '---'}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.tipo === 'Debito' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{p.tipo}</span></td>
                      <td className="px-3 py-2">{p.referencia || '---'}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">Bs. {parseFloat(p.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">Selecciona un período y haz clic en &quot;Consultar&quot; para ver la recaudación.</p>
        )}
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta Facturas Anuladas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Facturas Anuladas</h3>
          <p className="text-slate-500 text-sm mb-6 flex-grow">
            Genera un reporte en PDF con todas las facturas anuladas o reversadas.
          </p>
          <button 
            onClick={generarFacturasAnuladas}
            disabled={isGeneratingPdf}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGeneratingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generar PDF
          </button>
        </div>

        {/* Tarjeta Conciliación Bancaria */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Conciliación Bancaria</h3>
          <p className="text-slate-500 text-sm mb-6 flex-grow">
            Exporta pagos reportados y conciliados cruzados con las facturas (Excel).
          </p>
          <button 
            onClick={generarConciliacionBancaria}
            disabled={isGeneratingExcel}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGeneratingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar Excel
          </button>
        </div>

        {/* Tarjeta Monto Recaudado */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Settings2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Monto Recaudado €</h3>
          <p className="text-slate-500 text-sm mb-6 flex-grow">
            Exporta el consolidado de montos recaudados con conversiones a Euros basadas en TCMMV.
          </p>
          <button 
            onClick={generarMontoRecaudado}
            disabled={isGeneratingExcel}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGeneratingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar Excel
          </button>
        </div>

        {/* Tarjeta Reporte Diario por Caja */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Reporte Diario por Caja</h3>
          <p className="text-slate-500 text-sm mb-6 flex-grow">
            Genera un reporte de caja de los pagos procesados en el día actual (Punto y Transferencias).
          </p>
          <button 
            onClick={async () => {
              setIsGeneratingExcel(true);
              try {
                const today = new Date().toISOString().split('T')[0];
                const { data: pagos, error } = await supabase
                  .from('pagos_reportados')
                  .select('*')
                  .gte('created_at', `${today}T00:00:00.000Z`)
                  .lte('created_at', `${today}T23:59:59.999Z`)
                  .order('created_at', { ascending: true });
                  
                if (error) throw error;
                
                const excelData = (pagos || []).map((p: any) => {
                  let detalles: any = {};
                  try { detalles = JSON.parse(p.detalles); } catch(e){}
                  
                  return {
                    "FECHA HORA": new Date(p.created_at).toLocaleString(),
                    "MÉTODO DE PAGO": p.tipo || p.metodo || 'No definido',
                    "BANCO": p.banco || '---',
                    "REFERENCIA": p.referencia || '---',
                    "CÓDIGO/RIF": p.identidad,
                    "CONTRIBUYENTE": p.contribuyente || '---',
                    "MONTO BS": parseFloat(p.monto) || 0,
                    "CAJERO": detalles.cajero || 'Sistema',
                    "ESTADO": p.estado
                  };
                });

                await exportToExcelWithLogos(excelData, `Reporte_Diario_Caja_${today}.xlsx`, "Reporte Diario");
              } catch (error) {
                alert("Error al generar Reporte de Caja");
                console.error(error);
              }
              setIsGeneratingExcel(false);
            }}
            disabled={isGeneratingExcel}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGeneratingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar Excel
          </button>
        </div>

      </div>
    </div>
  );
}


