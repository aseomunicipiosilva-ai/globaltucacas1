'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
  Radio, 
  Truck, 
  MapPin, 
  RefreshCw, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  User, 
  Route, 
  Scale, 
  Eye, 
  EyeOff, 
  Navigation,
  Trash2,
  CheckSquare,
  Square,
  Crosshair,
  Layers,
  Clock,
  BookOpen,
  Calendar,
  X,
  Compass,
  Store,
  Home,
  Building,
  CheckCircle,
  XCircle,
  FileText,
  Smartphone,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PuntoAseo } from '@/components/AseoMapaContribuyentes';

const SalaMapaInteractivo = dynamic(() => import('@/components/SalaMapaInteractivo'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" /> Cargando mapa satelital de camiones...
    </div>
  )
});

const AseoMapaContribuyentes = dynamic(() => import('@/components/AseoMapaContribuyentes'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" /> Cargando mapa satelital de contribuyentes...
    </div>
  )
});

export default function SalaSituacionalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [claveInput, setClaveInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Pestaña principal: 'camiones' o 'contribuyentes'
  const [vistaModo, setVistaModo] = useState<'contribuyentes' | 'camiones'>('contribuyentes');

  // Datos Camiones GPS
  const [gpsUnits, setGpsUnits] = useState<any[]>([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [focusedUnit, setFocusedUnit] = useState<any | null>(null);
  const [bitacoraModalUnit, setBitacoraModalUnit] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Datos Contribuyentes Aseo GPS
  const [puntosAseo, setPuntosAseo] = useState<PuntoAseo[]>([]);
  const [loadingPuntos, setLoadingPuntos] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSolvencia, setFiltroSolvencia] = useState<'TODOS' | 'SOLVENTES' | 'CON_DEUDA'>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'Comercial' | 'Residencial' | 'Condominio'>('TODOS');
  const [selectedPunto, setSelectedPunto] = useState<PuntoAseo | null>(null);

  useEffect(() => {
    const ses = sessionStorage.getItem('sala_situacional_unlocked');
    if (ses === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (claveInput.trim() === 'Omar..') {
      setIsAuthenticated(true);
      sessionStorage.setItem('sala_situacional_unlocked', 'true');
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta. Acceso denegado a la Sala Situacional.');
    }
  };

  const loadGpsUnits = async () => {
    setLoadingGps(true);
    try {
      const res = await fetch('/api/supervisor-rutas/gps');
      if (res.ok) {
        const data = await res.json();
        const units = data || [];
        setGpsUnits(units);
        setLastUpdated(new Date());

        if (focusedUnit) {
          const updated = units.find((u: any) => u.unidad === focusedUnit.unidad);
          if (updated) setFocusedUnit(updated);
        }

        if (bitacoraModalUnit) {
          const updatedBit = units.find((u: any) => u.unidad === bitacoraModalUnit.unidad);
          if (updatedBit) setBitacoraModalUnit(updatedBit);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGps(false);
    }
  };

  const loadPuntosAseo = async () => {
    setLoadingPuntos(true);
    try {
      // 1. Cargar pre-registros con GPS
      let allPreRegs: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from('pre_registros')
          .select('id, codigo, identidad, contribuyente, coordenadas, origen, tipo, actividad, direccion_exacta, domicilio_fiscal, is_condominio, cantidad_inmuebles')
          .not('coordenadas', 'is', null)
          .order('id', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !chunk || chunk.length === 0) break;
        allPreRegs = allPreRegs.concat(chunk);
        if (chunk.length < pageSize) hasMore = false;
        else page++;
      }

      // 2. Cargar facturas de aseo pendientes
      const { data: facturas } = await supabase
        .from('facturas')
        .select('identidad, monto, estado')
        .in('estado', ['Pendiente', 'Por Verificar', 'Abonado']);

      const deudaMap: Record<string, { total: number; count: number }> = {};
      (facturas || []).forEach(f => {
        const idClean = (f.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
        if (!deudaMap[idClean]) deudaMap[idClean] = { total: 0, count: 0 };
        deudaMap[idClean].total += Number(f.monto || 0);
        deudaMap[idClean].count += 1;
      });

      // 3. Cruzar puntos satelitales con deudas de Aseo
      const puntos: PuntoAseo[] = [];
      allPreRegs.forEach(r => {
        let lat: number | null = null;
        let lng: number | null = null;
        if (r.coordenadas && typeof r.coordenadas === 'object') {
          lat = Number(r.coordenadas.lat);
          lng = Number(r.coordenadas.lng);
        }

        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          const idClean = (r.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
          const infoDeuda = deudaMap[idClean] || { total: 0, count: 0 };
          const esSolvente = infoDeuda.count === 0 && infoDeuda.total === 0;

          const isCondo = r.is_condominio === true || (r.tipo && r.tipo.toUpperCase().includes('CONDO'));
          const t = (r.tipo || '').toUpperCase();
          let tipoForm: 'Condominio' | 'Comercial' | 'Residencial' = 'Residencial';
          if (isCondo) tipoForm = 'Condominio';
          else if (t.includes('COMER') || t.includes('INDUS') || t.includes('INSTITUCIONAL') || (r.contribuyente || '').toUpperCase().includes(' C.A')) {
            tipoForm = 'Comercial';
          }

          puntos.push({
            id: `aseo-${r.id}`,
            codigo: r.codigo || `PR-${r.id}`,
            identidad: r.identidad || 'Sin ID',
            contribuyente: r.contribuyente || 'Contribuyente',
            tipo: tipoForm,
            clasificacion: r.tipo || tipoForm,
            actividad: r.actividad || r.codigo,
            direccion: r.direccion_exacta || r.domicilio_fiscal,
            is_condominio: isCondo,
            cantidad_inmuebles: r.cantidad_inmuebles || 1,
            deuda_total: infoDeuda.total,
            facturas_pendientes: infoDeuda.count,
            solvente: esSolvente,
            lat,
            lng
          });
        }
      });

      setPuntosAseo(puntos);
    } catch (e) {
      console.error('Error cargando puntos de aseo:', e);
    } finally {
      setLoadingPuntos(false);
    }
  };

  // Polling automático cada 8 segundos para camiones
  useEffect(() => {
    if (!isAuthenticated) return;
    loadGpsUnits();
    loadPuntosAseo();
    const timer = setInterval(() => {
      loadGpsUnits();
    }, 8000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const toggleUnitSelection = (unidad: string) => {
    if (selectedUnits.includes(unidad)) {
      setSelectedUnits(selectedUnits.filter(u => u !== unidad));
    } else {
      setSelectedUnits([...selectedUnits, unidad]);
    }
  };

  const selectAll = () => {
    setSelectedUnits(gpsUnits.map(u => u.unidad));
    setFocusedUnit(null);
  };

  const deselectAll = () => {
    setSelectedUnits([]);
    setFocusedUnit(null);
  };

  const focusSingleUnit = (unit: any) => {
    if (focusedUnit?.unidad === unit.unidad) {
      setFocusedUnit(null);
    } else {
      setFocusedUnit(unit);
      if (!selectedUnits.includes(unit.unidad)) {
        setSelectedUnits([unit.unidad]);
      }
    }
  };

  // Estadísticas de Puntos de Aseo
  const statsAseo = useMemo(() => {
    let solventes = 0;
    let conDeuda = 0;
    let totalDeudaBs = 0;
    let com = 0;
    let res = 0;
    let cond = 0;

    puntosAseo.forEach(p => {
      if (p.solvente) solventes++;
      else {
        conDeuda++;
        totalDeudaBs += p.deuda_total;
      }
      if (p.is_condominio || p.tipo === 'Condominio') cond++;
      else if (p.tipo === 'Comercial') com++;
      else res++;
    });

    return { total: puntosAseo.length, solventes, conDeuda, totalDeudaBs, com, res, cond };
  }, [puntosAseo]);

  // Filtro de Puntos de Aseo
  const filteredPuntosAseo = useMemo(() => {
    return puntosAseo.filter(p => {
      if (filtroSolvencia === 'SOLVENTES' && !p.solvente) return false;
      if (filtroSolvencia === 'CON_DEUDA' && p.solvente) return false;

      if (filtroTipo !== 'TODOS') {
        if (filtroTipo === 'Condominio' && !p.is_condominio && p.tipo !== 'Condominio') return false;
        if (filtroTipo === 'Residencial' && (p.is_condominio || p.tipo !== 'Residencial')) return false;
        if (filtroTipo === 'Comercial' && p.tipo !== 'Comercial') return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return (
          p.contribuyente.toLowerCase().includes(q) ||
          p.identidad.toLowerCase().includes(q) ||
          (p.codigo && p.codigo.toLowerCase().includes(q)) ||
          (p.actividad && p.actividad.toLowerCase().includes(q)) ||
          (p.direccion && p.direccion.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [puntosAseo, filtroSolvencia, filtroTipo, searchTerm]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
          
          <div className="text-center space-y-2 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Sala Situacional GPS</h1>
            <p className="text-xs text-slate-400">
              Control Maestro de Flota de Aseo Urbano y Mapeo Satelital de Contribuyentes de Tucacas
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Clave de Seguridad Master
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={claveInput}
                  onChange={(e) => setClaveInput(e.target.value)}
                  placeholder="Ingrese clave de acceso..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors pr-11"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ShieldCheck size={18} /> Desbloquear Acceso
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Radio className="w-7 h-7 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  Sala Situacional GPS · Aseo Silva
                </h1>
                <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" /> En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mapeo satelital de contribuyentes, solvencias, deudas en tiempo real y rastreo de camiones compactadores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de Vista: Contribuyentes vs Camiones */}
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setVistaModo('contribuyentes')}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  vistaModo === 'contribuyentes' 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4" />
                Contribuyentes y Deudas ({statsAseo.total})
              </button>
              <button
                onClick={() => setVistaModo('camiones')}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  vistaModo === 'camiones' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4" />
                Flota de Camiones ({gpsUnits.length})
              </button>
            </div>

            <button
              onClick={() => {
                sessionStorage.removeItem('sala_situacional_unlocked');
                setIsAuthenticated(false);
              }}
              className="p-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold border border-red-800/80 transition-colors"
              title="Bloquear Sala"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODO 1: CONTRIBUYENTES, SOLVENCIA Y DEUDAS ── */}
      {vistaModo === 'contribuyentes' && (
        <div className="space-y-6">
          {/* Métricas de Aseo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div 
              onClick={() => setFiltroSolvencia('TODOS')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                filtroSolvencia === 'TODOS' ? 'bg-slate-800 border-emerald-500 shadow-lg' : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Puntos GPS</span>
              <p className="text-2xl font-black text-white mt-1 font-mono">{statsAseo.total}</p>
              <span className="text-[10px] text-slate-500">Predios censados en Tucacas</span>
            </div>

            <div 
              onClick={() => setFiltroSolvencia('SOLVENTES')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                filtroSolvencia === 'SOLVENTES' ? 'bg-slate-800 border-emerald-500 shadow-lg' : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Solventes</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{statsAseo.solventes}</p>
              <span className="text-[10px] text-emerald-500">Al día con la tasa</span>
            </div>

            <div 
              onClick={() => setFiltroSolvencia('CON_DEUDA')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                filtroSolvencia === 'CON_DEUDA' ? 'bg-slate-800 border-rose-500 shadow-lg' : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Con Deuda</span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{statsAseo.conDeuda}</p>
              <span className="text-[10px] text-rose-500">Pendientes por cobrar</span>
            </div>

            <div className="p-4 rounded-2xl border bg-slate-950 border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Deuda Pendiente Total</span>
              <p className="text-xl font-black text-rose-400 mt-1 font-mono truncate">
                Bs. {statsAseo.totalDeudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500">Cartera en calle</span>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros de Tipología */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por contribuyente, RIF, actividad o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Tipo:
              </span>
              {(['TODOS', 'Comercial', 'Residencial', 'Condominio'] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    filtroTipo === tipo
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                  }`}
                >
                  {tipo === 'TODOS' ? 'Todos los Tipos' : tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Mapa de Contribuyentes y Panel Lateral de Aseo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-950 p-2.5 rounded-3xl border border-slate-800 shadow-xl overflow-hidden min-h-[580px] h-[640px] relative">
              <AseoMapaContribuyentes
                puntos={filteredPuntosAseo}
                focusedPoint={selectedPunto}
                onSelectPunto={(p) => setSelectedPunto(p)}
              />

              {/* Leyenda flotante */}
              <div className="absolute bottom-6 left-6 z-20 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl text-[11px] space-y-1.5 hidden sm:block">
                <span className="font-bold text-slate-300 block border-b border-slate-800 pb-1">Estado de Aseo Urbano</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Solvente (Al día)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span>Con Deuda Pendiente</span>
                </div>
              </div>
            </div>

            {/* Panel Lateral: Ficha del Contribuyente en Aseo */}
            <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-xl p-5 flex flex-col h-[640px]">
              {selectedPunto ? (
                <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg ${
                        selectedPunto.solvente ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}>
                        {selectedPunto.solvente ? '✓' : '!'}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Ficha Contribuyente Aseo
                        </span>
                        <h3 className="font-black text-base text-white leading-tight">
                          {selectedPunto.contribuyente}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPunto(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Estado Financiero Aseo */}
                  <div className={`p-4 rounded-2xl border ${
                    selectedPunto.solvente 
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' 
                      : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">
                      Condición en Aseo Urbano
                    </span>
                    <p className="text-xl font-black mt-0.5">
                      {selectedPunto.solvente ? 'SOLVENTE (AL DÍA)' : 'CON DEUDA PENDIENTE'}
                    </p>
                    {!selectedPunto.solvente && (
                      <p className="text-xs font-mono font-bold mt-1">
                        Deuda: Bs. {selectedPunto.deuda_total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({selectedPunto.facturas_pendientes} facturas)
                      </p>
                    )}
                  </div>

                  {/* Datos del Inmueble y Actividad */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Cédula / RIF</span>
                      <span className="text-slate-200 font-mono font-bold text-sm">{selectedPunto.identidad}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Actividad Económica / Uso</span>
                      <span className="text-slate-200 font-semibold">{selectedPunto.actividad || selectedPunto.clasificacion}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Dirección Predial</span>
                      <span className="text-slate-300 leading-relaxed block mt-0.5">
                        📍 {selectedPunto.direccion || 'Tucacas, Municipio Silva'}
                      </span>
                    </div>
                  </div>

                  {/* Coordenadas GPS */}
                  <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Coordenadas Satelitales (WGS84)
                    </span>
                    <p className="font-mono text-xs text-emerald-400 font-bold">
                      Lat: {selectedPunto.lat.toFixed(6)}, Lng: {selectedPunto.lng.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${selectedPunto.lat},${selectedPunto.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1 mt-1 font-semibold"
                    >
                      Abrir en Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Botón Cobro Móvil si tiene deuda */}
                  {!selectedPunto.solvente && (
                    <div className="pt-2 mt-auto">
                      <a
                        href={`/cobro-movil?identidad=${encodeURIComponent(selectedPunto.identidad)}`}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                      >
                        <Smartphone className="w-4 h-4" />
                        Cobrar en Línea (Cobro Móvil)
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="border-b border-slate-800 pb-3 mb-3">
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      Contribuyentes Mapeados ({filteredPuntosAseo.length})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Selecciona un predio en el mapa o en esta lista para ver su estado de solvencia.
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredPuntosAseo.slice(0, 50).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPunto(p)}
                        className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 transition-all cursor-pointer flex items-center gap-3 text-xs"
                      >
                        <span className={`w-3 h-3 rounded-full shrink-0 ${p.solvente ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-200 truncate">{p.contribuyente}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="font-mono text-emerald-400">{p.identidad}</span>
                            <span>•</span>
                            <span className="truncate">{p.actividad || p.tipo}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono shrink-0 ${
                          p.solvente ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {p.solvente ? 'AL DÍA' : 'DEUDA'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODO 2: FLOTA DE CAMIONES Y BITÁCORA EN VIVO ── */}
      {vistaModo === 'camiones' && (
        <div className="space-y-6">
          {/* CONTROLES DE SELECCIÓN Y MULTI-SELECCIÓN */}
          {gpsUnits.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <Layers size={14} className="text-emerald-400" /> Filtrar en Pantalla:
                </span>
                <button
                  onClick={selectAll}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-semibold"
                >
                  Ver Todos ({gpsUnits.length})
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700"
                >
                  Ocultar Todos
                </button>
              </div>

              {/* Botones de Unidades */}
              <div className="flex flex-wrap items-center gap-2">
                {gpsUnits.map(u => {
                  const isChecked = selectedUnits.includes(u.unidad);
                  const isFocused = focusedUnit?.unidad === u.unidad;

                  return (
                    <div
                      key={u.unidad}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                        isFocused
                          ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-md shadow-blue-500/20'
                          : isChecked
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 font-semibold'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleUnitSelection(u.unidad)}
                        className="hover:text-white"
                        title="Activar/desactivar en mapa"
                      >
                        {isChecked ? <CheckSquare size={13} className="text-emerald-400" /> : <Square size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => focusSingleUnit(u)}
                        className="hover:underline flex items-center gap-1 truncate max-w-[140px]"
                        title="Enfocar individualmente"
                      >
                        <Crosshair size={11} className={isFocused ? 'text-white' : 'text-slate-400'} />
                        {u.unidad}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAPA INTERACTIVO DE CAMIONES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400" /> Pantalla Satelital de Alta Definición
              </h2>
              <span className="text-xs text-slate-400">
                {focusedUnit ? `Siguiendo a ${focusedUnit.unidad}` : 'Trazados y movimiento en vivo'}
              </span>
            </div>

            <SalaMapaInteractivo 
              units={gpsUnits} 
              selectedUnitNames={selectedUnits} 
              focusedUnit={focusedUnit}
              onSelectUnit={(unit) => setFocusedUnit(unit)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
