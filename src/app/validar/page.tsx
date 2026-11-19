'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Loader2, 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  FileCheck, 
  XCircle, 
  Smartphone, 
  ArrowRight,
  Compass,
  Landmark,
  Trash2,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { verificarSolvenciaAseo, SolvenciaStatus } from '@/lib/solvenciaAseo';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ModuloSeleccionado = 'aseo' | 'catastro' | 'hacienda';

function ValidarContent() {
  const searchParams = useSearchParams();
  const initialCodigo = searchParams.get('codigo') || searchParams.get('rif') || searchParams.get('identidad') || searchParams.get('id') || '';
  const initialModulo = (searchParams.get('modulo') as ModuloSeleccionado) || 'aseo';

  const [codigo, setCodigo] = useState(initialCodigo);
  const [isLoading, setIsLoading] = useState(!!initialCodigo);
  const [moduloActivo, setModuloActivo] = useState<ModuloSeleccionado>(initialModulo);
  
  const [solvencia, setSolvencia] = useState<any>(null);
  const [contribuyenteInfo, setContribuyenteInfo] = useState<any>(null);
  const [solvenciaStatus, setSolvenciaStatus] = useState<SolvenciaStatus | null>(null);
  const [error, setError] = useState('');

  // Modal para solicitar la letra/nombre del operador al escanear QR
  const [showOperadorModal, setShowOperadorModal] = useState(false);
  const [operadorLetraInput, setOperadorLetraInput] = useState('');
  const [pendingContribuyente, setPendingContribuyente] = useState<any>(null);

  useEffect(() => {
    // Si ya tiene una letra u operador guardado en sesión previa
    if (typeof window !== 'undefined') {
      const savedLetra = localStorage.getItem('operador_letra') || '';
      if (savedLetra) setOperadorLetraInput(savedLetra);
    }
  }, []);

  useEffect(() => {
    if (initialCodigo) {
      handleSearch(initialCodigo);
    }
  }, [initialCodigo]);

  const handleSearch = async (searchStr: string) => {
    if (!searchStr.trim()) return;
    
    setIsLoading(true);
    setError('');
    setSolvencia(null);
    setContribuyenteInfo(null);
    setSolvenciaStatus(null);
    
    const query = searchStr.trim();
    const queryLimpia = query.replace(/[-.\s]/g, '').toUpperCase();
    const queryConGuion = queryLimpia.length > 1 ? queryLimpia.charAt(0) + '-' + queryLimpia.slice(1) : queryLimpia;

    try {
      // 1. Intentar buscar primero como Certificado específico (SOL-...)
      const { data: certData } = await supabase
        .from('certificados')
        .select('*')
        .eq('codigo', query)
        .maybeSingle();

      if (certData) {
        const hoy = new Date();
        const vencimiento = new Date(certData.vencimiento);
        setSolvencia({
          ...certData,
          vencida: hoy > vencimiento
        });
        setIsLoading(false);
        return;
      }

      // 2. Si no es un certificado, buscar como Contribuyente por Código (N-...), RIF, o Cédula
      let inms: any[] = [];
      const { data: inmsByCod } = await supabase
        .from('inmuebles')
        .select('*')
        .or(`cod_cont.eq.${query},cod_cont.ilike.${query}`)
        .limit(15);

      if (inmsByCod && inmsByCod.length > 0) {
        inms = inmsByCod;
      } else {
        const { data: inmsById } = await supabase
          .from('inmuebles')
          .select('*')
          .or(`identidad.eq.${query},identidad.eq.${queryLimpia},identidad.eq.${queryConGuion}`)
          .limit(15);
        if (inmsById && inmsById.length > 0) {
          inms = inmsById;
        }
      }

      // Si no aparece en inmuebles, buscar en pre_registros (Censo Catastro / Aseo)
      if (inms.length === 0) {
        const { data: prs } = await supabase
          .from('pre_registros')
          .select('*')
          .or(`codigo.eq.${query},identidad.eq.${query},identidad.eq.${queryLimpia},identidad.eq.${queryConGuion}`)
          .limit(10);
        
        if (prs && prs.length > 0) {
          const pr = prs[0];
          inms = [{
            cod_cont: pr.codigo || `PR-${pr.id}`,
            identidad: pr.identidad,
            contribuyente: pr.contribuyente,
            clasificacion: pr.tipo || 'Residencial',
            telefono: pr.registro,
            direccion: pr.direccion_exacta || pr.domicilio_fiscal,
            inmueble: pr.codigo || 'Predio Censo',
            sector: 'Tucacas',
            estado: 'Activo'
          }];
        }
      }

      if (inms.length === 0) {
        setError('No se encontró ningún contribuyente o certificado con ese código / RIF.');
        setIsLoading(false);
        return;
      }

      // Información consolidada del contribuyente
      const mainInm = inms[0];
      const identidad = mainInm.identidad || query;
      const status = await verificarSolvenciaAseo(identidad);

      setContribuyenteInfo({
        codigo: mainInm.cod_cont || 'N/A',
        identidad: identidad,
        contribuyente: mainInm.contribuyente || 'Contribuyente Municipal',
        clasificacion: mainInm.clasificacion || 'Comercial/Residencial',
        telefono: mainInm.telefono || 'No registrado',
        correo: mainInm.correo_electronico || 'No registrado',
        direccion: mainInm.direccion || 'Municipio Silva, Falcón',
        sector: mainInm.sector || 'Tucacas',
        patente: mainInm.patente || 'N/A',
        actividad: mainInm.actividad_principal || mainInm.actividad || mainInm.clasificacion,
        inmuebles: inms,
        estadoGeneral: mainInm.estado || 'Activo'
      });
      setSolvenciaStatus(status);

      // Si viene por escaneo QR de un contribuyente, pedir o confirmar la letra del operador
      const opParam = searchParams.get('op') || searchParams.get('operador') || searchParams.get('fiscal') || '';
      const savedLetra = typeof window !== 'undefined' ? (localStorage.getItem('operador_letra') || localStorage.getItem('operador_nombre') || '') : '';
      
      const payloadInfo = {
        identidad,
        codigo: mainInm.cod_cont || query,
        contribuyente: mainInm.contribuyente || ''
      };

      if (!opParam && !savedLetra) {
        // Mostrar modal emergente para que ingrese su letra
        setPendingContribuyente(payloadInfo);
        setShowOperadorModal(true);
      } else {
        // Ya tiene letra u operador definido, registrar de inmediato
        const finalLetra = (opParam || savedLetra || 'O').trim().toUpperCase().charAt(0) || 'O';
        registrarEscaneoEnAuditoria(payloadInfo, finalLetra);
      }

    } catch (e: any) {
      console.error(e);
      setError('Error al conectar con la base de datos municipal.');
    } finally {
      setIsLoading(false);
    }
  };

  const registrarEscaneoEnAuditoria = async (contrib: any, letra: string) => {
    try {
      const letraLimpia = (letra || 'O').trim().toUpperCase().charAt(0) || 'O';
      const operadorNombre = `Operador ${letraLimpia}`;

      if (typeof window !== 'undefined') {
        localStorage.setItem('operador_letra', letraLimpia);
        localStorage.setItem('operador_nombre', operadorNombre);
      }

      await supabase.from('audit_logs').insert([{
        user_id: operadorNombre,
        action: 'QR_ESCANEADO',
        details: JSON.stringify({
          identidad: contrib.identidad,
          codigo: contrib.codigo,
          contribuyente: contrib.contribuyente,
          operador: operadorNombre,
          inicial: letraLimpia,
          timestamp: new Date().toISOString()
        })
      }]);
    } catch (logErr) {
      console.warn('No se pudo registrar log de escaneo QR:', logErr);
    }
  };

  const handleConfirmarLetraOperador = () => {
    const letra = operadorLetraInput.trim().toUpperCase().charAt(0) || 'O';
    if (pendingContribuyente) {
      registrarEscaneoEnAuditoria(pendingContribuyente, letra);
    }
    setShowOperadorModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Encabezado Institucional Oficial con Logos de la Alcaldía */}
        <div className="text-center mb-8 bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-emerald-500 to-blue-500" />
          
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="relative w-20 h-20 bg-white/5 p-2 rounded-2xl border border-slate-800 backdrop-blur">
              <Image src="/logos/alcaldia.png" alt="Alcaldía de Silva" fill className="object-contain p-1" />
            </div>
            <div className="relative w-20 h-20 bg-white/5 p-2 rounded-2xl border border-slate-800 backdrop-blur">
              <Image src="/images/logo_isma.png" alt="ISMA / Aseo Silva" fill className="object-contain p-1" />
            </div>
          </div>
          
          <span className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/80 border border-emerald-800/80 px-3 py-1 rounded-full inline-block mb-2">
            República Bolivariana de Venezuela · Alcaldía del Municipio José Laurencio Silva
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Validación Digital de Contribuyente
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg mx-auto">
            Consulta unificada de solvencia y estado fiscal para <strong className="text-white">Aseo Urbano</strong>, <strong className="text-white">Catastro</strong> y <strong className="text-white">Hacienda Municipal</strong>.
          </p>
        </div>

        {/* Buscador manual (oculto si ya se cargó directamente un contribuyente o certificado por QR) */}
        {(!contribuyenteInfo && !solvencia) && (
          <div className="bg-slate-950 p-6 rounded-2xl shadow-xl border border-slate-800 mb-8 space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Código del Contribuyente, RIF, Cédula o Nro. Certificado:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Ej. N-14340, V-987456322, J-312097921 o SOL-..."
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(codigo)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 text-sm text-white font-mono placeholder-slate-500"
                />
              </div>
              <button 
                onClick={() => handleSearch(codigo)}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 text-sm shadow-lg shadow-emerald-600/20"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Consultar
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950/60 border border-red-800 p-5 rounded-2xl text-red-200 shadow-lg flex items-start gap-3 mb-8">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white">Registro No Encontrado</h3>
              <p className="text-xs text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── VISTA UNIFICADA DEL CONTRIBUYENTE ── */}
        {contribuyenteInfo && solvenciaStatus && (
          <div className="bg-slate-950 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative mb-8">
            
            {/* Header del Contribuyente */}
            <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-xl">
                  {contribuyenteInfo.clasificacion?.toUpperCase().includes('RESIDENCIAL') ? '🏠' : '🏪'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                      Padrón General
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {contribuyenteInfo.codigo}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                    {contribuyenteInfo.contribuyente}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono text-slate-400 block">Identificación Oficial</span>
                <span className="text-sm font-mono font-bold text-white bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700 inline-block">
                  {contribuyenteInfo.identidad}
                </span>
              </div>
            </div>

            {/* BANNER INSTITUCIONAL PERMANENTE: CONDICIÓN FISCAL / BLOQUEO POR MOROSIDAD (APLICA PARA TODOS LOS TRÁMITES) */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/60">
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                solvenciaStatus.solvente
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-800 text-rose-200'
              }`}>
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    solvenciaStatus.solvente ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {solvenciaStatus.solvente ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        Condición Tributaria Municipal
                      </span>
                      <span className="text-xs font-mono font-bold">
                        {solvenciaStatus.solvente ? 'SOLVENTE' : 'MOROSO'}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white mt-1">
                      {solvenciaStatus.solvente 
                        ? 'HABILITADO PARA TODOS LOS TRÁMITES MUNICIPALES'
                        : 'BLOQUEO GENERAL DE TRÁMITES POR MOROSIDAD EN ASEO'
                      }
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {solvenciaStatus.solvente
                        ? 'El contribuyente se encuentra al día con la tasa de Aseo Urbano. Habilitado para solicitar solvencias, trámites de Catastro, permisos comerciales y licencias en Hacienda.'
                        : 'El contribuyente presenta deuda pendiente en el Servicio de Aseo Urbano. Conforme a la Ordenanza Municipal, no podrá realizar trámites de Catastro (Fichas/Derecho de Frente) ni gestiones tributarias en Hacienda hasta regularizar su cuenta.'
                      }
                    </p>
                  </div>
                </div>

                {!solvenciaStatus.solvente && (
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] uppercase font-bold text-rose-300 block">Deuda Pendiente:</span>
                    <span className="text-base font-black text-white font-mono bg-rose-900/60 border border-rose-700/80 px-3 py-1 rounded-xl inline-block mt-0.5">
                      Bs. {solvenciaStatus.montoDeuda.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* SELECTOR DE MÓDULOS: ASEO URBANO | CATASTRO | HACIENDA */}
            <div className="p-4 bg-slate-900/40 border-b border-slate-800">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                Seleccione el Módulo para consultar su información tributaria:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setModuloActivo('aseo')}
                  className={`py-3 px-3 rounded-2xl font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-2 transition-all border ${
                    moduloActivo === 'aseo'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Aseo Urbano</span>
                </button>

                <button
                  onClick={() => setModuloActivo('catastro')}
                  className={`py-3 px-3 rounded-2xl font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-2 transition-all border ${
                    moduloActivo === 'catastro'
                      ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Catastro</span>
                </button>

                <button
                  onClick={() => setModuloActivo('hacienda')}
                  className={`py-3 px-3 rounded-2xl font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-2 transition-all border ${
                    moduloActivo === 'hacienda'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  <span>Hacienda</span>
                </button>
              </div>
            </div>

            {/* CONTENIDO ESPECÍFICO SEGÚN MÓDULO SELECCIONADO */}
            <div className="p-6 space-y-6">

              {/* 1. MÓDULO ASEO URBANO */}
              {moduloActivo === 'aseo' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                    solvenciaStatus.solvente 
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' 
                      : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      {solvenciaStatus.solvente ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-wide">
                          {solvenciaStatus.solvente ? 'SOLVENTE EN ASEO URBANO' : 'DEUDA PENDIENTE EN ASEO URBANO'}
                        </h4>
                        <p className="text-xs opacity-80 mt-0.5">{solvenciaStatus.detalles}</p>
                      </div>
                    </div>

                    <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-950 border border-slate-800 font-bold">
                      {solvenciaStatus.solvente ? 'AL DÍA' : `${solvenciaStatus.facturasPendientes} Recibo(s)`}
                    </span>
                  </div>

                  {/* Tarjetas de Métricas de Aseo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Deuda Total Aseo Urbano
                      </span>
                      <span className={`text-2xl font-black mt-1 block font-mono ${
                        solvenciaStatus.solvente ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        Bs. {solvenciaStatus.montoDeuda.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Facturas Pendientes
                      </span>
                      <span className="text-sm font-bold text-white mt-1 block">
                        {solvenciaStatus.solvente ? '0 Facturas (Sin deuda pendiente)' : `${solvenciaStatus.facturasPendientes} recibo(s) pendiente(s)`}
                      </span>
                    </div>
                  </div>

                  {/* Facturas Pendientes si tiene deuda */}
                  {!solvenciaStatus.solvente && solvenciaStatus.facturas && solvenciaStatus.facturas.length > 0 && (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
                      <div className="bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Facturas Pendientes de Cobro
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 text-xs">
                        {solvenciaStatus.facturas.map((f: any, idx: number) => (
                          <div key={idx} className="p-3 flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-white">{f.referencia}</span>
                              <span className="text-[11px] text-slate-400 block">Vence: {f.vencimiento || 'N/A'}</span>
                            </div>
                            <span className="font-bold text-rose-400 font-mono">
                              Bs. {parseFloat(f.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enlace a Cobro Móvil solo si tiene deuda de aseo */}
                  {!solvenciaStatus.solvente && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h5 className="font-black text-sm">Pagar Deuda de Aseo en Línea</h5>
                          <p className="text-xs text-emerald-100">Cancela por Pago Móvil o Transferencia con recibo inmediato</p>
                        </div>
                      </div>
                      <Link
                        href={`/cobro-movil?identidad=${encodeURIComponent(contribuyenteInfo.identidad)}`}
                        className="w-full sm:w-auto px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
                      >
                        Ir a Cobro Móvil
                        <ArrowRight className="w-4 h-4 text-emerald-700" />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* 2. MÓDULO CATASTRO MUNICIPAL */}
              {moduloActivo === 'catastro' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl bg-orange-950/40 border border-orange-800/80 text-orange-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Compass className="w-6 h-6 text-orange-400 shrink-0" />
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-wide">
                          Ficha Predial y Catastro Municipal
                        </h4>
                        <p className="text-xs text-orange-300/80 mt-0.5">
                          Inmuebles Urbanos y Derecho de Frente de Silva
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-950 rounded-full border border-orange-800 text-orange-300">
                      CATASTRO
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Código Catastral / Parcela</span>
                      <span className="text-base font-bold text-white font-mono mt-1 block">
                        {contribuyenteInfo.inmuebles[0]?.inmueble || contribuyenteInfo.codigo || 'PARCELA URBANA'}
                      </span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tipología y Uso</span>
                      <span className="text-sm font-bold text-white mt-1 block">
                        {contribuyenteInfo.clasificacion || 'Residencial / Comercial'}
                      </span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 sm:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dirección Predial</span>
                      <span className="text-xs font-medium text-slate-300 mt-1 block">
                        📍 {contribuyenteInfo.direccion}
                      </span>
                    </div>
                  </div>

                  {/* Unidades inmobiliarias desglosadas */}
                  {contribuyenteInfo.inmuebles && contribuyenteInfo.inmuebles.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                        Predios / Inmuebles Registrados ({contribuyenteInfo.inmuebles.length})
                      </span>
                      <div className="space-y-2">
                        {contribuyenteInfo.inmuebles.map((inm: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-white block">{inm.inmueble || `Parcela ${idx+1}`}</span>
                              <span className="text-[11px] text-slate-400">{inm.actividad_principal || inm.clasificacion}</span>
                            </div>
                            <span className="text-[10px] font-mono text-orange-400 bg-orange-950/60 border border-orange-900 px-2 py-0.5 rounded">
                              Sector {inm.sector || contribuyenteInfo.sector}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. MÓDULO HACIENDA MUNICIPAL */}
              {moduloActivo === 'hacienda' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/80 text-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Landmark className="w-6 h-6 text-blue-400 shrink-0" />
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-wide">
                          Registro de Hacienda y Actividades Económicas
                        </h4>
                        <p className="text-xs text-blue-300/80 mt-0.5">
                          Tributación Municipal · Impuesto sobre Actividades Económicas (ISAE)
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-950 rounded-full border border-blue-800 text-blue-300">
                      HACIENDA
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Número de Patente / Licencia</span>
                      <span className="text-base font-bold text-white font-mono mt-1 block">
                        {contribuyenteInfo.patente !== 'N/A' ? contribuyenteInfo.patente : `LIC-${contribuyenteInfo.codigo}`}
                      </span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ramo de Actividad Económica</span>
                      <span className="text-xs font-bold text-white mt-1 block truncate">
                        {contribuyenteInfo.actividad || 'Actividad Comercial / Mercantil'}
                      </span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teléfono de Contacto</span>
                      <span className="text-xs font-semibold text-slate-300 mt-1 block">
                        {contribuyenteInfo.telefono}
                      </span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correo Electrónico Fiscal</span>
                      <span className="text-xs font-semibold text-slate-300 mt-1 block truncate">
                        {contribuyenteInfo.correo}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pie Institucional Compartido */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                <span>Alcaldía del Municipio Silva · Validación Oficial de Contribuyentes</span>
                <span className="font-mono text-emerald-400 font-semibold">Sistema Interconectado Tripartito</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Vista si es un Certificado Emitido (SOL-...) */}
        {solvencia && (
          <div className="bg-slate-950 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative">
            {solvencia.vencida && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none opacity-20 overflow-hidden">
                <span className="text-[120px] font-black text-red-500 -rotate-45 tracking-widest leading-none">
                  VENCIDA
                </span>
              </div>
            )}

            <div className="bg-slate-900 p-6 text-white flex items-center justify-between relative z-20 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-blue-400" />
                <div>
                  <h2 className="text-lg font-bold tracking-wide">CERTIFICADO MUNICIPAL OFICIAL</h2>
                  <p className="text-sm text-slate-400 font-mono">{solvencia.codigo}</p>
                </div>
              </div>
              <div>
                {solvencia.vencida ? (
                  <span className="inline-flex items-center gap-1.5 bg-red-950 text-red-300 border border-red-800 px-4 py-1.5 rounded-full text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" /> VENCIDA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold">
                    <CheckCircle className="w-4 h-4" /> VIGENTE
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Contribuyente</span>
                  <span className="text-base font-bold text-white mt-1 block">{solvencia.contribuyente}</span>
                  <span className="text-xs font-mono text-slate-400">{solvencia.identidad || 'N/A'}</span>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Tipo de Trámite</span>
                  <span className="text-base font-bold text-white mt-1 block">{solvencia.tipo}</span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Vence: {new Date(solvencia.vencimiento).toLocaleDateString('es-VE')}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 text-justify leading-relaxed">
                Este certificado digital hace constar que el contribuyente antes mencionado se encuentra registrado en los sistemas tributarios de la Alcaldía del Municipio Silva y sus obligaciones correspondientes han sido verificadas electrónicamente.
              </div>
            </div>
          </div>
        )}

        {/* Modal Emergente para pedir la letra del operador al escanear QR */}
        {showOperadorModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 mx-auto flex items-center justify-center text-3xl font-black shadow-lg shadow-purple-500/20">
                  {operadorLetraInput.trim() ? operadorLetraInput.trim().toUpperCase().charAt(0) : 'O'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Identificación de Fiscal / Operador
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Indica tu letra inicial o distintivo para marcar este punto en morado en la Sala Situacional.
                  </p>
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    maxLength={2}
                    value={operadorLetraInput}
                    onChange={(e) => setOperadorLetraInput(e.target.value.toUpperCase())}
                    placeholder="Ej. O, D, J..."
                    className="w-24 text-center text-2xl font-black py-3 bg-slate-950 border-2 border-purple-500 text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/30 font-mono tracking-widest uppercase mx-auto block"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOperadorModal(false);
                      if (pendingContribuyente) registrarEscaneoEnAuditoria(pendingContribuyente, 'O');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-all"
                  >
                    Omitir (Usar O)
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarLetraOperador}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg shadow-purple-600/30 transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ValidarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    }>
      <ValidarContent />
    </Suspense>
  );
}
