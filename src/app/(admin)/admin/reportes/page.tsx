'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAppContext } from '@/store/AppContext';
import { FileText, FileSpreadsheet, Download, Filter, Calendar } from 'lucide-react';
import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generarLibroVentas as generarLibroVentasExcel } from './generators/LibroVentas';
import { generarCorteCajaPDF, generarIngresoBancarioPDF } from './generators/PdfReports';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ReportesPage() {
  const { facturas, contribuyentes, condominios } = useAppContext();
  const [pagos, setPagos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    // Fetch base data for reports
    const loadPagos = async () => {
      const { data } = await supabase.from('pagos_reportados').select('*').order('created_at', { ascending: false });
      if (data) setPagos(data);
    };
    loadPagos();
  }, [supabase]);

  // Funciones de Excel
  const exportarExcel = (data: any[], filename: string) => {
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Reporte");
    xlsx.writeFile(wb, `${filename}_${new Date().getTime()}.xlsx`);
  };

  const generarLibroVentas = (tipo: 'Diario' | 'Semanal' | 'Mensual') => {
    let pagosFiltrados = pagos;
    if (fechaInicio && fechaFin) {
      const start = new Date(fechaInicio + 'T00:00:00');
      const end = new Date(fechaFin + 'T23:59:59');
      pagosFiltrados = pagos.filter((p: any) => {
        const d = new Date(p.created_at);
        return d >= start && d <= end;
      });
    }
    generarLibroVentasExcel(pagosFiltrados, contribuyentes, tipo, fechaInicio, fechaFin);
  };

  const generarSaldosFavor = () => {
    const conSaldo = contribuyentes.filter((c: any) => parseFloat(c.SaldoFavor || '0') > 0);
    const data = conSaldo.map((c: any, idx: number) => ({
      "#": idx + 1,
      "Contribuyente": `${c.Identidad} ${c.Contribuyente}`,
      "Inmueble": c.CodCont || 'N/A',
      "Pago Hasta": "N/A", // Se debe calcular con la ultima factura pagada
      "Períodos Vencidos": 0,
      "Saldo a Favor": parseFloat(c.SaldoFavor || '0').toFixed(2),
      "Deuda": "0.00"
    }));
    exportarExcel(data, 'Saldo_A_Favor');
  };

  const generarCorteCaja = () => {
    let pagosFiltrados = pagos;
    
    // Si no hay fechas, usa la de hoy
    const start = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : new Date(new Date().setHours(0,0,0,0));
    const end = fechaFin ? new Date(fechaFin + 'T23:59:59') : new Date(new Date().setHours(23,59,59,999));
    
    pagosFiltrados = pagos.filter((p: any) => {
      const d = new Date(p.created_at);
      return d >= start && d <= end;
    });

    generarCorteCajaPDF(pagosFiltrados, contribuyentes, fechaInicio, fechaFin);
  };

  const generarIngresoBancario = (tipo: 'Diario' | 'Semanal' | 'Mensual') => {
    let pagosFiltrados = pagos;
    
    if (fechaInicio && fechaFin) {
      const start = new Date(fechaInicio + 'T00:00:00');
      const end = new Date(fechaFin + 'T23:59:59');
      pagosFiltrados = pagos.filter((p: any) => {
        const d = new Date(p.created_at);
        return d >= start && d <= end;
      });
    }

    generarIngresoBancarioPDF(pagosFiltrados, contribuyentes, tipo, fechaInicio, fechaFin);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Centro de Reportes</h1>
          <p className="text-slate-500 mt-1">Generación de modelos de exportación en PDF y Excel</p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1">Desde</label>
            <input type="date" className="border rounded p-2 text-sm" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1">Hasta</label>
            <input type="date" className="border rounded p-2 text-sm" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* MODULO CAJA - INGRESOS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-lg text-slate-800">Módulo Caja (Ingresos)</h2>
          </div>
          <div className="space-y-3">
            <button onClick={() => generarLibroVentas('Diario')} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Libro de Ventas Diario <Download className="w-4 h-4 text-blue-500" />
            </button>
            <button onClick={() => generarLibroVentas('Semanal')} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Libro de Ventas Semanal <Download className="w-4 h-4 text-blue-500" />
            </button>
            <button onClick={() => generarLibroVentas('Mensual')} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Libro de Ventas Mensual <Download className="w-4 h-4 text-blue-500" />
            </button>
            <hr className="my-2" />
            <button onClick={generarCorteCaja} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-red-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Corte de Caja a las 12 (PDF) <FileText className="w-4 h-4 text-red-500" />
            </button>
            <hr className="my-2" />
            <button onClick={() => generarIngresoBancario('Diario')} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-red-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Ingreso Bancario Diario (PDF) <FileText className="w-4 h-4 text-red-500" />
            </button>
            <button onClick={() => generarIngresoBancario('Semanal')} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-red-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Ingreso Bancario Semanal (PDF) <FileText className="w-4 h-4 text-red-500" />
            </button>
            <button onClick={() => generarIngresoBancario('Mensual')} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-red-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Ingreso Bancario Mensual (PDF) <FileText className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>

        {/* MODULO FISCALIZACION */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-lg text-slate-800">Fiscalización</h2>
          </div>
          <div className="space-y-3">
            <button onClick={() => alert("En desarrollo")} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-purple-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Reporte General de Fiscalizaciones <Download className="w-4 h-4 text-purple-500" />
            </button>
            <button onClick={() => alert("En desarrollo")} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-purple-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Reporte Por Fiscalizar <Download className="w-4 h-4 text-purple-500" />
            </button>
          </div>
        </div>

        {/* MODULO SALDO A FAVOR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-lg text-slate-800">Saldos a Favor</h2>
          </div>
          <div className="space-y-3">
            <button onClick={generarSaldosFavor} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-emerald-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Reporte Saldos a Favor Mensual <Download className="w-4 h-4 text-emerald-500" />
            </button>
          </div>
        </div>

        {/* MODULO GESTIÓN DE EMPLEADOS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-lg text-slate-800">Gestión de Empleados</h2>
          </div>
          <div className="space-y-3">
            <button onClick={() => alert("En desarrollo")} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-orange-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Reporte Mensual de Gestión <Download className="w-4 h-4 text-orange-500" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
