'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  X, 
  User, 
  Calendar, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  FileText,
  Eye,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import * as xlsx from 'xlsx';
import { generarReporteAuditoriaPDF } from '@/lib/pdfAuditoriaReport';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type NivelAlerta = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

const CATEGORIAS = ['TODAS', 'CENSO', 'SESION', 'COBRO', 'TRANSFERENCIA', 'TASA', 'CONTRIBUYENTE', 'RECIBO', 'REPORTE', 'CONFIGURACION', 'CONVENIO', 'SISTEMA'];

const CAT_COLORS: Record<string, string> = {
  SESION:        'bg-blue-100 text-blue-800',
  COBRO:         'bg-emerald-100 text-emerald-800',
  TRANSFERENCIA: 'bg-purple-100 text-purple-800',
  TASA:          'bg-amber-100 text-amber-800',
  CENSO:         'bg-teal-100 text-teal-800',
  CONTRIBUYENTE: 'bg-sky-100 text-sky-800',
  RECIBO:        'bg-orange-100 text-orange-800',
  REPORTE:       'bg-slate-100 text-slate-700',
  CONFIGURACION: 'bg-red-100 text-red-800',
  CONVENIO:      'bg-indigo-100 text-indigo-800',
  SISTEMA:       'bg-gray-100 text-gray-700',
};

const ALERTA_BADGES: Record<NivelAlerta, { bg: string; text: string; border: string; label: string; icon: any }> = {
  CRITICA: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600', label: 'CRÍTICA', icon: AlertTriangle },
  ALTA:    { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', label: 'ALTA', icon: AlertCircle },
  MEDIA:   { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', label: 'MEDIA', icon: Info },
  BAJA:    { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'BAJA', icon: CheckCircle2 },
};

const parseDetalles = (raw: any): any => {
  if (!raw) return {};
  if (typeof raw === 'string') { 
    try { return JSON.parse(raw); } catch(e){ return { texto: raw }; } 
  }
  return raw;
};

const getCategoria = (log: any): string => {
  const det = parseDetalles(log.detalles);
  return det._categoria || log.categoria || 'SISTEMA';
};

const getModulo = (log: any): string => {
  const det = parseDetalles(log.detalles);
  return det._modulo || log.modulo || '';
};

/**
 * Motor de Detección de Severidad / Nivel de Alerta
 */
export const calcularNivelAlerta = (log: any): NivelAlerta => {
  const accion = (log.accion || '').toUpperCase();
  const det = parseDetalles(log.detalles);
  const detStr = JSON.stringify(det).toUpperCase();
  const cat = getCategoria(log).toUpperCase();

  // 1. CRÍTICA: Acciones destructivas o cambios financieros estructurales
  if (
    accion.includes('ELIMIN') || 
    accion.includes('DELETE') || 
    accion.includes('ANULAR') || 
    accion.includes('REVERS') || 
    accion.includes('DESACTIVAR') ||
    accion.includes('TASA') || 
    accion.includes('MODIFICADA') ||
    detStr.includes('ERROR') ||
    detStr.includes('FALLIDO') ||
    accion.includes('FALLIDO')
  ) {
    return 'CRITICA';
  }

  // 2. ALTA: Movimientos de dinero, aprobación/rechazo, creación de convenios
  if (
    cat === 'COBRO' || 
    cat === 'CONVENIO' || 
    accion.includes('COBRO') ||
    accion.includes('CONVENIO') ||
    accion.includes('APROBAR') ||
    accion.includes('RECHAZAR') ||
    accion.includes('CONCILI') ||
    accion.includes('AJUST') ||
    detStr.includes('MONTO_BS')
  ) {
    return 'ALTA';
  }

  // 3. MEDIA: Modificaciones de datos prediales, contribuyentes o censo
  if (
    cat === 'CENSO' || 
    cat === 'CONTRIBUYENTE' || 
    accion.includes('ACTUALIZAR') || 
    accion.includes('MODIF') ||
    accion.includes('NUEVO_CONTRIBUYENTE') ||
    accion.includes('NUEVO_CENSO') ||
    accion.includes('PREREGISTRO')
  ) {
    return 'MEDIA';
  }

  // 4. BAJA: Reportes, descargas, consultas y logins normales
  return 'BAJA';
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('TODAS');
  const [filterNivel, setFilterNivel] = useState<string>('TODAS');
  const [filterUser, setFilterUser] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [omitirSesiones, setOmitirSesiones] = useState<boolean>(true); // Activado por defecto
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Cargar registros de auditoria por bloques
      let q1 = supabase.from('auditoria').select('*').order('created_at', { ascending: false }).range(0, 999);
      let q2 = supabase.from('auditoria').select('*').order('created_at', { ascending: false }).range(1000, 1999);
      let q3 = supabase.from('auditoria').select('*').order('created_at', { ascending: false }).range(2000, 2999);

      if (filterDateFrom) {
        q1 = q1.gte('created_at', filterDateFrom + 'T00:00:00');
        q2 = q2.gte('created_at', filterDateFrom + 'T00:00:00');
        q3 = q3.gte('created_at', filterDateFrom + 'T00:00:00');
      }
      if (filterDateTo) {
        q1 = q1.lte('created_at', filterDateTo + 'T23:59:59');
        q2 = q2.lte('created_at', filterDateTo + 'T23:59:59');
        q3 = q3.lte('created_at', filterDateTo + 'T23:59:59');
      }
      if (filterUser) {
        q1 = q1.eq('usuario', filterUser);
        q2 = q2.eq('usuario', filterUser);
        q3 = q3.eq('usuario', filterUser);
      }

      // 2. Cargar audit_logs (censistas, recaudadores, modificaciones prediales)
      let qAuditLogs = supabase.from('audit_logs').select('*').order('id', { ascending: false }).range(0, 1999);
      if (filterDateFrom) qAuditLogs = qAuditLogs.gte('created_at', filterDateFrom + 'T00:00:00');
      if (filterDateTo)   qAuditLogs = qAuditLogs.lte('created_at', filterDateTo + 'T23:59:59');
      if (filterUser)     qAuditLogs = qAuditLogs.or(`user_id.eq.${filterUser},usuario.eq.${filterUser}`);

      const [res1, res2, res3, resAuditLogs] = await Promise.all([q1, q2, q3, qAuditLogs]);

      const auditRows = [...(res1.data || []), ...(res2.data || []), ...(res3.data || [])];
      
      // Adaptar audit_logs al formato unificado de auditoría
      const mappedAuditLogs = (resAuditLogs.data || []).map((a: any) => {
        const isCenso = (a.action || '').toUpperCase().includes('CENSO');
        return {
          id: `audit_log_${a.id}`,
          created_at: a.created_at,
          usuario: a.usuario || a.user_id || 'Censista',
          categoria: isCenso ? 'CENSO' : 'CONTRIBUYENTE',
          modulo: isCenso ? 'Censo Móvil / Campo' : 'Gestión Contribuyente',
          accion: a.action,
          detalles: {
            texto: a.details || '',
            ip: a.ip_address || '',
            _categoria: isCenso ? 'CENSO' : 'CONTRIBUYENTE'
          }
        };
      });

      const all = [...auditRows, ...mappedAuditLogs].map(item => {
        return {
          ...item,
          nivelAlerta: calcularNivelAlerta(item)
        };
      });

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(all);
    } finally { 
      setLoading(false); 
    }
  }, [filterDateFrom, filterDateTo, filterUser]);

  useEffect(() => { 
    fetchLogs(); 
  }, [fetchLogs]);

  // Client-side filtering
  const filtered = useMemo(() => {
    return logs.filter(l => {
      // 1. Omitir inicios y cierres de sesión
      if (omitirSesiones) {
        const cat = getCategoria(l);
        const acc = (l.accion || '').toUpperCase();
        if (cat === 'SESION' || acc.includes('LOGIN') || acc.includes('LOGOUT') || acc.includes('INICIO DE SESI') || acc.includes('CIERRE')) {
          return false;
        }
      }

      // 2. Filtro de Categoría
      const cat = getCategoria(l);
      if (filterCat !== 'TODAS' && cat !== filterCat) return false;

      // 3. Filtro por Nivel de Alerta
      if (filterNivel !== 'TODAS' && l.nivelAlerta !== filterNivel) return false;

      // 4. Búsqueda por texto
      if (search) {
        const s = search.toLowerCase();
        if (
          !l.usuario?.toLowerCase().includes(s) &&
          !l.accion?.toLowerCase().includes(s) &&
          !JSON.stringify(l.detalles || {}).toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [logs, omitirSesiones, filterCat, filterNivel, search]);

  const usuarios = useMemo(() => {
    return [...new Set(logs.map((l: any) => l.usuario).filter(Boolean))].sort() as string[];
  }, [logs]);

  // Estadísticas dinámicas de alertas (sobre los logs ya omitiendo sesiones si aplica)
  const statsAlertas = useMemo(() => {
    const base = omitirSesiones 
      ? logs.filter(l => {
          const cat = getCategoria(l);
          const acc = (l.accion || '').toUpperCase();
          return cat !== 'SESION' && !acc.includes('LOGIN') && !acc.includes('LOGOUT');
        })
      : logs;

    return {
      total: base.length,
      critica: base.filter(l => l.nivelAlerta === 'CRITICA').length,
      alta: base.filter(l => l.nivelAlerta === 'ALTA').length,
      media: base.filter(l => l.nivelAlerta === 'MEDIA').length,
      baja: base.filter(l => l.nivelAlerta === 'BAJA').length,
    };
  }, [logs, omitirSesiones]);

  const exportarExcel = () => {
    const data = filtered.map(l => {
      const det = parseDetalles(l.detalles);
      return {
        'Fecha y Hora': new Date(l.created_at).toLocaleString('es-VE'),
        'Operador':     l.usuario,
        'Nivel Alerta': l.nivelAlerta,
        'Categoría':    getCategoria(l),
        'Módulo':       getModulo(l).replace('/admin/','').replace('/','') || '',
        'Acción':       l.accion,
        'Identidad / RIF': det.identidad || det.contribuyente || '',
        'Monto Bs':     det.monto_bs ? `Bs. ${Number(det.monto_bs).toFixed(2)}` : '',
        'Método Pago':  det.metodo || det.banco || '',
        'Referencia':   det.referencia_pago || det.referencia || '',
        'Detalles':     JSON.stringify(det),
      };
    });
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Auditoria_Operadores');
    xlsx.writeFile(wb, `Auditoria_Operadores_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDescargarPDF = () => {
    generarReporteAuditoriaPDF(filtered, {
      nivelAlerta: filterNivel,
      usuario: filterUser,
      fechaDesde: filterDateFrom,
      fechaHasta: filterDateTo,
      omitirSesiones
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Centro de Auditoría y Fiscalización de Operadores
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitoreo en vivo de todas las acciones, cobros, censos y modificaciones realizadas por el personal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={fetchLogs} 
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          
          <button 
            onClick={exportarExcel} 
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            <Download size={15} /> Excel
          </button>

          <button 
            onClick={handleDescargarPDF} 
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-95"
            title="Generar informe técnico en PDF listo para imprimir o presentar"
          >
            <FileText size={16} /> 📄 Informe PDF Profesional
          </button>
        </div>
      </div>

      {/* Tarjetas de Severidad / Niveles de Alerta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <button
          onClick={() => setFilterNivel(filterNivel === 'CRITICA' ? 'TODAS' : 'CRITICA')}
          className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
            filterNivel === 'CRITICA'
              ? 'border-red-500 bg-red-50 shadow-md ring-2 ring-red-300'
              : 'border-slate-200 bg-white hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Alerta Crítica
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
              Anulaciones / Tasa
            </span>
          </div>
          <div className="text-3xl font-black text-red-600">{statsAlertas.critica}</div>
          <p className="text-[11px] text-slate-500 mt-1">Reversos, cambios de tasa o errores críticos</p>
        </button>

        <button
          onClick={() => setFilterNivel(filterNivel === 'ALTA' ? 'TODAS' : 'ALTA')}
          className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
            filterNivel === 'ALTA'
              ? 'border-orange-500 bg-orange-50 shadow-md ring-2 ring-orange-300'
              : 'border-slate-200 bg-white hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-orange-700 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> Alerta Alta
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
              Caja / Cobros
            </span>
          </div>
          <div className="text-3xl font-black text-orange-600">{statsAlertas.alta}</div>
          <p className="text-[11px] text-slate-500 mt-1">Cobros en caja, convenios y conciliación</p>
        </button>

        <button
          onClick={() => setFilterNivel(filterNivel === 'MEDIA' ? 'TODAS' : 'MEDIA')}
          className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
            filterNivel === 'MEDIA'
              ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-300'
              : 'border-slate-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-600" /> Alerta Media
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
              Censo / Padrón
            </span>
          </div>
          <div className="text-3xl font-black text-amber-700">{statsAlertas.media}</div>
          <p className="text-[11px] text-slate-500 mt-1">Nuevos censos, registros y edición de inmuebles</p>
        </button>

        <button
          onClick={() => setFilterNivel(filterNivel === 'BAJA' ? 'TODAS' : 'BAJA')}
          className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
            filterNivel === 'BAJA'
              ? 'border-indigo-400 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Informativo / Baja
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Operativo
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800">{statsAlertas.baja}</div>
          <p className="text-[11px] text-slate-500 mt-1">Consultas, reportes y operaciones rutinarias</p>
        </button>
      </div>

      {/* Barra de Filtros y Control de Sesiones */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Controles de Filtrado Especial
            </span>
          </div>

          {/* Switch para Omitir Inicios de Sesión */}
          <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
            <input 
              type="checkbox" 
              checked={omitirSesiones} 
              onChange={(e) => setOmitirSesiones(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-800">
              🚫 Omitir Inicios de Sesión y Logouts
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
              {omitirSesiones ? 'Activado: Solo acciones operativas' : 'Desactivado: Mostrando todo'}
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar operador, contribuyente, recibo, detalle..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50/50" 
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Severidad:</span>
            <select 
              value={filterNivel} 
              onChange={e => setFilterNivel(e.target.value)}
              className="border border-slate-200 rounded-lg py-2 px-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-800"
            >
              <option value="TODAS">Todos los Niveles</option>
              <option value="CRITICA">🔴 Crítica</option>
              <option value="ALTA">🟠 Alta</option>
              <option value="MEDIA">🟡 Media</option>
              <option value="BAJA">⚪ Baja</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select 
              value={filterCat} 
              onChange={e => setFilterCat(e.target.value)}
              className="border border-slate-200 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <select 
              value={filterUser} 
              onChange={e => setFilterUser(e.target.value)}
              className="border border-slate-200 rounded-lg py-2 px-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white max-w-[180px]"
            >
              <option value="">Todos los Operadores</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="date" 
              value={filterDateFrom} 
              onChange={e => setFilterDateFrom(e.target.value)}
              className="border border-slate-200 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" 
            />
            <span className="text-slate-400 text-xs">→</span>
            <input 
              type="date" 
              value={filterDateTo} 
              onChange={e => setFilterDateTo(e.target.value)}
              className="border border-slate-200 rounded-lg py-2 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" 
            />
          </div>

          {(search || filterCat !== 'TODAS' || filterNivel !== 'TODAS' || filterUser || filterDateFrom || filterDateTo || !omitirSesiones) && (
            <button
              onClick={() => {
                setSearch('');
                setFilterCat('TODAS');
                setFilterNivel('TODAS');
                setFilterUser('');
                setFilterDateFrom('');
                setFilterDateTo('');
                setOmitirSesiones(true);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-2 flex items-center gap-1 transition-colors"
            >
              <X size={14} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Auditoría */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Historial de Acciones Filtradas ({filtered.length} eventos)
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Haga clic en cualquier fila para inspeccionar el detalle técnico
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
            <p className="text-sm font-semibold text-slate-600">Cargando registros de auditoría y operadores...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No se encontraron eventos</p>
            <p className="text-xs text-slate-400 mt-1">Ajuste los filtros o desactive la omisión de inicios de sesión para ver más registros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3 text-center">Nivel</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Acción Registrada</th>
                  <th className="px-4 py-3">Módulo</th>
                  <th className="px-4 py-3">Detalles Clave de la Operación</th>
                  <th className="px-4 py-3 text-center w-12">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => {
                  const fecha = new Date(l.created_at);
                  const cat = getCategoria(l);
                  const modulo = getModulo(l);
                  const det = parseDetalles(l.detalles);
                  const badge = ALERTA_BADGES[l.nivelAlerta as NivelAlerta] || ALERTA_BADGES.BAJA;
                  const Icon = badge.icon;

                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLog(l)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800 text-xs">{fecha.toLocaleDateString('es-VE')}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{fecha.toLocaleTimeString('es-VE')}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-xs">
                          {l.usuario || 'SISTEMA'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${badge.bg} ${badge.text}`}>
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={'px-2 py-0.5 rounded text-[10px] font-black ' + (CAT_COLORS[cat] || 'bg-gray-100 text-gray-700')}>
                          {cat}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-800 text-xs max-w-[220px]">
                        {l.accion}
                      </td>

                      <td className="px-4 py-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {modulo ? modulo.replace('/admin/','').split('/')[0] : '—'}
                      </td>

                      <td className="px-4 py-3 max-w-[320px]">
                        <div className="flex flex-wrap gap-1 items-center">
                          {det.texto && (
                            <span className="text-xs text-slate-700 line-clamp-1">{det.texto}</span>
                          )}
                          {det.details && (
                            <span className="text-xs text-slate-700 line-clamp-1">{det.details}</span>
                          )}
                          {(det.identidad || det.contribuyente) && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono border border-slate-200">
                              {det.identidad || det.contribuyente}
                            </span>
                          )}
                          {det.monto_bs && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-200">
                              Bs. {Number(det.monto_bs).toLocaleString('es-VE',{minimumFractionDigits:2})}
                            </span>
                          )}
                          {det.metodo && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                              {det.metodo}
                            </span>
                          )}
                          {det.referencia_pago && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded text-[10px] font-mono border border-amber-200">
                              Ref: {det.referencia_pago}
                            </span>
                          )}
                          {det.nueva_tasa && (
                            <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-bold border border-rose-200">
                              Tasa: {det.nueva_tasa}
                            </span>
                          )}
                          {det.error && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-bold">
                              ⚠ {det.error}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button className="text-slate-400 group-hover:text-indigo-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                          <Eye size={15} />
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

      {/* Modal de Detalle Completo */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" 
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto border border-slate-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" /> Detalle de la Operación Auditada
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400 text-xs block mb-0.5">Fecha y Hora Exacta</span>
                  <span className="font-semibold text-slate-800">{new Date(selectedLog.created_at).toLocaleString('es-VE')}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-0.5">Operador / Usuario Responsable</span>
                  <span className="font-black text-indigo-700 text-base">{selectedLog.usuario}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-0.5">Nivel de Severidad</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                    ALERTA_BADGES[selectedLog.nivelAlerta as NivelAlerta]?.bg || 'bg-slate-100'
                  } ${
                    ALERTA_BADGES[selectedLog.nivelAlerta as NivelAlerta]?.text || 'text-slate-700'
                  }`}>
                    {selectedLog.nivelAlerta}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-0.5">Categoría</span>
                  <span className={'px-2 py-0.5 rounded text-[11px] font-black ' + (CAT_COLORS[getCategoria(selectedLog)] || 'bg-gray-100 text-gray-700')}>
                    {getCategoria(selectedLog)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-xs block mb-1">Acción Ejecutada</span>
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-bold text-slate-800">
                  {selectedLog.accion}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-xs block mb-1">Módulo del Sistema</span>
                <div className="font-mono text-xs bg-slate-100 px-3 py-1.5 rounded text-slate-700 inline-block">
                  {getModulo(selectedLog) || 'Módulo Principal'}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-xs block mb-1">Detalles Técnicos y Payload Registrado</span>
                <pre className="bg-slate-900 text-emerald-300 rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                  {JSON.stringify(parseDetalles(selectedLog.detalles), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
