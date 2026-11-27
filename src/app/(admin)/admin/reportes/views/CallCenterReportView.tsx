'use client';

import { useState, useEffect } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneForwarded, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  User, 
  Search, 
  Calendar, 
  TrendingUp, 
  Award, 
  RefreshCw,
  FileSpreadsheet,
  Download,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import * as xlsx from 'xlsx';

export default function CallCenterReportView({ onBack }: { onBack?: () => void }) {
  const [llamadas, setLlamadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEfectivo, setFiltroEfectivo] = useState<string>('todos');
  const [filtroPago, setFiltroPago] = useState<string>('todos');
  const [metaDiaria, setMetaDiaria] = useState<number>(30); // Meta por defecto: 30 llamadas

  // Formulario de nueva llamada
  const [showModal, setShowModal] = useState(false);
  const [contribuyente, setContribuyente] = useState('');
  const [identidad, setIdentidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contactoEfectivo, setContactoEfectivo] = useState<boolean>(true);
  const [logroPago, setLogroPago] = useState<boolean>(false);
  const [montoCompromiso, setMontoCompromiso] = useState<string>('');
  const [fechaCompromiso, setFechaCompromiso] = useState<string>('');
  const [observaciones, setObservaciones] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = typeof window !== 'undefined' ? (localStorage.getItem('adminUser') || 'Analista') : 'Analista';

  const cargarLlamadas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('servicios_especiales')
        .select('*')
        .eq('tipo', 'call_center')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLlamadas(data || []);
    } catch (err) {
      console.error('Error cargando llamadas de call center:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarLlamadas();
  }, []);

  const handleGuardarLlamada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribuyente.trim()) return alert('Ingrese el nombre del contribuyente.');
    if (!observaciones.trim()) return alert('Ingrese las observaciones de la llamada.');

    setIsSaving(true);
    try {
      const refCall = `CALL-${Date.now().toString().slice(-6)}`;
      const payloadNotas = {
        subtipo: 'gestion_telefonica',
        contacto_efectivo: contactoEfectivo,
        logro_pago: logroPago,
        telefono: telefono.trim(),
        monto_compromiso: parseFloat(montoCompromiso) || 0,
        fecha_compromiso: fechaCompromiso || null,
        observaciones: observaciones.trim(),
        analista: currentUser
      };

      const { error } = await supabase.from('servicios_especiales').insert({
        tipo: 'call_center',
        identidad: identidad.trim() || 'S/R',
        contribuyente: contribuyente.trim(),
        descripcion: `Gestión Call Center: ${contribuyente.trim()} — Contacto: ${contactoEfectivo ? 'SÍ' : 'NO'} | Pago: ${logroPago ? 'SÍ' : 'NO'}`,
        monto: parseFloat(montoCompromiso) || 0,
        fecha: new Date().toISOString().split('T')[0],
        notas: JSON.stringify(payloadNotas),
        estado: logroPago ? 'Cobro Exitoso' : (contactoEfectivo ? 'Contacto Sin Pago' : 'No Contactado'),
        referencia: refCall,
        creado_por: currentUser,
        origen: 'call_center'
      });

      if (error) throw error;

      logAudit('Registro de Llamada Call Center', {
        contribuyente,
        contacto_efectivo: contactoEfectivo,
        logro_pago: logroPago,
        referencia: refCall
      }, 'CALL_CENTER');

      alert('✅ Gestión telefónica registrada exitosamente.');
      setShowModal(false);
      setContribuyente('');
      setIdentidad('');
      setTelefono('');
      setContactoEfectivo(true);
      setLogroPago(false);
      setMontoCompromiso('');
      setFechaCompromiso('');
      setObservaciones('');
      cargarLlamadas();
    } catch (err: any) {
      alert('Error registrando llamada: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrado
  const llamadasFiltradas = llamadas.filter((item: any) => {
    let parsed: any = {};
    try {
      parsed = typeof item.notas === 'string' ? JSON.parse(item.notas) : (item.notas || {});
    } catch {}

    const q = search.toLowerCase();
    const matchText = 
      (item.contribuyente || '').toLowerCase().includes(q) ||
      (item.identidad || '').toLowerCase().includes(q) ||
      (parsed.telefono || '').toLowerCase().includes(q) ||
      (parsed.observaciones || '').toLowerCase().includes(q) ||
      (item.creado_por || '').toLowerCase().includes(q);

    if (!matchText) return false;

    if (filtroEfectivo === 'si' && parsed.contacto_efectivo !== true) return false;
    if (filtroEfectivo === 'no' && parsed.contacto_efectivo === true) return false;

    if (filtroPago === 'si' && parsed.logro_pago !== true) return false;
    if (filtroPago === 'no' && parsed.logro_pago === true) return false;

    return true;
  });

  // Estadísticas y Metas Diarias (REQ-CC-03)
  const hoyStr = new Date().toISOString().split('T')[0];
  const llamadasHoy = llamadas.filter((l: any) => (l.fecha === hoyStr || (l.created_at && l.created_at.startsWith(hoyStr))));
  const llamadasHoyAnalista = llamadasHoy.filter((l: any) => (l.creado_por || '').toLowerCase() === currentUser.toLowerCase());
  
  const totalHoy = llamadasHoyAnalista.length;
  const porcentajeAvance = Math.min(100, Math.round((totalHoy / (metaDiaria || 1)) * 100));

  // Conteo de contactos efectivos y pagos
  const efectivosHoy = llamadasHoyAnalista.filter((l: any) => {
    try {
      const p = typeof l.notas === 'string' ? JSON.parse(l.notas) : (l.notas || {});
      return p.contacto_efectivo === true;
    } catch { return false; }
  }).length;

  const pagosHoy = llamadasHoyAnalista.filter((l: any) => {
    try {
      const p = typeof l.notas === 'string' ? JSON.parse(l.notas) : (l.notas || {});
      return p.logro_pago === true;
    } catch { return false; }
  }).length;

  // Exportar Excel
  const exportarExcel = () => {
    const dataToExport = llamadasFiltradas.map((l: any, i: number) => {
      let p: any = {};
      try { p = typeof l.notas === 'string' ? JSON.parse(l.notas) : (l.notas || {}); } catch {}
      return {
        '#': i + 1,
        'Fecha': l.fecha,
        'Analista': l.creado_por || 'S/A',
        'Contribuyente': l.contribuyente,
        'Cédula / RIF': l.identidad,
        'Teléfono': p.telefono || '—',
        '¿Contacto Efectivo?': p.contacto_efectivo ? 'SÍ' : 'NO',
        '¿Logró Pago?': p.logro_pago ? 'SÍ' : 'NO',
        'Monto Compromiso (Bs)': l.monto || 0,
        'Fecha Compromiso': p.fecha_compromiso || '—',
        'Observaciones': p.observaciones || l.descripcion
      };
    });

    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Gestión Call Center');
    xlsx.writeFile(wb, `CallCenter_Gestion_${hoyStr}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">
                Call Center y Cobranza Preventiva
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Bitácora de llamadas, seguimiento y metas de cobro municipal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Nueva Llamada
          </button>
          <button
            onClick={exportarExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
          <button
            onClick={cargarLlamadas}
            disabled={loading}
            className="p-2 bg-white border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TABLERO DE METAS Y AVANCE DIARIO POR ANALISTA (REQ-CC-03) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Tarjeta de Meta y Porcentaje */}
        <div className="md:col-span-2 bg-gradient-to-br from-purple-900 to-indigo-950 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2 z-10">
            <span className="text-xs uppercase tracking-wider font-extrabold text-purple-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Meta Diaria del Analista ({currentUser})
            </span>
            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg text-xs">
              <span className="text-[10px] text-purple-200">Meta:</span>
              <input
                type="number"
                min="5"
                max="200"
                value={metaDiaria}
                onChange={e => setMetaDiaria(parseInt(e.target.value) || 30)}
                className="w-12 bg-transparent text-white font-bold text-center border-b border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="my-2 z-10">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-3xl font-black text-white">{totalHoy} <span className="text-sm font-semibold text-purple-300">/ {metaDiaria} llamadas</span></span>
              <span className="text-2xl font-black text-emerald-400">{porcentajeAvance}%</span>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-purple-950/80 rounded-full h-3 border border-purple-700/50 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  porcentajeAvance >= 100 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                    : 'bg-gradient-to-r from-purple-500 to-indigo-400'
                }`}
                style={{ width: `${porcentajeAvance}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-purple-300 z-10 pt-2 border-t border-purple-800/40">
            <span>Contactos Efectivos: <strong className="text-white">{efectivosHoy}</strong></span>
            <span>Pagos Concretados: <strong className="text-emerald-400">{pagosHoy}</strong></span>
            <span>Fecha: <strong>{new Date().toLocaleDateString('es-VE')}</strong></span>
          </div>
        </div>

        {/* Métrica 2: Contactos Efectivos Globales */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Contactados Totales</span>
            <PhoneForwarded className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-slate-800 my-2">
            {llamadas.filter((l: any) => {
              try { return JSON.parse(l.notas).contacto_efectivo === true; } catch { return false; }
            }).length}
          </div>
          <p className="text-[11px] text-slate-500">Contribuyentes que atendieron</p>
        </div>

        {/* Métrica 3: Pagos / Acuerdos Concretados */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Pagos Concretados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 my-2">
            {llamadas.filter((l: any) => {
              try { return JSON.parse(l.notas).logro_pago === true; } catch { return false; }
            }).length}
          </div>
          <p className="text-[11px] text-slate-500">Compromisos de pago cerrados</p>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por contribuyente, RIF, teléfono, observaciones..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">¿Contacto?:</span>
          <select
            value={filtroEfectivo}
            onChange={e => setFiltroEfectivo(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700"
          >
            <option value="todos">Todos</option>
            <option value="si">Solo Efectivos (SÍ)</option>
            <option value="no">Sin Contacto (NO)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">¿Logró Pago?:</span>
          <select
            value={filtroPago}
            onChange={e => setFiltroPago(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700"
          >
            <option value="todos">Todos</option>
            <option value="si">Concretó Pago (SÍ)</option>
            <option value="no">No Concretó Pago (NO)</option>
          </select>
        </div>
      </div>

      {/* TABLA DE BITÁCORA CON SEMAFORIZACIÓN VISUAL (REQ-CC-01 y REQ-CC-02) */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Fecha / Hora</th>
                <th className="py-3.5 px-4">Contribuyente</th>
                <th className="py-3.5 px-4">Cédula / RIF</th>
                <th className="py-3.5 px-4">Teléfono</th>
                <th className="py-3.5 px-4">Contacto</th>
                <th className="py-3.5 px-4">¿Logró Pago?</th>
                <th className="py-3.5 px-4">Observaciones y Resultado</th>
                <th className="py-3.5 px-4">Analista</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    Cargando bitácora de llamadas...
                  </td>
                </tr>
              ) : llamadasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No se encontraron gestiones registradas.
                  </td>
                </tr>
              ) : (
                llamadasFiltradas.map((l: any, idx: number) => {
                  let p: any = {};
                  try { p = typeof l.notas === 'string' ? JSON.parse(l.notas) : (l.notas || {}); } catch {}
                  
                  // REQ-CC-02: Semaforización automática si hubo contacto efectivo pero NO se logró pago
                  const contactoSi = p.contacto_efectivo === true;
                  const pagoSi = p.logro_pago === true;
                  const alertaContactoSinPago = contactoSi && !pagoSi;

                  return (
                    <tr 
                      key={l.id || idx} 
                      className={`transition-colors ${
                        pagoSi 
                          ? 'bg-emerald-50/40 hover:bg-emerald-50' 
                          : alertaContactoSinPago 
                            ? 'bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-500' 
                            : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {l.fecha}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {l.contribuyente}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {l.identidad}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {p.telefono || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {contactoSi ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-100 text-sky-800 border border-sky-300">
                            <CheckCircle2 className="w-3 h-3 text-sky-600" /> SÍ CONTACTADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-600">
                            <XCircle className="w-3 h-3 text-slate-400" /> NO CONTACTADO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {pagoSi ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SÍ (PAGÓ / ACORDÓ)
                          </span>
                        ) : alertaContactoSinPago ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[10px] bg-amber-200 text-amber-900 border border-amber-400 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-700" /> NO (SEGUIMIENTO)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-700 font-medium line-clamp-2">{p.observaciones || l.descripcion}</p>
                        {p.monto_compromiso > 0 && (
                          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                            Compromiso: Bs. {Number(p.monto_compromiso).toLocaleString('es-VE', {minimumFractionDigits:2})}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {l.creado_por || 'Analista'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA REGISTRAR NUEVA LLAMADA (REQ-CC-01) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-1">
              <PhoneCall className="w-5 h-5 text-purple-600" /> Registrar Gestión Telefónica
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Bitácora de contacto para cobro preventivo y acuerdos de pago
            </p>

            <form onSubmit={handleGuardarLlamada} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre o Razón Social del Contribuyente *</label>
                <input
                  type="text"
                  value={contribuyente}
                  onChange={e => setContribuyente(e.target.value)}
                  placeholder="Ej. Comercial Silva, C.A."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-600 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cédula / RIF</label>
                  <input
                    type="text"
                    value={identidad}
                    onChange={e => setIdentidad(e.target.value)}
                    placeholder="J-12345678-0"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Llamado</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="0414-0000000"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* BIFURCACIÓN DE CONTACTO Y PAGO (REQ-CC-01 y REQ-CC-02) */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">¿Contacto Efectivo? *</label>
                  <select
                    value={contactoEfectivo ? 'si' : 'no'}
                    onChange={e => setContactoEfectivo(e.target.value === 'si')}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-800"
                  >
                    <option value="si">SÍ - Atendió</option>
                    <option value="no">NO - Buzón / No contesta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">¿Logró Pago? *</label>
                  <select
                    value={logroPago ? 'si' : 'no'}
                    onChange={e => setLogroPago(e.target.value === 'si')}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-800"
                  >
                    <option value="no">NO (Compromiso / Negativa)</option>
                    <option value="si">SÍ (Pagó / Reportó Pago)</option>
                  </select>
                </div>
              </div>

              {contactoEfectivo && !logroPago && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Esta llamada se marcará en color ámbar para seguimiento prioritario de cobro.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monto de Compromiso (Bs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={montoCompromiso}
                    onChange={e => setMontoCompromiso(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Compromiso de Pago</label>
                  <input
                    type="date"
                    value={fechaCompromiso}
                    onChange={e => setFechaCompromiso(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones de la Conversación *</label>
                <textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Detallar lo conversado, motivos expresados, fecha pactada o actitud..."
                  rows={3}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs outline-none focus:border-purple-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-sm"
                >
                  {isSaving ? 'Guardando...' : 'Registrar Gestión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
