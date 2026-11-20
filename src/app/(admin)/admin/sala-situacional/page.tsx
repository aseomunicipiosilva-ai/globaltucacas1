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
  QrCode,
  Download,
  Check
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
  
  // Pestaña principal: 'contribuyentes', 'camiones' o 'bitacora'
  const [vistaModo, setVistaModo] = useState<'contribuyentes' | 'camiones' | 'bitacora'>('contribuyentes');

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
  const [filtroOperador, setFiltroOperador] = useState<string>('TODOS');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [selectedPunto, setSelectedPunto] = useState<PuntoAseo | null>(null);

  // Datos Bitácora de Escaneos QR
  const [bitacoraLogs, setBitacoraLogs] = useState<any[]>([]);
  const [loadingBitacora, setLoadingBitacora] = useState(false);
  const [selectedBitacoraOperador, setSelectedBitacoraOperador] = useState<string>('TODOS');
  const [bitacoraSearch, setBitacoraSearch] = useState('');

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

      const parsedLogsList: any[] = [];
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
            const opName = parsed.operador || log.user_id || 'OPERADOR';
            const inicial = (parsed.inicial || (parsed.operador ? parsed.operador[0] : 'O')).toUpperCase();
            const ts = parsed.timestamp || log.created_at;

            parsedLogsList.push({
              id: log.id,
              identidad: parsed.identidad,
              codigo: parsed.codigo || cleanId,
              contribuyente: parsed.contribuyente || '',
              operador: opName,
              inicial: inicial,
              timestamp: ts,
              rawLog: log
            });

            if (!qrScanMap.has(cleanId)) {
              qrScanMap.set(cleanId, {
                operador: opName,
                inicial: inicial,
                timestamp: ts
              });
            }
          }
        } catch {
          // ignore parse error
        }
      });

      setBitacoraLogs(parsedLogsList);

      // 5. Mapear y consolidar los contribuyentes de Aseo en su ubicación real
      // Se agrupan los registros con el mismo RIF/Cédula que comparten ubicación/predio para no duplicar puntos por todo el mapa
      const inmsByContribuyente = new Map<string, any[]>();
      allInmuebles.forEach((inm) => {
        const idClean = (inm.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
        if (!inmsByContribuyente.has(idClean)) {
          inmsByContribuyente.set(idClean, []);
        }
        inmsByContribuyente.get(idClean)!.push(inm);
      });

      const puntos: PuntoAseo[] = [];

      inmsByContribuyente.forEach((inmList, idClean) => {
        const mainInm = inmList[0];

        // 1. Resolver Coordenadas Reales:
        let lat: number | null = null;
        let lng: number | null = null;

        // Prioridad A: Coordenadas GPS satelitales en pre_registros (Censo / Verificación en campo)
        if (preCoordMap.has(idClean)) {
          const c = preCoordMap.get(idClean)!;
          lat = c.lat;
          lng = c.lng;
        } else {
          // Prioridad B: Deducir coordenadas a partir de la DIRECCIÓN exacta o sector del inmueble
          // Buscar texto de dirección en cualquiera de las actividades del contribuyente
          let textoDireccion = '';
          inmList.forEach(item => {
            textoDireccion += ` ${(item.direccion || '')} ${(item.sector || '')}`;
          });
          textoDireccion = textoDireccion.toUpperCase();

          let baseCoords = null;
          for (const [key, coords] of Object.entries(SECTOR_COORDS_BASE)) {
            if (textoDireccion.includes(key)) {
              baseCoords = coords;
              break;
            }
          }

          if (!baseCoords) {
            baseCoords = SECTOR_COORDS_BASE['CENTRO TUCACAS'];
          }

          // Jitter mínimo y estable para que todos los locales de este contribuyente estén exactamente en su predio
          const seed = (mainInm.id * 9301 + 49297) % 233280;
          const rnd1 = ((seed % 1000) / 1000 - 0.5) * 0.0015;
          const rnd2 = ((((seed * 7) % 1000) / 1000) - 0.5) * 0.0015;
          lat = baseCoords.lat + rnd1;
          lng = baseCoords.lng + rnd2;
        }

        // 2. Información Financiera consolidada de Aseo
        const infoDeuda = deudaMap[idClean] || { total: 0, count: 0 };
        const totalDeudaMmv = inmList.reduce((acc, curr) => acc + Number(curr.deuda_mmv || 0), 0);
        const totalTarifaMmv = inmList.reduce((acc, curr) => acc + Number(curr.mmv_mes || 0), 0);
        const esSolvente = infoDeuda.count === 0 && infoDeuda.total === 0 && totalDeudaMmv === 0;

        // 3. Tipología y Clasificación
        let esCondo = inmList.some(i => (i.clasificacion || '').toUpperCase().includes('CONDO') || (i.cant_inmuebles && i.cant_inmuebles > 1));
        let esComercial = inmList.some(i => {
          const c = (i.clasificacion || '').toUpperCase();
          const t = (i.tipo || '').toUpperCase();
          return c.includes('COMER') || t.includes('LOCAL') || t.includes('COMER') || (i.contribuyente || '').toUpperCase().includes(' C.A');
        });

        let tipoForm: 'Condominio' | 'Comercial' | 'Residencial' = 'Residencial';
        if (esCondo) tipoForm = 'Condominio';
        else if (esComercial) tipoForm = 'Comercial';

        // Actividades agrupadas si tiene múltiples
        const actividadesList = inmList
          .map(i => i.actividad_principal || i.inmueble || i.tipo)
          .filter(Boolean);
        const actividadConsolidada = actividadesList.length > 1 
          ? `${actividadesList.length} actividades: ${actividadesList.slice(0, 2).join(', ')}${actividadesList.length > 2 ? '...' : ''}`
          : (actividadesList[0] || mainInm.tipo || 'Comercial');

        const scanInfo = qrScanMap.get(idClean);

        // Detectar sector representativo
        const sectorFinal = inmList.find(i => i.sector)?.sector || mainInm.sector || 'Tucacas';
        const direccionFinal = inmList.find(i => i.direccion)?.direccion || mainInm.direccion || `${sectorFinal}, Municipio Silva`;

        puntos.push({
          id: `aseo-${mainInm.id}`,
          codigo: mainInm.cod_cont || `C-${String(mainInm.id).padStart(6, '0')}`,
          identidad: mainInm.identidad || 'Sin ID',
          contribuyente: mainInm.contribuyente || 'Contribuyente',
          tipo: tipoForm,
          clasificacion: mainInm.clasificacion || tipoForm,
          actividad: actividadConsolidada,
          direccion: direccionFinal,
          sector: sectorFinal,
          is_condominio: esCondo,
          cantidad_inmuebles: inmList.length > 1 ? inmList.length : (mainInm.cant_inmuebles || 1),
          deuda_total: infoDeuda.total,
          facturas_pendientes: infoDeuda.count,
          solvente: esSolvente,
          tarifa_mensual: totalTarifaMmv,
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

  // Mapa rápido de identidad a datos del contribuyente en Aseo
  const contribuyentesMap = useMemo(() => {
    const map = new Map<string, PuntoAseo>();
    puntosAseo.forEach(p => {
      const cleanId = String(p.identidad).replace(/[-.\s]/g, '').toUpperCase();
      map.set(cleanId, p);
    });
    return map;
  }, [puntosAseo]);

  // Registros filtrados de la Bitácora
  const filteredBitacora = useMemo(() => {
    return bitacoraLogs.filter(log => {
      if (selectedBitacoraOperador !== 'TODOS') {
        const letra = (log.inicial || (log.operador ? log.operador[0] : '')).toUpperCase();
        if (letra !== selectedBitacoraOperador.toUpperCase()) return false;
      }

      if (fechaDesde) {
        const dDesde = new Date(`${fechaDesde}T00:00:00`);
        const dLog = new Date(log.timestamp);
        if (dLog < dDesde) return false;
      }

      if (fechaHasta) {
        const dHasta = new Date(`${fechaHasta}T23:59:59`);
        const dLog = new Date(log.timestamp);
        if (dLog > dHasta) return false;
      }

      if (bitacoraSearch.trim()) {
        const q = bitacoraSearch.toLowerCase().trim();
        const c = contribuyentesMap.get(String(log.identidad).replace(/[-.\s]/g, '').toUpperCase());
        const contribName = c?.contribuyente || log.contribuyente || '';
        const direccion = c?.direccion || '';
        const sector = c?.sector || '';
        return (
          contribName.toLowerCase().includes(q) ||
          String(log.identidad).toLowerCase().includes(q) ||
          String(log.codigo).toLowerCase().includes(q) ||
          direccion.toLowerCase().includes(q) ||
          sector.toLowerCase().includes(q) ||
          String(log.operador).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bitacoraLogs, selectedBitacoraOperador, fechaDesde, fechaHasta, bitacoraSearch, contribuyentesMap]);

  // Lista de operadores únicos detectados en los escaneos
  const operadoresDisponibles = useMemo(() => {
    const setOps = new Map<string, string>();
    puntosAseo.forEach(p => {
      if (p.escaneado) {
        const letra = (p.inicial_operador || (p.operador ? p.operador[0] : 'O')).toUpperCase();
        const nombre = p.operador || `Operador ${letra}`;
        setOps.set(letra, nombre);
      }
    });
    return Array.from(setOps.entries()).map(([letra, nombre]) => ({ letra, nombre }));
  }, [puntosAseo]);

  // Filtro de Puntos de Aseo
  const filteredPuntosAseo = useMemo(() => {
    return puntosAseo.filter(p => {
      if (filtroSolvencia === 'SOLVENTES' && !p.solvente) return false;
      if (filtroSolvencia === 'CON_DEUDA' && p.solvente) return false;
      if (filtroSolvencia === 'ESCANEADOS' && !p.escaneado) return false;

      // Filtro específico por operador / inicial
      if (filtroOperador !== 'TODOS') {
        if (!p.escaneado) return false;
        const inicial = (p.inicial_operador || (p.operador ? p.operador[0] : '')).toUpperCase();
        if (inicial !== filtroOperador.toUpperCase()) return false;
      }

      // Filtro por rango de fechas de escaneo QR
      if (fechaDesde || fechaHasta) {
        if (!p.escaneado || !p.escaneado_at) return false;
        const fechaScan = new Date(p.escaneado_at);
        if (isNaN(fechaScan.getTime())) return false;

        if (fechaDesde) {
          const dDesde = new Date(`${fechaDesde}T00:00:00`);
          if (fechaScan < dDesde) return false;
        }
        if (fechaHasta) {
          const dHasta = new Date(`${fechaHasta}T23:59:59`);
          if (fechaScan > dHasta) return false;
        }
      }

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
  }, [puntosAseo, filtroSolvencia, filtroTipo, filtroOperador, searchTerm]);

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
            {/* Selector de Vista: Contribuyentes vs Camiones vs Bitácora de Operadores */}
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
                onClick={() => setVistaModo('bitacora')}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  vistaModo === 'bitacora' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Bitácora de Operadores ({bitacoraLogs.length})
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
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

            {/* Barra de Filtro Rápido por Operador QR y Rango de Fechas */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <QrCode className="w-3.5 h-3.5 text-purple-600" /> Operador:
                  </span>
                  <button
                    onClick={() => {
                      setFiltroSolvencia('TODOS');
                      setFiltroOperador('TODOS');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      filtroSolvencia !== 'ESCANEADOS' && filtroOperador === 'TODOS'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Todos los puntos
                  </button>
                  <button
                    onClick={() => {
                      setFiltroSolvencia('ESCANEADOS');
                      setFiltroOperador('TODOS');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      filtroSolvencia === 'ESCANEADOS' && filtroOperador === 'TODOS'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    Todos los Escaneados ({statsAseo.escaneados})
                  </button>

                  {operadoresDisponibles.map(op => {
                    const isSelected = filtroSolvencia === 'ESCANEADOS' && filtroOperador === op.letra;
                    return (
                      <button
                        key={op.letra}
                        onClick={() => {
                          setFiltroSolvencia('ESCANEADOS');
                          setFiltroOperador(op.letra);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-700 text-white shadow-md ring-2 ring-purple-400'
                            : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-black flex items-center justify-center">
                          {op.letra}
                        </span>
                        <span>Operador {op.letra}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Filtro por Periodo de Fecha de Escaneo */}
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Periodo Escaneo:</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => {
                      setFechaDesde(e.target.value);
                      if (e.target.value) setFiltroSolvencia('ESCANEADOS');
                    }}
                    className="bg-white border border-slate-300 text-slate-800 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-purple-500"
                    title="Fecha Desde"
                  />
                  <span className="text-slate-400 font-bold">a</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => {
                      setFechaHasta(e.target.value);
                      if (e.target.value) setFiltroSolvencia('ESCANEADOS');
                    }}
                    className="bg-white border border-slate-300 text-slate-800 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-purple-500"
                    title="Fecha Hasta"
                  />
                  {(fechaDesde || fechaHasta) && (
                    <button
                      onClick={() => {
                        setFechaDesde('');
                        setFechaHasta('');
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Limpiar rango de fechas"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
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
                        {selectedPunto.escaneado_at && (
                          <p className="text-[10px] text-purple-600 font-medium mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 inline-block" /> 
                            {new Date(selectedPunto.escaneado_at).toLocaleString('es-VE', { 
                              day: '2-digit', month: '2-digit', year: 'numeric', 
                              hour: '2-digit', minute: '2-digit', hour12: true 
                            })}
                          </p>
                        )}
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

      {/* ── MODO 3: BITÁCORA DETALLADA DE ESCANEOS POR OPERADOR ── */}
      {vistaModo === 'bitacora' && (
        <div className="space-y-6">
          {/* Tarjetas resumen de bitácora */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Escaneos Registrados</span>
              <p className="text-2xl font-black text-purple-600 mt-1 font-mono">{bitacoraLogs.length}</p>
              <span className="text-[10px] text-slate-500">Histórico de fiscalización en campo</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Operadores Activos</span>
              <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{operadoresDisponibles.length}</p>
              <span className="text-[10px] text-slate-500">Fiscales con actividad QR</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Predios Filtrados</span>
              <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{filteredBitacora.length}</p>
              <span className="text-[10px] text-slate-500">Según operador y fechas</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Operador Seleccionado</span>
              <p className="text-lg font-black text-slate-900 mt-1 truncate">
                {selectedBitacoraOperador === 'TODOS' ? 'Todos los Operadores' : `Operador ${selectedBitacoraOperador}`}
              </p>
              <span className="text-[10px] text-purple-600 font-semibold">
                {selectedBitacoraOperador === 'TODOS' ? 'Auditoría completa' : 'Vista individualizada'}
              </span>
            </div>
          </div>

          {/* Filtros de la Bitácora */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Buscador de bitácora */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar contribuyente, RIF, dirección, sector..."
                  value={bitacoraSearch}
                  onChange={(e) => setBitacoraSearch(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 focus:bg-white"
                />
                {bitacoraSearch && (
                  <button onClick={() => setBitacoraSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Rango de fechas */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs w-full md:w-auto">
                <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-[10px] font-bold uppercase text-slate-600">Periodo:</span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
                  title="Fecha Desde"
                />
                <span className="text-slate-400 font-bold">a</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
                  title="Fecha Hasta"
                />
                {(fechaDesde || fechaHasta) && (
                  <button
                    onClick={() => {
                      setFechaDesde('');
                      setFechaHasta('');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Limpiar fechas"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Selector de operadores en pestañas */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <User className="w-3.5 h-3.5 text-purple-600" /> Operador:
              </span>
              <button
                onClick={() => setSelectedBitacoraOperador('TODOS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedBitacoraOperador === 'TODOS'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Todos los Operadores ({bitacoraLogs.length})
              </button>

              {operadoresDisponibles.map(op => {
                const countOp = bitacoraLogs.filter(b => (b.inicial || b.operador?.[0]) === op.letra).length;
                const isSelected = selectedBitacoraOperador === op.letra;
                return (
                  <button
                    key={op.letra}
                    onClick={() => setSelectedBitacoraOperador(op.letra)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-purple-700 text-white shadow-md ring-2 ring-purple-400'
                        : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">
                      {op.letra}
                    </span>
                    <span>Operador {op.letra}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {countOp}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabla de la Bitácora */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2 uppercase tracking-wide">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  Registro Cronológico de Escaneos QR ({filteredBitacora.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detalle cronológico de visitas, hora exacta y estado fiscal verificado por cada fiscalizador
                </p>
              </div>

              {/* Botón para ver en el mapa satelital */}
              <button
                onClick={() => {
                  setFiltroSolvencia('ESCANEADOS');
                  if (selectedBitacoraOperador !== 'TODOS') {
                    setFiltroOperador(selectedBitacoraOperador);
                  }
                  setVistaModo('contribuyentes');
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Compass className="w-4 h-4" />
                Ver estos puntos en el Mapa
              </button>
            </div>

            {filteredBitacora.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-600">No se encontraron escaneos con los filtros actuales</p>
                <p className="text-xs text-slate-400 mt-1">Prueba seleccionando otro operador o ampliando el rango de fechas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Operador</th>
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">Contribuyente</th>
                      <th className="py-3 px-4">Cédula / RIF</th>
                      <th className="py-3 px-4">Sector / Dirección</th>
                      <th className="py-3 px-4">Estado en Aseo</th>
                      <th className="py-3 px-4">Deuda Actual</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBitacora.map((item) => {
                      const cleanId = String(item.identidad).replace(/[-.\s]/g, '').toUpperCase();
                      const contribData = contribuyentesMap.get(cleanId);
                      const fechaObj = new Date(item.timestamp);
                      const fechaStr = isNaN(fechaObj.getTime())
                        ? item.timestamp
                        : fechaObj.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      const horaStr = isNaN(fechaObj.getTime())
                        ? ''
                        : fechaObj.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });

                      const esSolvente = contribData ? contribData.solvente : false;
                      const deudaBs = contribData ? contribData.deuda_total : 0;

                      return (
                        <tr key={item.id} className="hover:bg-purple-50/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                                {item.inicial || 'O'}
                              </div>
                              <span className="font-bold text-slate-900">{item.operador}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{fechaStr}</span>
                              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-purple-600 inline-block" /> {horaStr}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="max-w-[220px]">
                              <p className="font-bold text-slate-900 truncate">
                                {contribData?.contribuyente || item.contribuyente || 'Contribuyente'}
                              </p>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {item.codigo || contribData?.codigo}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-emerald-700">
                            {item.identidad}
                          </td>

                          <td className="py-3 px-4">
                            <div className="max-w-[200px]">
                              <span className="font-semibold text-slate-800 block truncate">
                                {contribData?.sector || 'Tucacas'}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {contribData?.direccion || 'Municipio Silva'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {contribData ? (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                esSolvente 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {esSolvente ? 'SOLVENTE' : 'CON DEUDA'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Censo / Externo</span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                            {deudaBs > 0 ? (
                              <span className="text-rose-600">
                                Bs. {deudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-emerald-600">Bs. 0,00</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                if (contribData) {
                                  setSelectedPunto(contribData);
                                }
                                setFiltroSolvencia('ESCANEADOS');
                                setVistaModo('contribuyentes');
                              }}
                              className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-lg border border-purple-200 transition-all inline-flex items-center gap-1"
                              title="Localizar en el mapa satelital"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              Ubicar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
