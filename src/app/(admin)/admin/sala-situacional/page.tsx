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
  Filter,
  QrCode
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PuntoAseo } from '@/components/AseoMapaContribuyentes';

const SalaMapaInteractivo = dynamic(() => import('@/components/SalaMapaInteractivo'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mr-2" /> Cargando mapa satelital de camiones...
    </div>
  )
});

const AseoMapaContribuyentes = dynamic(() => import('@/components/AseoMapaContribuyentes'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mr-2" /> Cargando mapa satelital de contribuyentes...
    </div>
  )
});

// Coordenadas base por sector para ubicar el padrón completo de Aseo
const SECTOR_COORDS_BASE: Record<string, { lat: number; lng: number }> = {
  'CENTRO TUCACAS': { lat: 10.7858, lng: -68.3227 },
  'CENTRO': { lat: 10.7858, lng: -68.3227 },
  'BOMBA H': { lat: 10.7820, lng: -68.3250 },
  'GOLFO TRISTE': { lat: 10.7890, lng: -68.3180 },
  'SECTOR MORROCOY': { lat: 10.8165, lng: -68.3070 },
  'MORROCOY': { lat: 10.8165, lng: -68.3070 },
  'SECTOR LAS LAPAS': { lat: 10.7861, lng: -68.3436 },
  'VIA LAS LAPAS': { lat: 10.7861, lng: -68.3436 },
  'LAPAS': { lat: 10.7861, lng: -68.3436 },
  'CENTRO BOCA DE AROA': { lat: 10.6780, lng: -68.2975 },
  'BOCA DE AROA': { lat: 10.6780, lng: -68.2975 },
  'SECTOR SANARE': { lat: 10.8688, lng: -68.3782 },
  'SANARE': { lat: 10.8688, lng: -68.3782 },
  'SECTOR LAS DELICIAS': { lat: 10.6428, lng: -68.2833 },
  'DELICIAS': { lat: 10.6428, lng: -68.2833 },
  'ARAGUITA': { lat: 10.7930, lng: -68.3280 },
  'KILOMETRO 60': { lat: 10.7420, lng: -68.3050 },
  'AVENIDA SILVA': { lat: 10.7890, lng: -68.3210 },
  'PROLONGACION AV SILVA': { lat: 10.7910, lng: -68.3220 },
  'BARRIO VERDE': { lat: 10.7870, lng: -68.3300 },
  'BRISAS DEL MAR': { lat: 10.7840, lng: -68.3160 },
  'BARRIO LIBERTADOR': { lat: 10.7860, lng: -68.3270 },
  'CORALES': { lat: 10.7950, lng: -68.3120 },
  'SECTOR LOS CORALES': { lat: 10.7950, lng: -68.3120 },
  'RAMADITA': { lat: 10.7810, lng: -68.3320 },
  'CENTUCA': { lat: 10.7845, lng: -68.3235 },
  'EL CALVARIO': { lat: 10.7885, lng: -68.3265 }
};

export default function SalaSituacionalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [claveInput, setClaveInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Pestaña principal: 'contribuyentes' o 'camiones'
  const [vistaModo, setVistaModo] = useState<'contribuyentes' | 'camiones'>('contribuyentes');

  // Datos Camiones GPS
  const [gpsUnits, setGpsUnits] = useState<any[]>([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [focusedUnit, setFocusedUnit] = useState<any | null>(null);
  const [bitacoraModalUnit, setBitacoraModalUnit] = useState<any | null>(null);

  // Datos Contribuyentes Aseo GPS
  const [puntosAseo, setPuntosAseo] = useState<PuntoAseo[]>([]);
  const [loadingPuntos, setLoadingPuntos] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSolvencia, setFiltroSolvencia] = useState<'TODOS' | 'SOLVENTES' | 'CON_DEUDA' | 'ESCANEADOS'>('TODOS');
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
      // 1. Cargar el padrón de contribuyentes de Aseo Urbano (tabla `inmuebles`)
      let allInmuebles: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from('inmuebles')
          .select('id, cod_cont, identidad, contribuyente, inmueble, direccion, patente, telefono, sector, clasificacion, tipo, actividad_principal, cant_inmuebles, mmv_mes, deuda_mmv, saldo_favor_bs, estado')
          .order('id', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !chunk || chunk.length === 0) break;
        allInmuebles = allInmuebles.concat(chunk);
        if (chunk.length < pageSize) hasMore = false;
        else page++;
      }

      // 2. Cargar pre_registros para obtener coordenadas satelitales exactas
      let allPreRegs: any[] = [];
      page = 0;
      hasMore = true;
      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from('pre_registros')
          .select('id, codigo, identidad, coordenadas')
          .not('coordenadas', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !chunk || chunk.length === 0) break;
        allPreRegs = allPreRegs.concat(chunk);
        if (chunk.length < pageSize) hasMore = false;
        else page++;
      }

      const preCoordMap = new Map<string, { lat: number; lng: number }>();
      allPreRegs.forEach(p => {
        const cleanId = (p.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
        if (p.coordenadas && typeof p.coordenadas === 'object' && p.coordenadas.lat && p.coordenadas.lng) {
          preCoordMap.set(cleanId, {
            lat: Number(p.coordenadas.lat),
            lng: Number(p.coordenadas.lng)
          });
        }
      });

      // 3. Cargar facturas de Aseo Urbano pendientes
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

      // 4. Cargar auditoría de escaneos QR (`audit_logs` con `action = 'QR_ESCANEADO'`)
      const { data: qrLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'QR_ESCANEADO')
        .order('created_at', { ascending: false });

      const qrScanMap = new Map<string, { operador: string; inicial: string; timestamp: string }>();
      (qrLogs || []).forEach(log => {
        try {
          let parsed: any = null;
          if (typeof log.details === 'string') {
            parsed = JSON.parse(log.details);
          } else if (typeof log.details === 'object' && log.details !== null) {
            parsed = log.details;
          }
          if (parsed && parsed.identidad) {
            const cleanId = String(parsed.identidad).replace(/[-.\s]/g, '').toUpperCase();
            if (!qrScanMap.has(cleanId)) {
              qrScanMap.set(cleanId, {
                operador: parsed.operador || log.user_id || 'OPERADOR',
                inicial: (parsed.inicial || (parsed.operador ? parsed.operador[0] : 'O')).toUpperCase(),
                timestamp: parsed.timestamp || log.created_at
              });
            }
          }
        } catch {
          // ignore parse error
        }
      });

      // 5. Mapear los contribuyentes de Aseo (los 764 registros del padrón de Aseo)
      const puntos: PuntoAseo[] = [];
      allInmuebles.forEach((inm, index) => {
        const idClean = (inm.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
        
        // Coordenadas: si tiene en pre_registros usar la exacta, de lo contrario usar centro del sector con jitter
        let lat: number | null = null;
        let lng: number | null = null;

        if (preCoordMap.has(idClean)) {
          const c = preCoordMap.get(idClean)!;
          lat = c.lat;
          lng = c.lng;
        } else {
          const sec = (inm.sector || '').toUpperCase().trim();
          let base = SECTOR_COORDS_BASE[sec];
          if (!base) {
            for (const key of Object.keys(SECTOR_COORDS_BASE)) {
              if (sec.includes(key)) {
                base = SECTOR_COORDS_BASE[key];
                break;
              }
            }
          }
          if (!base) base = SECTOR_COORDS_BASE['CENTRO TUCACAS'];

          // Jitter determinista suave basado en id para esparcir los puntos dentro de su sector
          const seed = (inm.id * 9301 + 49297) % 233280;
          const rnd1 = ((seed % 1000) / 1000 - 0.5) * 0.008;
          const rnd2 = ((((seed * 7) % 1000) / 1000) - 0.5) * 0.008;
          lat = base.lat + rnd1;
          lng = base.lng + rnd2;
        }

        const infoDeuda = deudaMap[idClean] || { total: 0, count: 0 };
        // También considerar deuda_mmv registrada en el inmueble
        const deudaMmv = Number(inm.deuda_mmv || 0);
        const esSolvente = infoDeuda.count === 0 && infoDeuda.total === 0 && deudaMmv === 0;

        const clasif = (inm.clasificacion || '').toUpperCase();
        const tipoInm = (inm.tipo || '').toUpperCase();
        const isCondo = clasif.includes('CONDO') || (inm.cant_inmuebles && inm.cant_inmuebles > 1);
        
        let tipoForm: 'Condominio' | 'Comercial' | 'Residencial' = 'Residencial';
        if (isCondo) tipoForm = 'Condominio';
        else if (clasif.includes('COMER') || tipoInm.includes('LOCAL') || tipoInm.includes('COMER') || (inm.contribuyente || '').toUpperCase().includes(' C.A')) {
          tipoForm = 'Comercial';
        }

        const scanInfo = qrScanMap.get(idClean);

        puntos.push({
          id: `aseo-${inm.id}`,
          codigo: inm.cod_cont || `C-${String(inm.id).padStart(6, '0')}`,
          identidad: inm.identidad || 'Sin ID',
          contribuyente: inm.contribuyente || 'Contribuyente',
          tipo: tipoForm,
          clasificacion: inm.clasificacion || tipoForm,
          actividad: inm.actividad_principal || inm.inmueble || inm.tipo,
          direccion: inm.direccion || `${inm.sector || 'Tucacas'}, Municipio Silva`,
          sector: inm.sector || 'Tucacas',
          is_condominio: isCondo,
          cantidad_inmuebles: inm.cant_inmuebles || 1,
          deuda_total: infoDeuda.total,
          facturas_pendientes: infoDeuda.count,
          solvente: esSolvente,
          tarifa_mensual: Number(inm.mmv_mes || 0),
          lat,
          lng,
          // Datos de escaneo QR
          escaneado: !!scanInfo,
          operador: scanInfo?.operador,
          inicial_operador: scanInfo?.inicial,
          escaneado_at: scanInfo?.timestamp
        });
      });

      setPuntosAseo(puntos);
    } catch (e) {
      console.error('Error cargando puntos de aseo:', e);
    } finally {
      setLoadingPuntos(false);
    }
  };

  // Polling automático cada 8 segundos
  useEffect(() => {
    if (!isAuthenticated) return;
    loadGpsUnits();
    loadPuntosAseo();
    const timer = setInterval(() => {
      loadGpsUnits();
      loadPuntosAseo();
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
    let escaneados = 0;
    let totalDeudaBs = 0;
    let com = 0;
    let res = 0;
    let cond = 0;

    puntosAseo.forEach(p => {
      if (p.escaneado) escaneados++;
      if (p.solvente) solventes++;
      else {
        conDeuda++;
        totalDeudaBs += p.deuda_total;
      }
      if (p.is_condominio || p.tipo === 'Condominio') cond++;
      else if (p.tipo === 'Comercial') com++;
      else res++;
    });

    return { total: puntosAseo.length, solventes, conDeuda, escaneados, totalDeudaBs, com, res, cond };
  }, [puntosAseo]);

  // Filtro de Puntos de Aseo
  const filteredPuntosAseo = useMemo(() => {
    return puntosAseo.filter(p => {
      if (filtroSolvencia === 'SOLVENTES' && !p.solvente) return false;
      if (filtroSolvencia === 'CON_DEUDA' && p.solvente) return false;
      if (filtroSolvencia === 'ESCANEADOS' && !p.escaneado) return false;

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
          (p.direccion && p.direccion.toLowerCase().includes(q)) ||
          (p.sector && p.sector.toLowerCase().includes(q)) ||
          (p.operador && p.operador.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [puntosAseo, filtroSolvencia, filtroTipo, searchTerm]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
          
          <div className="text-center space-y-2 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Sala Situacional GPS</h1>
            <p className="text-xs text-slate-500">
              Control Maestro de Flota de Aseo Urbano y Mapeo Satelital de Contribuyentes de Tucacas
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Clave de Seguridad Master
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={claveInput}
                  onChange={(e) => setClaveInput(e.target.value)}
                  placeholder="Ingrese clave de acceso..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors pr-11"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ShieldCheck size={18} /> Desbloquear Acceso
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 text-slate-900">
      {/* Top Banner en Fondo Blanco */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Radio className="w-7 h-7 text-emerald-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Sala Situacional GPS · Aseo Silva
                </h1>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Padrón exclusivo de Aseo Urbano (764 contribuyentes), deudas, rastreo de camiones y fiscalización por QR en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de Vista: Contribuyentes vs Camiones */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
              <button
                onClick={() => setVistaModo('contribuyentes')}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  vistaModo === 'contribuyentes' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-4 h-4" />
                Contribuyentes y Deudas ({statsAseo.total})
              </button>
              <button
                onClick={() => setVistaModo('camiones')}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  vistaModo === 'camiones' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
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
              className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 transition-colors"
              title="Bloquear Sala"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODO 1: CONTRIBUYENTES, SOLVENCIA Y DEUDAS DE ASEO ── */}
      {vistaModo === 'contribuyentes' && (
        <div className="space-y-6">
          {/* Métricas de Aseo */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div 
              onClick={() => setFiltroSolvencia('TODOS')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                filtroSolvencia === 'TODOS' ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Padrón Aseo Total</span>
              <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{statsAseo.total}</p>
              <span className="text-[10px] text-slate-500">Inmuebles registrados en Aseo</span>
            </div>

            <div 
              onClick={() => setFiltroSolvencia('SOLVENTES')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                filtroSolvencia === 'SOLVENTES' ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Solventes</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{statsAseo.solventes}</p>
              <span className="text-[10px] text-emerald-600">Al día con la tasa</span>
            </div>

            <div 
              onClick={() => setFiltroSolvencia('CON_DEUDA')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                filtroSolvencia === 'CON_DEUDA' ? 'bg-rose-50/50 border-rose-500 shadow-md ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Con Deuda</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{statsAseo.conDeuda}</p>
              <span className="text-[10px] text-rose-600">Pendientes por cobrar</span>
            </div>

            <div 
              onClick={() => setFiltroSolvencia('ESCANEADOS')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                filtroSolvencia === 'ESCANEADOS' ? 'bg-purple-50 border-purple-500 shadow-md ring-2 ring-purple-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Escaneados QR</span>
                <QrCode className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-purple-600 mt-1 font-mono">{statsAseo.escaneados}</p>
              <span className="text-[10px] text-purple-600 font-semibold">Puntos Morados con Operador</span>
            </div>

            <div className="p-4 rounded-2xl border bg-white border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Deuda Pendiente Aseo</span>
              <p className="text-xl font-black text-rose-600 mt-1 font-mono truncate">
                Bs. {statsAseo.totalDeudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500">Cartera total en calle</span>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros de Tipología en Fondo Blanco */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por contribuyente, RIF, sector u operador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-500" /> Tipo:
              </span>
              {(['TODOS', 'Comercial', 'Residencial', 'Condominio'] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    filtroTipo === tipo
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {tipo === 'TODOS' ? 'Todos los Tipos' : tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Mapa de Contribuyentes y Panel Lateral en Fondo Claro */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-2.5 rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[580px] h-[640px] relative">
              <AseoMapaContribuyentes
                puntos={filteredPuntosAseo}
                focusedPoint={selectedPunto}
                onSelectPunto={(p) => setSelectedPunto(p)}
              />

              {/* Leyenda flotante clara */}
              <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-2xl shadow-xl text-[11px] space-y-1.5 hidden sm:block">
                <span className="font-bold text-slate-800 block border-b border-slate-200 pb-1">Leyenda de Estados Aseo</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shadow-sm">
                    O
                  </div>
                  <span className="font-semibold text-purple-900">Escaneado QR (Letra Operador)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white shadow-sm" />
                  <span className="text-slate-700">Solvente (Al día)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-white shadow-sm" />
                  <span className="text-slate-700">Con Deuda Pendiente</span>
                </div>
              </div>
            </div>

            {/* Panel Lateral: Ficha del Contribuyente en Aseo */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col h-[640px]">
              {selectedPunto ? (
                <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-sm ${
                        selectedPunto.escaneado 
                          ? 'bg-purple-600' 
                          : selectedPunto.solvente ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}>
                        {selectedPunto.escaneado 
                          ? (selectedPunto.inicial_operador || 'O') 
                          : (selectedPunto.solvente ? '✓' : '!')}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                          Contribuyente de Aseo Urbano
                        </span>
                        <h3 className="font-black text-base text-slate-900 leading-tight">
                          {selectedPunto.contribuyente}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPunto(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Alerta de Escaneo QR si fue auditado */}
                  {selectedPunto.escaneado && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-xs flex items-center gap-2.5 shadow-sm">
                      <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {selectedPunto.inicial_operador || 'O'}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold block text-[11px] uppercase tracking-wider text-purple-700">
                          Escaneado en Campo por Fiscal / Operador
                        </span>
                        <p className="text-xs font-semibold truncate">
                          Operador: <span className="font-black">{selectedPunto.operador || 'Fiscal de Campo'}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Estado Financiero Aseo */}
                  <div className={`p-4 rounded-2xl border ${
                    selectedPunto.solvente 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">
                      Condición en Aseo Urbano
                    </span>
                    <p className="text-xl font-black mt-0.5">
                      {selectedPunto.solvente ? 'SOLVENTE (AL DÍA)' : 'CON DEUDA PENDIENTE'}
                    </p>
                    {!selectedPunto.solvente && (
                      <p className="text-xs font-mono font-bold mt-1 text-rose-700">
                        Deuda: Bs. {selectedPunto.deuda_total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({selectedPunto.facturas_pendientes} facturas)
                      </p>
                    )}
                    {selectedPunto.tarifa_mensual && selectedPunto.tarifa_mensual > 0 && (
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Tarifa asignada: {selectedPunto.tarifa_mensual} MMV/mes
                      </p>
                    )}
                  </div>

                  {/* Datos del Inmueble y Actividad */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold uppercase text-[10px] block">Cédula / RIF</span>
                      <span className="text-slate-900 font-mono font-bold text-sm">{selectedPunto.identidad}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase text-[10px] block">Código Padrón</span>
                      <span className="text-emerald-700 font-mono font-bold">{selectedPunto.codigo}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase text-[10px] block">Sector</span>
                      <span className="text-slate-800 font-semibold">{selectedPunto.sector || 'Tucacas'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase text-[10px] block">Actividad / Clasificación</span>
                      <span className="text-slate-800 font-semibold">{selectedPunto.actividad || selectedPunto.clasificacion}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase text-[10px] block">Dirección</span>
                      <span className="text-slate-700 leading-relaxed block mt-0.5">
                        📍 {selectedPunto.direccion || 'Tucacas, Municipio Silva'}
                      </span>
                    </div>
                  </div>

                  {/* Coordenadas GPS */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" /> Coordenadas Satelitales (WGS84)
                    </span>
                    <p className="font-mono text-xs text-emerald-700 font-bold">
                      Lat: {selectedPunto.lat.toFixed(6)}, Lng: {selectedPunto.lng.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${selectedPunto.lat},${selectedPunto.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 underline inline-flex items-center gap-1 mt-1 font-semibold"
                    >
                      Abrir en Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Botón Cobro Móvil si tiene deuda */}
                  {!selectedPunto.solvente && (
                    <div className="pt-2 mt-auto">
                      <a
                        href={`/cobro-movil?identidad=${encodeURIComponent(selectedPunto.identidad)}`}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                      >
                        <Smartphone className="w-4 h-4" />
                        Cobrar en Línea (Cobro Móvil)
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="border-b border-slate-100 pb-3 mb-3">
                    <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      Padrón Mapeado de Aseo ({filteredPuntosAseo.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Selecciona un contribuyente en el mapa o en esta lista para ver su estado de solvencia y facturas.
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredPuntosAseo.slice(0, 50).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPunto(p)}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer flex items-center gap-3 text-xs"
                      >
                        {p.escaneado ? (
                          <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {p.inicial_operador || 'O'}
                          </div>
                        ) : (
                          <span className={`w-3 h-3 rounded-full shrink-0 ${p.solvente ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 truncate">{p.contribuyente}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-mono text-emerald-700 font-semibold">{p.identidad}</span>
                            <span>•</span>
                            <span className="truncate">{p.sector || p.tipo}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono shrink-0 ${
                          p.escaneado 
                            ? 'bg-purple-100 text-purple-700' 
                            : p.solvente ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {p.escaneado ? 'QR SCAN' : (p.solvente ? 'AL DÍA' : 'DEUDA')}
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
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                  <Layers size={14} className="text-emerald-600" /> Filtrar en Pantalla:
                </span>
                <button
                  onClick={selectAll}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-300 font-semibold"
                >
                  Ver Todos ({gpsUnits.length})
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-300"
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
                          ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-md shadow-blue-500/20'
                          : isChecked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleUnitSelection(u.unidad)}
                        className="hover:text-slate-900"
                        title="Activar/desactivar en mapa"
                      >
                        {isChecked ? <CheckSquare size={13} className="text-emerald-600" /> : <Square size={13} />}
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
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-600" /> Pantalla Satelital de Alta Definición
              </h2>
              <span className="text-xs text-slate-500">
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
