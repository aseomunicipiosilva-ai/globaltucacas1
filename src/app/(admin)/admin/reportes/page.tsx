'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAppContext } from '@/store/AppContext';
import { FileText, FileSpreadsheet, Download, Filter, Calendar } from 'lucide-react';
import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generarLibroVentas as generarLibroVentasExcel } from './generators/LibroVentas';
import { generarSaldosFavorExcel } from './generators/SaldoAFavor';
import { generarCorteCajaPDF, generarIngresoBancarioPDF } from './generators/PdfReports';
import { generarEmpleadosExcel } from './generators/Empleados';
import { generarFiscalizacionExcel } from './generators/Fiscalizacion';
import { generarCuadreCajaPDF } from './generators/CuadreCaja';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ReportesPage() {
  const { facturas, contribuyentes, condominios } = useAppContext();
  const [pagos, setPagos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedCajero, setSelectedCajero] = useState('Todos');
  const [cajerosDisponibles, setCajerosDisponibles] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState('Administrador');

  useEffect(() => {
    // Fetch base data for reports
    const user = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || 'Administrador';
    setCurrentUser(user);
    if (user !== 'Administrador') setSelectedCajero(user);
    const loadPagos = async () => {
      const { data } = await supabase.from('pagos_reportados').select('*').order('created_at', { ascending: false });
      if (data) {
        setPagos(data);
        const cajerosSet = new Set<string>();
        data.forEach(p => {
          try {
            const dets = JSON.parse(p.detalles);
            if (dets.cajero) cajerosSet.add(dets.cajero);
          } catch(e) {}
        });
        setCajerosDisponibles(Array.from(cajerosSet));
      }
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

  const generarSaldosFavor = async () => {
    const mes = new Date().toLocaleString('es-VE', { month: 'long' });
    const { data } = await supabase.from('saldos_favor').select('*');
    generarSaldosFavorExcel(data || [], mes);
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

  const generarCuadreCaja = () => {
    let pagosFiltrados = pagos;
    const start = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : new Date(new Date().setHours(0,0,0,0));
    const end = fechaFin ? new Date(fechaFin + 'T23:59:59') : new Date(new Date().setHours(23,59,59,999));
    
    pagosFiltrados = pagos.filter((p: any) => {
      const d = new Date(p.created_at);
      let isCajeroMatch = true;
      if (selectedCajero !== 'Todos') {
        try {
          const dets = JSON.parse(p.detalles);
          isCajeroMatch = dets.cajero === selectedCajero;
        } catch(e) {
          isCajeroMatch = false;
        }
      }
      return d >= start && d <= end && isCajeroMatch;
    });

    generarCuadreCajaPDF(pagosFiltrados, fechaInicio, fechaFin, selectedCajero);
  };

  const generarEmpleados = async () => {
    const { data } = await supabase.from('gestion_empleados').select('*');
    if (data) {
      generarEmpleadosExcel(data);
    }
  };

  const generarFiscalizacion = (tipo: string) => {
    // Para simplificar, usamos un set de contribuyentes
    generarFiscalizacionExcel(contribuyentes.slice(0, 50), tipo);
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
            <label className="text-xs font-bold text-slate-500 mb-1">Cajero (Corte)</label>
            <select 
              className="border rounded p-2 text-sm max-w-[150px]"
              value={selectedCajero}
              onChange={e => setSelectedCajero(e.target.value)}
              disabled={currentUser !== 'Administrador'}
            >
              <option value="Todos">Todos (Unificado)</option>
              {cajerosDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
              {!cajerosDisponibles.includes('Caja 1') && <option value="Caja 1">Caja 1</option>}
              {!cajerosDisponibles.includes('Caja 2') && <option value="Caja 2">Caja 2</option>}
              {!cajerosDisponibles.includes('Caja 3') && <option value="Caja 3">Caja 3</option>}
              {!cajerosDisponibles.includes('Caja 4') && <option value="Caja 4">Caja 4</option>}
              {!cajerosDisponibles.includes('Caja 5') && <option value="Caja 5">Caja 5</option>}
              {!cajerosDisponibles.includes('Caja 6') && <option value="Caja 6">Caja 6</option>}
            </select>
          </div>
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
            <h2 className="font-bold text-lg text-slate-800">Caja e Ingresos</h2>
          </div>
          <div className="space-y-3">
            {currentUser === 'Administrador' && (
              <>
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
              </>
            )}

            <button onClick={generarCorteCaja} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-red-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Corte de Caja a las 12 (PDF) <FileText className="w-4 h-4 text-red-500" />
            </button>
            
            <button onClick={generarCuadreCaja} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-emerald-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
              Cuadre de Caja (PDF) <FileText className="w-4 h-4 text-emerald-500" />
            </button>
            
            {currentUser === 'Administrador' && (
              <>
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
              </>
            )}
          </div>
        </div>

        {currentUser === 'Administrador' && (
          <>
            {/* MODULO FISCALIZACION */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-lg text-slate-800">Fiscalización</h2>
              </div>
              <div className="space-y-3">
                <button onClick={() => generarFiscalizacion('General')} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-purple-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
                  Reporte General (Excel) <Download className="w-4 h-4 text-purple-500" />
                </button>
                <button onClick={() => generarFiscalizacion('Pendientes')} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-purple-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
                  Por Fiscalizar (Excel) <Download className="w-4 h-4 text-purple-500" />
                </button>
              </div>
            </div>

            {/* GESTIÓN DE EMPLEADOS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-lg text-slate-800">Gestión de Empleados</h2>
              </div>
              <div className="space-y-3">
                <button onClick={generarEmpleados} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-orange-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
                  Reporte Mensual (Excel) <Download className="w-4 h-4 text-orange-500" />
                </button>
              </div>
            </div>

            {/* MODULO SALDO A FAVOR */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-teal-100 text-teal-600 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-lg text-slate-800">Saldo a Favor</h2>
              </div>
              <div className="space-y-3">
                <button onClick={generarSaldosFavor} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-teal-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center justify-between transition-colors">
                  Reporte Mensual (Excel) <Download className="w-4 h-4 text-teal-500" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
