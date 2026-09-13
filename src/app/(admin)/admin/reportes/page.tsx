'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAppContext } from '@/store/AppContext';
import { Download } from 'lucide-react';
import * as xlsx from 'xlsx';
import { generarLibroVentas as generarLibroVentasExcel } from './generators/LibroVentas';
import { generarSaldosFavorExcel } from './generators/SaldoAFavor';
import { generarCorteCajaPDF, generarIngresoBancarioPDF } from './generators/PdfReports';
import { generarEmpleadosExcel } from './generators/Empleados';
import { generarFiscalizacionExcel } from './generators/Fiscalizacion';
import { generarCuadreCajaPDF } from './generators/CuadreCaja';
import CajaIngresosMain from './views/CajaIngresosMain';
import CuadreCaja from './views/CuadreCaja';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ActiveView = null | 'ingresos' | 'corte' | 'libro-ventas' | 'fiscalizacion' | 'empleados' | 'saldos' | 'ingreso-bancario';

const CARDS = [
  { id: 'ingresos' as ActiveView,       label: 'Caja - Ingresos',         emoji: '🖨️',  desc: 'General de Ingresos, Corte, Libro de Ventas', adminOnly: false },
  { id: 'corte' as ActiveView,          label: 'Cuadre de Caja',          emoji: '🗂️',  desc: 'Cuadre diario por cajero y forma de pago',    adminOnly: false },
  { id: 'fiscalizacion' as ActiveView,  label: 'Fiscalizacion',           emoji: '🛡️',  desc: 'Reporte de contribuyentes fiscalizados',       adminOnly: true  },
  { id: 'saldos' as ActiveView,         label: 'Saldo a Favor',           emoji: '💳',  desc: 'Contribuyentes con saldo a favor vigente',     adminOnly: true  },
  { id: 'empleados' as ActiveView,      label: 'Gestion Empleados',       emoji: '👥',  desc: 'Reporte mensual del personal',                 adminOnly: true  },
];

export default function ReportesPage() {
  const { contribuyentes, tcmmv } = useAppContext();
  const [activeView, setActiveView] = useState<ActiveView>(null);
  const [pagos, setPagos] = useState<any[]>([]);
  const [cajeros, setCajeros] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    const user = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || '';
    setCurrentUser(user);
    let adminCheck = false;
    if (typeof window !== 'undefined') {
      try {
        const userData = JSON.parse(localStorage.getItem('admin_user_data') || '{}');
        if (userData.rol === 'Administrador' || userData.rol === 'SuperAdmin' || user === 'Administrador' || user === 'dzara') {
          adminCheck = true;
        }
      } catch(e) {}
    }
    setIsAdmin(adminCheck);

    const loadPagos = async () => {
      const { data } = await supabase.from('pagos_reportados').select('*').order('created_at', { ascending: false });
      if (data) {
        setPagos(data);
        const cajerosSet = new Set<string>();
        data.forEach((p: any) => {
          try {
            const dets = typeof p.detalles === 'object' ? p.detalles : JSON.parse(p.detalles || '{}');
            if (dets.cajero) cajerosSet.add(dets.cajero);
          } catch(e) {}
        });
        setCajeros(Array.from(cajerosSet).sort());
      }
    };
    loadPagos();
  }, []);

  // --- Legacy export functions (kept for download buttons) ---
  const generarLibroVentas = (tipo: 'Diario' | 'Semanal' | 'Mensual') => {
    let pf = pagos;
    if (fechaInicio && fechaFin) {
      const s = new Date(fechaInicio + 'T00:00:00'), e = new Date(fechaFin + 'T23:59:59');
      pf = pagos.filter((p: any) => { const d = new Date(p.created_at); return d >= s && d <= e; });
    }
    generarLibroVentasExcel(pf, contribuyentes, tipo, fechaInicio, fechaFin);
  };
  const generarSaldosFavor = async () => {
    const mes = new Date().toLocaleString('es-VE', { month: 'long' });
    const { data } = await supabase.from('saldos_favor').select('*');
    generarSaldosFavorExcel(data || [], mes);
  };
  const generarCorteCaja = () => {
    const s = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : new Date(new Date().setHours(0,0,0,0));
    const e = fechaFin ? new Date(fechaFin + 'T23:59:59') : new Date(new Date().setHours(23,59,59,999));
    const pf = pagos.filter((p: any) => { const d = new Date(p.created_at); return d >= s && d <= e; });
    generarCorteCajaPDF(pf, contribuyentes, fechaInicio, fechaFin);
  };
  const generarIngresoBancario = (tipo: 'Diario' | 'Semanal' | 'Mensual') => {
    let pf = pagos;
    if (fechaInicio && fechaFin) {
      const s = new Date(fechaInicio + 'T00:00:00'), e = new Date(fechaFin + 'T23:59:59');
      pf = pagos.filter((p: any) => { const d = new Date(p.created_at); return d >= s && d <= e; });
    }
    generarIngresoBancarioPDF(pf, contribuyentes, tipo, fechaInicio, fechaFin);
  };
  const generarEmpleados = async () => {
    const { data } = await supabase.from('gestion_empleados').select('*');
    if (data) generarEmpleadosExcel(data);
  };
  const generarFiscalizacion = (tipo: string) => {
    generarFiscalizacionExcel(contribuyentes.slice(0, 50), tipo);
  };

  // --- Routing ---
  if (activeView === 'ingresos') return (
    <CajaIngresosMain
      pagos={pagos} cajeros={cajeros} isAdmin={isAdmin} currentUser={currentUser}
      tcmmv={tcmmv || 0} contribuyentes={contribuyentes} onBack={() => setActiveView(null)}
    />
  );

  if (activeView === 'corte') return (
    <CuadreCaja
      pagos={pagos} cajeros={cajeros} isAdmin={isAdmin} currentUser={currentUser}
      onBack={() => setActiveView(null)}
    />
  );

  if (activeView === 'libro-ventas') return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setActiveView(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">← Regresar</button>
        <span className="text-slate-300">|</span>
        <h1 className="text-lg font-bold text-slate-800">📊 Resumen Libro de Ventas</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3 max-w-md">
        <div className="flex gap-3 mb-4">
          <div className="flex flex-col flex-1"><label className="text-xs text-slate-500 mb-1">Desde</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="flex flex-col flex-1"><label className="text-xs text-slate-500 mb-1">Hasta</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
        {(['Diario','Semanal','Mensual'] as const).map(t => (
          <button key={t} onClick={() => generarLibroVentas(t)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 transition-colors">
            Libro de Ventas {t} <Download className="w-4 h-4 text-blue-500" />
          </button>
        ))}
      </div>
    </div>
  );

  if (activeView === 'fiscalizacion') return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setActiveView(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">← Regresar</button>
        <span className="text-slate-300">|</span>
        <h1 className="text-lg font-bold text-slate-800">🛡️ Fiscalizacion</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3 max-w-md">
        <button onClick={() => generarFiscalizacion('General')} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-purple-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 transition-colors">Reporte General (Excel) <Download className="w-4 h-4 text-purple-500" /></button>
        <button onClick={() => generarFiscalizacion('Pendientes')} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-purple-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 transition-colors">Por Fiscalizar (Excel) <Download className="w-4 h-4 text-purple-500" /></button>
      </div>
    </div>
  );

  if (activeView === 'empleados') return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setActiveView(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">← Regresar</button>
        <span className="text-slate-300">|</span>
        <h1 className="text-lg font-bold text-slate-800">👥 Gestion Empleados</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-md">
        <button onClick={generarEmpleados} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-orange-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 transition-colors">Reporte Mensual (Excel) <Download className="w-4 h-4 text-orange-500" /></button>
      </div>
    </div>
  );

  if (activeView === 'saldos') return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setActiveView(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">← Regresar</button>
        <span className="text-slate-300">|</span>
        <h1 className="text-lg font-bold text-slate-800">💳 Saldo a Favor</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-md">
        <button onClick={generarSaldosFavor} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-teal-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 transition-colors">Reporte Mensual (Excel) <Download className="w-4 h-4 text-teal-500" /></button>
      </div>
    </div>
  );

  if (activeView === 'ingreso-bancario') return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setActiveView(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">← Regresar</button>
        <span className="text-slate-300">|</span>
        <h1 className="text-lg font-bold text-slate-800">🏦 Ingreso Bancario</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3 max-w-md">
        <div className="flex gap-3 mb-4">
          <div className="flex flex-col flex-1"><label className="text-xs text-slate-500 mb-1">Desde</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="flex flex-col flex-1"><label className="text-xs text-slate-500 mb-1">Hasta</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
        {(['Diario','Semanal','Mensual'] as const).map(t => (
          <button key={t} onClick={() => generarIngresoBancario(t)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-red-50 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 transition-colors">
            Ingreso Bancario {t} (PDF) <Download className="w-4 h-4 text-red-500" />
          </button>
        ))}
      </div>
    </div>
  );

  // --- Main landing: Cards ---
  const visibleCards = CARDS.filter(c => isAdmin || !c.adminOnly);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Reportes</h1>
        <p className="text-slate-500 text-sm mt-1">Selecciona un modulo para generar o visualizar el reporte</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {visibleCards.map(card => (
          <button
            key={card.id}
            onClick={() => setActiveView(card.id)}
            className="group bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center gap-3 text-center hover:border-blue-400 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="text-3xl group-hover:scale-110 transition-transform duration-200">{card.emoji}</div>
            <span className="text-sm font-semibold text-slate-700 leading-tight">{card.label}</span>
            <span className="text-[11px] text-slate-400 leading-snug">{card.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
