'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  CreditCard, 
  Users, 
  Calculator, 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function HaciendaDashboard() {
  const [stats, setStats] = useState({
    totalComercial: 0,
    totalIndustrial: 0,
    totalContribuyentes: 0,
    solventeCount: 0,
    conDeudaAseo: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: inms } = await supabase
          .from('inmuebles')
          .select('id, clasificacion, deuda_mmv, deuda_congelada_bs');

        if (inms) {
          let com = 0;
          let ind = 0;
          let deudaAseo = 0;
          let solventes = 0;

          inms.forEach((i: any) => {
            const cls = (i.clasificacion || '').toUpperCase();
            if (cls.includes('COMERCIAL') || cls.includes('TIPO D') || cls.includes('TIPO B') || cls.includes('TIPO C')) com++;
            if (cls.includes('INDUSTRIAL')) ind++;

            const dMMV = parseFloat(i.deuda_mmv || '0');
            const dCong = parseFloat(i.deuda_congelada_bs || '0');
            if (dMMV > 0 || dCong > 0) {
              deudaAseo++;
            } else {
              solventes++;
            }
          });

          setStats({
            totalComercial: com,
            totalIndustrial: ind,
            totalContribuyentes: inms.length,
            solventeCount: solventes,
            conDeudaAseo: deudaAseo
          });
        }
      } catch (e) {
        console.error('Error cargando métricas de Hacienda:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-sky-400" />
            Panel de Control • Hacienda Municipal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión tributaria, actividades económicas (ISAE), patentes e interconexión con Aseo Urbano.
          </p>
        </div>

        <Link
          href="/hacienda/caja"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-blue-500 transition-all"
        >
          <CreditCard className="w-4 h-4" />
          Abrir Caja de Hacienda
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Padrón Comercial</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : stats.totalComercial}</p>
          <span className="text-[11px] text-sky-400 font-medium">Establecimientos activos</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Sector Industrial</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : stats.totalIndustrial}</p>
          <span className="text-[11px] text-indigo-400 font-medium">Empresas e industrias</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Solventes en Aseo</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{loading ? '...' : stats.solventeCount}</p>
          <span className="text-[11px] text-emerald-400/80 font-medium">Habilitados para cancelar</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Bloqueados por Deuda</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{loading ? '...' : stats.conDeudaAseo}</p>
          <span className="text-[11px] text-amber-400/80 font-medium">Debe regularizar aseo</span>
        </div>
      </div>

      {/* Accesos Directos a Módulos Operativos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link 
          href="/hacienda/caja" 
          className="group p-5 bg-slate-950/90 border border-slate-800 hover:border-sky-500/60 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors">Caja y Facturación</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Cobro de tributos municipales, validación de solvencia de aseo urbano en tiempo real y emisión de recibos oficiales.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs font-bold text-sky-400">
            <span>Ir a Caja</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link 
          href="/hacienda/censo" 
          className="group p-5 bg-slate-950/90 border border-slate-800 hover:border-indigo-500/60 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">Censo Comercial / Ind.</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Padrón compartido de comercios e industrias, clasificación por rubro, alícuotas y verificación fiscal.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs font-bold text-indigo-400">
            <span>Ver Censo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link 
          href="/hacienda/solvencias" 
          className="group p-5 bg-slate-950/90 border border-slate-800 hover:border-emerald-500/60 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">Verificador de Solvencias</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Buscador por RIF con semáforo cruzado de deudas de Aseo y autorización con check de supervisor.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs font-bold text-emerald-400">
            <span>Consultar Solvencias</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
