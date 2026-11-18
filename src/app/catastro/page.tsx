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
  MapPin,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CatastroDashboard() {
  const [stats, setStats] = useState({
    totalInmuebles: 0,
    totalResidenciales: 0,
    totalComerciales: 0,
    totalIndustriales: 0,
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
          let res = 0;
          let com = 0;
          let ind = 0;
          let deudaAseo = 0;
          let solventes = 0;

          inms.forEach((i: any) => {
            const cls = (i.clasificacion || '').toUpperCase();
            if (cls.includes('RESIDENCIAL') || cls.includes('TIPO A')) res++;
            else if (cls.includes('COMERCIAL') || cls.includes('TIPO D') || cls.includes('TIPO B') || cls.includes('TIPO C')) com++;
            else if (cls.includes('INDUSTRIAL')) ind++;
            else res++;

            const dMMV = parseFloat(i.deuda_mmv || '0');
            const dCong = parseFloat(i.deuda_congelada_bs || '0');
            if (dMMV > 0 || dCong > 0) {
              deudaAseo++;
            } else {
              solventes++;
            }
          });

          setStats({
            totalInmuebles: inms.length,
            totalResidenciales: res,
            totalComerciales: com,
            totalIndustriales: ind,
            solventeCount: solventes,
            conDeudaAseo: deudaAseo
          });
        }
      } catch (e) {
        console.error('Error cargando métricas de Catastro:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-orange-400" />
            Panel de Control • Catastro Municipal
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Fichas catastrales, avalúo inmobiliario, Derecho de Frente y verificación de solvencia de aseo.
          </p>
        </div>

        <Link
          href="/catastro/caja"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:from-orange-400 hover:to-amber-500 transition-all"
        >
          <CreditCard className="w-4 h-4" />
          Abrir Caja de Catastro
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Inmuebles</span>
            <MapPin className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : stats.totalInmuebles}</p>
          <span className="text-[11px] text-orange-400 font-medium">Parcelas en padrón municipal</span>
        </div>

        <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase">Sector Residencial</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : stats.totalResidenciales}</p>
          <span className="text-[11px] text-amber-400 font-medium">Casas y apartamentos</span>
        </div>

        <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase">Solventes en Aseo</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{loading ? '...' : stats.solventeCount}</p>
          <span className="text-[11px] text-emerald-400/80 font-medium">Habilitados para trámites</span>
        </div>

        <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase">Con Deuda de Aseo</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-black text-red-400">{loading ? '...' : stats.conDeudaAseo}</p>
          <span className="text-[11px] text-red-400/80 font-medium">Trámite catastral bloqueado</span>
        </div>
      </div>

      {/* Accesos Directos a Módulos Operativos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link 
          href="/catastro/caja" 
          className="group p-5 bg-stone-950/90 border border-stone-800 hover:border-orange-500/60 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">Caja Catastral</h3>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Cobro de Derecho de Frente inmobiliario, cálculo de metros cuadrados y validación estricta de solvencia de aseo.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-900 flex items-center justify-between text-xs font-bold text-orange-400">
            <span>Ir a Caja</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link 
          href="/catastro/fichas" 
          className="group p-5 bg-stone-950/90 border border-stone-800 hover:border-amber-500/60 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">Fichas Catastrales</h3>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Expedientes de inmuebles, linderos, coordenadas, metros de terreno y construcción por sectores.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-900 flex items-center justify-between text-xs font-bold text-amber-400">
            <span>Ver Fichas</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link 
          href="/catastro/solvencias" 
          className="group p-5 bg-stone-950/90 border border-stone-800 hover:border-emerald-500/60 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">Verificador de Solvencias</h3>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Consulta de estado fiscal del inmueble y validación previa antes de emitir certificados catastrales.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-900 flex items-center justify-between text-xs font-bold text-emerald-400">
            <span>Consultar Solvencias</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
