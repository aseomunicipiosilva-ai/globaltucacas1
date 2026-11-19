'use client';
import { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  QrCode,
  Calendar,
  DollarSign,
  Clock,
  RotateCw,
  Building2,
  CheckCircle,
  X,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { esContribuyenteHacienda, deduplicarContribuyentes } from '@/lib/filtroHacienda';
import { tarifasHaciendaCatastro } from '@/data/ordenanza';

interface LicenciaItem {
  id: string | number;
  identidad: string;
  contribuyente: string;
  patente: string;
  actividad: string;
  clasificacion: string;
  estado: 'Vigente' | 'Por Renovar' | 'Vencida';
  fecha_emision?: string;
  fecha_vencimiento?: string;
  montoRenovacionTcmmv: number;
  montoRenovacionBs: number;
}

export default function LicenciasHaciendaPage() {
  const [licencias, setLicencias] = useState<LicenciaItem[]>([]);
  const [filtro, setFiltro] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Vigente' | 'Por Renovar'>('Todos');
  const [loading, setLoading] = useState(true);
  const [tasaBcv, setTasaBcv] = useState<number>(1007.39);
  const [modalCertificado, setModalCertificado] = useState<LicenciaItem | null>(null);

  useEffect(() => {
    cargarLicencias();
  }, []);

  async function cargarLicencias() {
    setLoading(true);
    try {
      // 1. Obtener tasa BCV oficial
      let currentBcv = 1007.39;
      try {
        const res = await fetch('/api/bcv');
        const bcvData = await res.json();
        if (bcvData && bcvData.tcmmv) {
          currentBcv = bcvData.tcmmv;
          setTasaBcv(currentBcv);
        }
      } catch (e) {
        console.warn('Usando tasa de contingencia BCV:', e);
      }

      const items: LicenciaItem[] = [];

      // 2. Extraer patentes de pre_registros (las notas con 'Patente: ...')
      const { data: prData } = await supabase
        .from('pre_registros')
        .select('id, identidad, contribuyente, actividad, tipo, nota, created_at')
        .ilike('nota', '%patente%')
        .limit(400);

      if (prData) {
        prData.forEach((pr: any) => {
          const match = pr.nota?.match(/Patente:\s*([A-Za-z0-9\-_]+)/i);
          if (match && match[1] && match[1].toUpperCase() !== 'SN' && match[1].toUpperCase() !== 'NO') {
            const patNum = match[1].trim();
            const fechaEmision = pr.created_at ? pr.created_at.split('T')[0] : '2026-01-15';
            
            // La licencia comercial vence al año de emisión
            const d = new Date(fechaEmision);
            d.setFullYear(d.getFullYear() + 1);
            const fechaVenc = d.toISOString().split('T')[0];

            const montoTcmmv = tarifasHaciendaCatastro.hacienda.renovacionLicencia.tcmmv; // 0.25 TCMMV
            items.push({
              id: `pr-${pr.id}`,
              identidad: pr.identidad || 'S/I',
              contribuyente: pr.contribuyente || 'Contribuyente',
              patente: patNum,
              actividad: pr.actividad || 'Comercio General',
              clasificacion: pr.tipo || 'Comercial',
              estado: 'Vigente',
              fecha_emision: fechaEmision,
              fecha_vencimiento: fechaVenc,
              montoRenovacionTcmmv: montoTcmmv,
              montoRenovacionBs: montoTcmmv * currentBcv
            });
          }
        });
      }

      // 3. Extraer patentes de la tabla inmuebles
      const { data: inms } = await supabase
        .from('inmuebles')
        .select('*')
        .not('patente', 'is', null)
        .neq('patente', 'SN')
        .limit(200);

      if (inms) {
        inms.forEach((inm: any) => {
          if (!items.some(it => it.identidad === inm.identidad || it.patente === inm.patente)) {
            const fechaEmision = inm.created_at ? inm.created_at.split('T')[0] : '2026-01-01';
            const d = new Date(fechaEmision);
            d.setFullYear(d.getFullYear() + 1);
            const fechaVenc = d.toISOString().split('T')[0];

            const montoTcmmv = tarifasHaciendaCatastro.hacienda.renovacionLicencia.tcmmv;
            items.push({
              id: `inm-${inm.id}`,
              identidad: inm.identidad,
              contribuyente: inm.contribuyente,
              patente: inm.patente,
              actividad: inm.actividad_principal || inm.clasificacion || 'Comercial',
              clasificacion: inm.clasificacion || 'Comercial',
              estado: 'Vigente',
              fecha_emision: fechaEmision,
              fecha_vencimiento: fechaVenc,
              montoRenovacionTcmmv: montoTcmmv,
              montoRenovacionBs: montoTcmmv * currentBcv
            });
          }
        });
      }

      setLicencias(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtrados = licencias.filter(i => {
    if (filtroEstado !== 'Todos' && i.estado !== filtroEstado) return false;
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      (i.contribuyente || '').toLowerCase().includes(q) ||
      (i.identidad || '').toLowerCase().includes(q) ||
      (i.patente || '').toLowerCase().includes(q) ||
      (i.actividad || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-sky-400" />
            Licencias y Patentes de Actividades Económicas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión y renovación anual de licencias de funcionamiento de comercios e industrias del Municipio Silva.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            Total Licencias Registradas: <span className="text-sky-400 font-mono">{licencias.length}</span>
          </span>
        </div>
      </div>

      {/* Tarjeta Informativa de Parámetros Legales (LOCAT y Ordenanza Silva) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Costo de Emisión Nueva */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Trámite de Licencia Nueva (Expedición)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-white font-mono">0.50 TCMMV</span>
            <span className="text-xs text-sky-400 font-mono">≈ Bs. {(0.50 * tasaBcv).toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Pago único por solicitud, inspección técnica previa y apertura de expediente comercial.
          </p>
        </div>

        {/* Frecuencia y Costo de Renovación */}
        <div className="bg-slate-950/80 border border-sky-900/60 rounded-2xl p-4 space-y-1 shadow-lg bg-sky-950/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider block">
              Renovación de Licencia (Frecuencia Anual)
            </span>
            <span className="text-[9px] bg-sky-900/60 text-sky-200 px-2 py-0.5 rounded font-bold border border-sky-700">
              CADA 1 AÑO
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-sky-400 font-mono">0.25 TCMMV</span>
            <span className="text-xs text-slate-300 font-mono">≈ Bs. {(0.25 * tasaBcv).toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Se paga <strong>anualmente</strong> durante el primer trimestre del año fiscal para revalidar la patente.
          </p>
        </div>

        {/* Requisito de Solvencia de Aseo */}
        <div className="bg-slate-950/80 border border-amber-900/60 rounded-2xl p-4 space-y-1 shadow-lg bg-amber-950/10">
          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
            Condición Obligatoria para Renovación
          </span>
          <div className="text-sm font-bold text-amber-200 flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Solvencia de Aseo Urbano
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Conforme a la Ordenanza Municipal, no se emitirá ni renovará patente a comercios con deuda activa de aseo.
          </p>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            placeholder="Buscar por N° Patente, RIF o Razón Social..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-medium"
          />
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs w-full md:w-auto">
          {(['Todos', 'Vigente', 'Por Renovar'] as const).map(est => (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-bold transition-all ${
                filtroEstado === est ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Licencias y Patentes */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">N° Patente</th>
                <th className="px-4 py-3.5">RIF / Cédula</th>
                <th className="px-4 py-3.5">Razón Social / Comercio</th>
                <th className="px-4 py-3.5">Actividad Económica</th>
                <th className="px-4 py-3.5">Vencimiento Anual</th>
                <th className="px-4 py-3.5">Tarifa Renovación</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Cargando licencias del Municipio Silva...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No se encontraron licencias con los criterios de búsqueda.</td></tr>
              ) : (
                filtrados.map(lic => (
                  <tr key={lic.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-sky-400">
                      <span className="bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                        {lic.patente}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300">{lic.identidad}</td>
                    <td className="px-4 py-3.5 font-bold text-white max-w-xs truncate">{lic.contribuyente}</td>
                    <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate text-[11px]">{lic.actividad}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-300 text-[11px]">
                      {lic.fecha_vencimiento || '2027-01-01'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px]">
                      <span className="text-white font-bold">Bs. {lic.montoRenovacionBs.toFixed(2)}</span>
                      <span className="text-slate-500 text-[10px] block font-normal">({lic.montoRenovacionTcmmv} TCMMV)</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {lic.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setModalCertificado(lic)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold shadow transition-colors inline-flex items-center gap-1"
                        title="Ver Certificado de Licencia Oficial"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        Ver Licencia
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CERTIFICADO DE LICENCIA / PATENTE */}
      {modalCertificado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-sm">
                  Certificado de Licencia de Actividades Económicas
                </h3>
              </div>
              <button
                onClick={() => setModalCertificado(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del Certificado Municipal */}
            <div className="p-6 space-y-6 bg-slate-900/40">
              <div className="border-2 border-sky-500/40 rounded-2xl p-6 bg-gradient-to-b from-slate-950 to-slate-900 relative space-y-4 shadow-inner">
                <div className="text-center space-y-1 border-b border-slate-800 pb-4">
                  <h4 className="text-xs font-black tracking-widest text-sky-400 uppercase">
                    República Bolivariana de Venezuela • Estado Falcón
                  </h4>
                  <h3 className="text-sm font-black text-white uppercase">
                    Alcaldía del Municipio José Laurencio Silva • Tucacas
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">
                    Dirección de Hacienda y Administración Tributaria Municipal
                  </p>
                </div>

                <div className="text-center py-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    NÚMERO DE PATENTE COMERCIAL
                  </span>
                  <span className="text-3xl font-black text-sky-400 font-mono tracking-wider">
                    {modalCertificado.patente}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Razón Social:</span>
                    <span className="font-bold text-white text-sm">{modalCertificado.contribuyente}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">RIF / Cédula:</span>
                    <span className="font-mono font-bold text-sky-300 text-sm">{modalCertificado.identidad}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Actividad Económica Autorizada:</span>
                    <span className="font-medium text-slate-300 text-xs">{modalCertificado.actividad}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Fecha de Emisión:</span>
                    <span className="font-mono text-slate-300">{modalCertificado.fecha_emision || '2026-01-15'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Válida Hasta (Renovación Anual):</span>
                    <span className="font-mono text-emerald-400 font-bold">{modalCertificado.fecha_vencimiento || '2027-01-15'}</span>
                  </div>
                  <div className="col-span-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tasa de Renovación Anual:</span>
                      <span className="font-mono text-xs font-bold text-white">0.25 TCMMV (Bs. {modalCertificado.montoRenovacionBs.toFixed(2)})</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ESTATUS: VIGENTE
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalCertificado(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Certificado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
