'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Award, CheckCircle, AlertTriangle, Search, Loader2, Building, MapPin, Phone, Mail, FileCheck, XCircle } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { verificarSolvenciaAseo, SolvenciaStatus } from '@/lib/solvenciaAseo';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function ValidarContent() {
  const searchParams = useSearchParams();
  const initialCodigo = searchParams.get('codigo') || searchParams.get('rif') || searchParams.get('identidad') || searchParams.get('id') || '';
  
  const [codigo, setCodigo] = useState(initialCodigo);
  const [isLoading, setIsLoading] = useState(!!initialCodigo);
  const [solvencia, setSolvencia] = useState<any>(null);
  const [contribuyenteInfo, setContribuyenteInfo] = useState<any>(null);
  const [solvenciaStatus, setSolvenciaStatus] = useState<SolvenciaStatus | null>(null);
  const [error, setError] = useState('');

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
        .limit(10);

      if (inmsByCod && inmsByCod.length > 0) {
        inms = inmsByCod;
      } else {
        const { data: inmsById } = await supabase
          .from('inmuebles')
          .select('*')
          .or(`identidad.eq.${query},identidad.eq.${queryLimpia},identidad.eq.${queryConGuion}`)
          .limit(10);
        if (inmsById && inmsById.length > 0) {
          inms = inmsById;
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
        inmuebles: inms,
        estadoGeneral: mainInm.estado || 'Activo'
      });
      setSolvenciaStatus(status);

    } catch (e: any) {
      console.error(e);
      setError('Error al conectar con la base de datos municipal.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center gap-4 mb-6">
            <div className="relative w-24 h-24">
              <Image src="/images/logo_isma.png" alt="Logo ISMA" fill className="object-contain" />
            </div>
            <div className="relative w-24 h-24">
              <Image src="/images/logo_alcaldia.png" alt="Logo Alcaldia" fill className="object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Validación de Certificados
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Sistema de Verificación de Solvencias Municipales
          </p>
        </div>

        {/* Buscador manual por si entran sin QR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-2">Código del Contribuyente, RIF o Certificado</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Ej. N-14340, V-987456322, J-312097921 o SOL-..."
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(codigo)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-lg"
              />
            </div>
            <button 
              onClick={() => handleSearch(codigo)}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-lg font-bold transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              Consultar
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg shadow-sm flex items-start gap-4 mb-8">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-red-800">Certificado Inválido</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 1. Vista de Solvencia / Estado del Contribuyente (por QR de Contribuyente) */}
        {contribuyenteInfo && solvenciaStatus && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative mb-8">
            {/* Encabezado con estado Solvente / Con Deuda */}
            <div className={`p-6 text-white flex flex-wrap items-center justify-between gap-4 relative z-20 ${
              solvenciaStatus.solvente ? 'bg-emerald-700' : 'bg-rose-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                      Padrón Municipal
                    </span>
                    <span className="text-xs font-mono opacity-80">
                      CÓD: {contribuyenteInfo.codigo}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight mt-0.5">
                    {contribuyenteInfo.contribuyente}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {solvenciaStatus.solvente ? (
                  <span className="inline-flex items-center gap-2 bg-white text-emerald-800 px-5 py-2 rounded-xl text-sm font-black shadow-md uppercase tracking-wider">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    SOLVENTE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 bg-white text-rose-800 px-5 py-2 rounded-xl text-sm font-black shadow-md uppercase tracking-wider">
                    <XCircle className="w-5 h-5 text-rose-600" />
                    CON DEUDA PENDIENTE
                  </span>
                )}
              </div>
            </div>

            {/* Banner de Estado */}
            <div className={`px-6 py-3 border-b text-sm font-medium flex items-center justify-between ${
              solvenciaStatus.solvente 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-100' 
                : 'bg-rose-50 text-rose-900 border-rose-100'
            }`}>
              <span>{solvenciaStatus.detalles}</span>
              <span className="font-bold text-xs">
                Verificado el: {new Date().toLocaleDateString('es-VE')} {new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Datos detallados del Contribuyente */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">R.I.F. / Identificación</p>
                  <p className="text-base font-bold text-slate-800">{contribuyenteInfo.identidad}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clasificación de Uso</p>
                  <p className="text-base font-bold text-slate-800">{contribuyenteInfo.clasificacion}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Teléfono Registrado</p>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {contribuyenteInfo.telefono}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Correo Electrónico</p>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {contribuyenteInfo.correo}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 md:col-span-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dirección / Parcela</p>
                  <p className="text-sm font-medium text-slate-700 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    {contribuyenteInfo.direccion}
                  </p>
                </div>
              </div>

              {/* Resumen Financiero de Solvencia */}
              <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-slate-500" />
                    Estado de Cuenta en Aseo Urbano
                  </h4>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    solvenciaStatus.solvente ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {solvenciaStatus.solvente ? 'Al Día' : `${solvenciaStatus.facturasPendientes} Recibo(s) pendiente(s)`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Deuda Pendiente (Bs.)</span>
                    <span className={`text-lg font-black ${solvenciaStatus.solvente ? 'text-emerald-600' : 'text-rose-600'}`}>
                      Bs. {solvenciaStatus.montoDeuda.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Condición Fiscal</span>
                    <span className="text-sm font-bold text-slate-800">
                      {solvenciaStatus.solvente ? 'Habilitado para Trámites' : 'Requiere Regularización'}
                    </span>
                  </div>
                </div>

                {/* Si tiene recibos pendientes, listar */}
                {!solvenciaStatus.solvente && solvenciaStatus.facturas && solvenciaStatus.facturas.length > 0 && (
                  <div className="mt-4 border border-rose-200 rounded-lg overflow-hidden">
                    <div className="bg-rose-100/60 px-3 py-1.5 text-[11px] font-bold text-rose-800 uppercase">
                      Detalle de Facturas Pendientes
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-white divide-y divide-slate-100">
                      {solvenciaStatus.facturas.map((f: any, idx: number) => (
                        <div key={idx} className="px-3 py-2 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-slate-700">{f.referencia}</span>
                            <span className="text-[10px] text-slate-400 block">Vencimiento: {f.vencimiento || 'N/A'}</span>
                          </div>
                          <span className="font-bold text-rose-700">
                            Bs. {parseFloat(f.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Inmuebles / Actividades Asociadas */}
              {contribuyenteInfo.inmuebles && contribuyenteInfo.inmuebles.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Inmuebles / Unidades Registradas ({contribuyenteInfo.inmuebles.length})
                  </h4>
                  <div className="space-y-2">
                    {contribuyenteInfo.inmuebles.map((inm: any, i: number) => (
                      <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{inm.inmueble || `Unidad ${i+1}`}</span>
                          <span className="text-slate-500 block text-[11px]">{inm.actividad_principal || inm.clasificacion}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {inm.mmv_mes || 0} MMV/mes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pie institucional */}
              <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                <span>Alcaldía del Municipio Silva · Dirección de Aseo Urbano e ISMA</span>
                <span className="font-mono">Verificación Oficial en Línea</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Vista de Certificado emitido (SOL-...) */}
        {solvencia && (
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden relative">
            {solvencia.vencida && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none opacity-20 overflow-hidden">
                <span className="text-[120px] font-black text-red-600 -rotate-45 tracking-widest leading-none">
                  VENCIDA
                </span>
              </div>
            )}

            <div className="bg-slate-800 p-6 text-white flex items-center justify-between relative z-20">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-blue-400" />
                <div>
                  <h2 className="text-xl font-bold tracking-wide">CERTIFICADO MUNICIPAL</h2>
                  <p className="text-sm text-slate-300 font-mono">{solvencia.codigo}</p>
                </div>
              </div>
              <div className="text-right">
                {solvencia.vencida ? (
                  <span className="inline-flex items-center gap-1.5 bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                    <AlertTriangle className="w-4 h-4" /> VENCIDA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                    <CheckCircle className="w-4 h-4" /> VIGENTE
                  </span>
                )}
              </div>
            </div>

            <div className="p-8 relative z-20 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Datos del Contribuyente</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Razón Social</p>
                      <p className="font-bold text-slate-800 text-lg leading-tight">{solvencia.contribuyente}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Identificación / RIF</p>
                      <p className="font-semibold text-slate-700">{solvencia.identidad || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Detalles del Documento</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Tipo de Trámite</p>
                      <p className="font-bold text-slate-800">{solvencia.tipo}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Emitido</p>
                        <p className="font-semibold text-slate-700">{new Date(solvencia.emision).toLocaleDateString('es-VE')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Vencimiento</p>
                        <p className={`font-bold ${solvencia.vencida ? 'text-red-600' : 'text-slate-700'}`}>
                          {new Date(solvencia.vencimiento).toLocaleDateString('es-VE')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <p className="text-sm text-slate-600 text-justify leading-relaxed">
                  Este certificado digital hace constar que el contribuyente antes mencionado se encuentra 
                  registrado en nuestros sistemas y sus obligaciones tributarias correspondientes al tipo 
                  de certificado emitido han sido verificadas electrónicamente por la Alcaldía.
                </p>
                <div className="mt-6 flex justify-between items-end">
                  <p className="text-xs text-slate-400 font-mono">
                    ID Transacción:<br/>{solvencia.id}-{new Date(solvencia.created_at).getTime()}
                  </p>
                  <p className="text-[10px] text-slate-400 italic max-w-xs text-right">
                    Documento validado automáticamente a través de la plataforma en línea de la alcaldía.
                  </p>
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    }>
      <ValidarContent />
    </Suspense>
  );
}
