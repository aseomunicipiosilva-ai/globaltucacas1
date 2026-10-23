'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Settings, Users, Send, CheckCircle, Loader2, 
  AlertTriangle, ShieldCheck, Eye, Search, Filter, 
  RefreshCw, FileText, Check, Phone, Sparkles, 
  RotateCcw, AlertCircle, ArrowRight
} from 'lucide-react';
import { EMAIL_TEMPLATES, EmailTemplate } from '@/lib/emailTemplates';
import { logos } from '@/lib/logosBase64';

export default function CorreosPage() {
  // Tabs: 'preview' | 'contacts' | 'config'
  const [activeTab, setActiveTab] = useState<'preview' | 'contacts' | 'config'>('preview');

  // Plantilla seleccionada
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<EmailTemplate>(EMAIL_TEMPLATES[0]);
  const [asunto, setAsunto] = useState(EMAIL_TEMPLATES[0].asuntoDefault);
  const [remitente] = useState('ISMA Aseo Urbano <aseo.municipiosilva@globalgreenca.com>');

  // Audiencia seleccionada: 'NO_SOLVENTES' | 'SOLVENTES' | 'TODOS'
  const [audiencia, setAudiencia] = useState<'NO_SOLVENTES' | 'SOLVENTES' | 'TODOS'>('NO_SOLVENTES');

  // Modo de envío: prueba o masivo
  const [isTestMode, setIsTestMode] = useState(false);
  const [testEmail, setTestEmail] = useState('davidzara66@gmail.com');

  // Métricas y datos desde la API
  const [loadingStats, setLoadingStats] = useState(true);
  const [totalContactos, setTotalContactos] = useState(651);
  const [totalNoSolventes, setTotalNoSolventes] = useState(545);
  const [totalSolventes, setTotalSolventes] = useState(106);
  const [enviadosList, setEnviadosList] = useState<string[]>([]);
  const [fallidosList, setFallidosList] = useState<{ email: string; error: string }[]>([]);
  const [destinatarios, setDestinatarios] = useState<any[]>([]);

  // Filtros en la tabla de destinatarios / monitoreo
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEnvio, setFiltroEnvio] = useState<'TODOS' | 'ENVIADOS' | 'PENDIENTES' | 'FALLIDOS'>('TODOS');
  const [filtroSolvenciaLocal, setFiltroSolvenciaLocal] = useState<'TODOS' | 'NO_SOLVENTES' | 'SOLVENTES'>('TODOS');

  // Estado de despacho
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultMsg, setResultMsg] = useState<{ type: 'ok' | 'err'; title: string; desc: string } | null>(null);

  // Cargar datos del servidor
  const cargarDatos = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/envio-comunicado');
      if (res.ok) {
        const data = await res.json();
        if (data.totalContactos) setTotalContactos(data.totalContactos);
        if (data.totalNoSolventes) setTotalNoSolventes(data.totalNoSolventes);
        if (data.totalSolventes) setTotalSolventes(data.totalSolventes);
        if (data.enviados) setEnviadosList(data.enviados);
        if (data.fallidos) setFallidosList(data.fallidos);
        if (data.destinatarios) setDestinatarios(data.destinatarios);
      }
    } catch (err) {
      console.warn('Error cargando estado de envíos:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Al cambiar de plantilla, ajustar asunto y sugerir audiencia si corresponde
  const handleSelectPlantilla = (p: EmailTemplate) => {
    setPlantillaSeleccionada(p);
    setAsunto(p.asuntoDefault);
    if (p.audienciaSugerida) {
      setAudiencia(p.audienciaSugerida);
    }
  };

  // Cálculos de audiencia según filtro
  const audienciaDestinatarios = useMemo(() => {
    return destinatarios.filter(d => {
      if (audiencia === 'NO_SOLVENTES') return d.isNoSolvente;
      if (audiencia === 'SOLVENTES') return !d.isNoSolvente;
      return true;
    });
  }, [destinatarios, audiencia]);

  const totalEnAudiencia = audienciaDestinatarios.length;
  const enviadosEnAudiencia = audienciaDestinatarios.filter(d => d.estadoEnvio === 'ENVIADO').length;
  const fallidosEnAudiencia = audienciaDestinatarios.filter(d => d.estadoEnvio === 'FALLIDO').length;
  const pendientesEnAudiencia = audienciaDestinatarios.filter(d => d.estadoEnvio === 'PENDIENTE').length;

  // Filtrado de la tabla para monitoreo
  const listaFiltradaParaTabla = useMemo(() => {
    return destinatarios.filter(d => {
      // Filtro de solvencia de la pestaña monitoreo
      if (filtroSolvenciaLocal === 'NO_SOLVENTES' && !d.isNoSolvente) return false;
      if (filtroSolvenciaLocal === 'SOLVENTES' && d.isNoSolvente) return false;

      // Filtro de estado de envío
      if (filtroEnvio === 'ENVIADOS' && d.estadoEnvio !== 'ENVIADO') return false;
      if (filtroEnvio === 'PENDIENTES' && d.estadoEnvio !== 'PENDIENTE') return false;
      if (filtroEnvio === 'FALLIDOS' && d.estadoEnvio !== 'FALLIDO') return false;

      // Búsqueda de texto (Nombre, RIF, Teléfono, Correo)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nom = (d.contribuyente || '').toLowerCase();
        const rif = (d.identidad || '').toLowerCase();
        const cor = (d.correo || '').toLowerCase();
        const tel = (d.telefono || '').toLowerCase();
        if (!nom.includes(q) && !rif.includes(q) && !cor.includes(q) && !tel.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [destinatarios, filtroSolvenciaLocal, filtroEnvio, searchQuery]);

  // Manejador de despacho
  const handleSend = async () => {
    if (!asunto.trim()) {
      alert("Por favor ingrese un asunto para la campaña.");
      return;
    }

    if (isTestMode && !testEmail.trim()) {
      alert("Por favor ingrese el correo electrónico de prueba.");
      return;
    }

    if (!isTestMode) {
      if (pendientesEnAudiencia === 0) {
        alert("Todos los destinatarios de esta audiencia ya han recibido el correo exitosamente. No hay pendientes por enviar.");
        return;
      }

      const mensajeConfirm = `¿Confirmar lanzamiento del comunicado oficial?\n\n• Plantilla: ${plantillaSeleccionada.nombre}\n• Audiencia: ${audiencia === 'NO_SOLVENTES' ? 'Solo No Solventes' : audiencia === 'SOLVENTES' ? 'Solo Solventes' : 'Todos'}\n• Destinatarios pendientes por despachar: ${pendientesEnAudiencia}\n• Omitidos (ya enviados previamente): ${enviadosEnAudiencia}\n\nEl sistema NO reenviará a quienes ya lo recibieron para evitar duplicados.`;

      if (!confirm(mensajeConfirm)) {
        return;
      }
    }

    setIsSending(true);
    setProgress(20);
    setResultMsg(null);

    try {
      setProgress(40);
      const res = await fetch('/api/admin/envio-comunicado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: isTestMode,
          email: testEmail,
          asunto: asunto,
          plantillaId: plantillaSeleccionada.id,
          audiencia: audiencia,
          soloPendientes: true // NUNCA REENVIAR A LOS YA ENVIADOS
        })
      });

      setProgress(85);
      const data = await res.json();
      setProgress(100);

      if (res.ok && data.success) {
        setResultMsg({
          type: 'ok',
          title: isTestMode 
            ? '¡Correo de prueba despachado con éxito!' 
            : '¡Despacho masivo procesado exitosamente!',
          desc: data.mensaje || `Se despacharon ${data.enviadosAhora || 0} correos a los contribuyentes pendientes.`
        });
        // Recargar datos y estado actualizado
        await cargarDatos();
      } else {
        setResultMsg({
          type: 'err',
          title: 'Error en el envío',
          desc: data.error || 'No se pudo completar el envío de correos.'
        });
      }
    } catch (err: any) {
      setResultMsg({
        type: 'err',
        title: 'Error de conexión',
        desc: err.message || 'Error al comunicarse con el servidor de correos.'
      });
    } finally {
      setIsSending(false);
    }
  };

  // Reiniciar historial de envíos
  const handleResetHistory = async () => {
    if (!confirm("¿Está seguro de reiniciar el registro de envíos?\n\nEsto marcará nuevamente a todos los contribuyentes como pendientes para comenzar una campaña desde cero.")) {
      return;
    }
    try {
      const res = await fetch('/api/admin/envio-comunicado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetHistory: true })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.mensaje);
        await cargarDatos();
      } else {
        alert(data.error || 'No se pudo reiniciar el historial');
      }
    } catch (e: any) {
      alert('Error reiniciando: ' + e.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              Módulo Administrativo
            </span>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Filtro Anti-Duplicados Activo
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
            Envíos Masivos & Notificaciones Oficiales
          </h1>
          <p className="text-sm text-slate-500">
            Despacho inteligente de comunicados por correo a contribuyentes solventes y no solventes con plantillas institucionales.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={cargarDatos}
            disabled={loadingStats}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            title="Actualizar métricas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button 
            onClick={handleResetHistory}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all"
            title="Reiniciar lista de ya enviados para nueva campaña"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reiniciar Historial</span>
          </button>
        </div>
      </div>

      {/* METRICAS GLOBALES EN TIEMPO REAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Total Contribuyentes</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800">{totalContactos}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-amber-600 font-bold">{totalNoSolventes} no solventes</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">{totalSolventes} solventes</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold mb-1">
            <span>Enviados Exitosamente</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{enviadosList.length}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {totalContactos > 0 ? ((enviadosList.length / totalContactos) * 100).toFixed(1) : 0}% del padrón notificado
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold mb-1">
            <span>Pendientes por Enviar</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">
            {Math.max(0, totalContactos - enviadosList.length)}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            Listos para recibir sin duplicados
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold mb-1">
            <span>Fallidos / Con Error</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{fallidosList.length}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">
            Reintentables en el próximo lote
          </div>
        </div>
      </div>

      {/* MENSAJE DE RESULTADO */}
      {resultMsg && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          resultMsg.type === 'ok' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {resultMsg.type === 'ok' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-bold text-sm">{resultMsg.title}</h4>
            <p className="text-xs mt-0.5 font-medium">{resultMsg.desc}</p>
          </div>
        </div>
      )}

      {/* PESTAÑAS PRINCIPALES */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'preview' 
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          Plantillas & Vista Previa
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'contacts' 
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Monitoreo de Envíos & Números ({destinatarios.length})
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'config' 
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          Filtro de Audiencia & Parámetros
        </button>
      </div>

      {/* LAYOUT PRINCIPAL DE 2 COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: CONTENIDO SEGUN PESTAÑA */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* PESTAÑA 1: PLANTILLAS Y VISTA PREVIA */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              
              {/* SELECTOR DE PLANTILLAS PRECONFIGURADAS */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Escoger Plantilla Preconfigurada
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {EMAIL_TEMPLATES.length} plantillas disponibles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EMAIL_TEMPLATES.map((tmpl) => {
                    const isSelected = plantillaSeleccionada.id === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleSelectPlantilla(tmpl)}
                        className={`text-left p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-emerald-50/60 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-bold text-xs ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {tmpl.nombre}
                          </h4>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {tmpl.descripcion}
                        </p>
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                            tmpl.audienciaSugerida === 'NO_SOLVENTES'
                              ? 'bg-amber-100 text-amber-800'
                              : tmpl.audienciaSugerida === 'SOLVENTES'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            Audiencia: {tmpl.audienciaSugerida === 'NO_SOLVENTES' ? 'No Solventes' : tmpl.audienciaSugerida === 'SOLVENTES' ? 'Solventes' : 'Todos'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CAMPO DE ASUNTO EDITABLE */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Línea de Asunto Oficial del Correo:
                </label>
                <input 
                  type="text" 
                  value={asunto}
                  onChange={e => setAsunto(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-500 outline-none shadow-xs"
                  placeholder="Asunto del correo electrónico..."
                />
              </div>

              {/* VISTA PREVIA VISUAL DEL CORREO */}
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 shadow-inner">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-[650px] mx-auto p-8 text-slate-800 space-y-5">
                  
                  {/* LOGOS OFICIALES DEL HEADER */}
                  <div className="grid grid-cols-3 items-center border-b border-slate-100 pb-5">
                    <div className="flex justify-start">
                      <img src={logos.isma} alt="ISMA" className="h-14 object-contain" />
                    </div>
                    <div className="flex justify-center">
                      <img src={logos.basura_cero} alt="Basura Cero" className="h-10 object-contain" />
                    </div>
                    <div className="flex justify-end">
                      <img src={logos.global_green} alt="Global Green" className="h-14 object-contain" />
                    </div>
                  </div>

                  {/* CONTENIDO SEGÚN LA PLANTILLA SELECCIONADA */}
                  {plantillaSeleccionada.id === 'borra_tu_deuda' && (
                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                      <p>Estimado contribuyente <strong>[Nombre del Contribuyente]</strong>,</p>
                      <p className="text-justify">
                        Por medio de la presente, la <strong>Alcaldía del Municipio Silva</strong> y el <strong>Instituto Autónomo de Aseo Urbano (ISMA)</strong> le extienden un cordial saludo y le notifican que actualmente cuenta con facturación y servicio de aseo urbano pendiente de regularización.
                      </p>

                      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 space-y-2">
                        <h4 className="font-bold text-emerald-900 text-sm text-center">
                          ⚡ PLAN ESPECIAL "BORRA TU DEUDA" - DECRETOS Nº 010 Y 011
                        </h4>
                        <ul className="list-disc pl-5 text-emerald-800 text-[11px] space-y-1">
                          <li><strong>50% de Descuento directo</strong> sobre la deuda acumulada de capital.</li>
                          <li><strong>100% de Condonación total</strong> de intereses de mora, multas y recargos.</li>
                          <li><strong>Convenios de Financiamiento</strong> flexibles fraccionados en cómodas cuotas.</li>
                          <li>Obtención inmediata de su <strong>Constancia de Solvencia</strong> al suscribir el acuerdo.</li>
                        </ul>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px]">
                        <p className="font-bold text-slate-800">DATOS BANCARIOS OFICIALES:</p>
                        <p><strong>Banco:</strong> BANCARIBE • <strong>Cta:</strong> 0114-0158-19-1580047466</p>
                        <p><strong>A Nombre:</strong> GLOBAL GREEN C.A. • <strong>RIF:</strong> J-503461280 • <strong>Pago Móvil:</strong> 0424-4045186</p>
                      </div>

                      <div className="text-center pt-2">
                        <span className="inline-block bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm text-xs">
                          Ingresar al Portal del Contribuyente →
                        </span>
                      </div>
                    </div>
                  )}

                  {plantillaSeleccionada.id === 'notificacion_deuda' && (
                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                      <p>Estimado(a) contribuyente <strong>[Nombre del Contribuyente]</strong>,</p>
                      <p className="text-justify">
                        Le informamos que el sistema municipal del <strong>ISMA</strong> registra facturas de aseo urbano pendientes de pago en su cuenta. La recaudación del aseo urbano es indispensable para asegurar las rutas de recolección y mantener las playas y calles limpias.
                      </p>

                      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                        <h4 className="font-bold text-amber-900 text-xs">
                          ⚠️ ESTATUS TRIBUTARIO: SALDO EN REVISIÓN / MORA
                        </h4>
                        <p className="text-amber-800 text-[11px] mt-1">
                          Le exhortamos a efectuar su pago y reportar la transferencia a través del Portal Web Oficial o en las oficinas de recaudación.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px]">
                        <p className="font-bold text-slate-800">CUENTAS DE RECAUDACIÓN AUTORIZADAS:</p>
                        <p><strong>Banco:</strong> BANCARIBE • <strong>Cta:</strong> 0114-0158-19-1580047466</p>
                        <p><strong>Titular:</strong> GLOBAL GREEN C.A. • <strong>RIF:</strong> J-503461280</p>
                      </div>

                      <div className="text-center pt-2">
                        <span className="inline-block bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm text-xs">
                          Ver Facturas y Declarar Pago →
                        </span>
                      </div>
                    </div>
                  )}

                  {plantillaSeleccionada.id === 'reconocimiento_solvente' && (
                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                      <p>Apreciado(a) contribuyente <strong>[Nombre del Contribuyente]</strong>,</p>
                      
                      <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-5 text-center space-y-2">
                        <span className="text-3xl block">🌟</span>
                        <h3 className="font-black text-emerald-900 text-sm">
                          ¡GRACIAS POR TU COMPROMISO CIUDADANO CON SILVA!
                        </h3>
                        <p className="text-emerald-700 font-bold text-xs">
                          Constatamos que su cuenta se encuentra actualmente 100% SOLVENTE y al día.
                        </p>
                      </div>

                      <p className="text-justify">
                        Su puntualidad y responsabilidad cívica hacen posible mantener activa la flota de camiones compactadores y la preservación ambiental de Tucacas y el Parque Nacional Morrocoy.
                      </p>

                      <p className="text-justify">
                        Puede descargar su <strong>Certificado Oficial de Solvencia Municipal</strong> de forma 100% digital y gratuita en nuestro portal.
                      </p>

                      <div className="text-center pt-2">
                        <span className="inline-block bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm text-xs">
                          Descargar mi Solvencia Municipal →
                        </span>
                      </div>
                    </div>
                  )}

                  {plantillaSeleccionada.id === 'comunicado_general' && (
                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                      <h3 className="font-bold text-slate-900 text-sm text-center border-b pb-2">
                        COMUNICADO OFICIAL INSTITUCIONAL
                      </h3>
                      <p>Estimados contribuyentes y ciudadanos del Municipio Silva:</p>
                      <p className="text-justify">
                        La Dirección General del <strong>ISMA</strong>, conjuntamente con la <strong>Alcaldía del Municipio Silva</strong>, informa las directrices activas para la optimización de los servicios públicos y disposición final de desechos sólidos.
                      </p>
                      <p className="text-justify">
                        Instamos a toda la comunidad a respetar los horarios de disposición y mantener el ornato y la limpieza de los frentes de sus inmuebles.
                      </p>
                      <div className="text-center pt-2">
                        <span className="inline-block bg-slate-900 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm text-xs">
                          Ir al Portal Institucional →
                        </span>
                      </div>
                    </div>
                  )}

                  {/* PIE INSTITUCIONAL */}
                  <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">INSTITUTO DE SERVICIOS MUNICIPALES DE ASEO URBANO (ISMA) - SILVA</p>
                    <p>Alcaldía del Municipio Autónomo Silva • Tucacas, Estado Falcón</p>
                    <p className="text-slate-400">Atención: atencion.aseourbanoms@globalgreenca.com • WhatsApp: +58 424-4045186</p>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* PESTAÑA 2: MONITOREO DE ENVÍOS Y DESTINATARIOS */}
          {activeTab === 'contacts' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Padrón de Contribuyentes & Estado de Entrega
                  </h3>
                  <p className="text-xs text-slate-500">
                    Visualice los contribuyentes notificados (con teléfonos y correos) y los pendientes por despachar.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar por RIF, nombre, teléfono o correo..."
                      className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs w-64 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* FILTROS RÁPIDOS DE ESTADO Y SOLVENCIA */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Estado de Envío:</span>
                  <button
                    onClick={() => setFiltroEnvio('TODOS')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      filtroEnvio === 'TODOS' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({destinatarios.length})
                  </button>
                  <button
                    onClick={() => setFiltroEnvio('ENVIADOS')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      filtroEnvio === 'ENVIADOS' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Enviados ({destinatarios.filter(d => d.estadoEnvio === 'ENVIADO').length})
                  </button>
                  <button
                    onClick={() => setFiltroEnvio('PENDIENTES')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      filtroEnvio === 'PENDIENTES' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    No Enviados / Pendientes ({destinatarios.filter(d => d.estadoEnvio === 'PENDIENTE').length})
                  </button>
                  <button
                    onClick={() => setFiltroEnvio('FALLIDOS')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      filtroEnvio === 'FALLIDOS' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    Fallidos ({destinatarios.filter(d => d.estadoEnvio === 'FALLIDO').length})
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Solvencia:</span>
                  <button
                    onClick={() => setFiltroSolvenciaLocal('TODOS')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${filtroSolvenciaLocal === 'TODOS' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroSolvenciaLocal('NO_SOLVENTES')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${filtroSolvenciaLocal === 'NO_SOLVENTES' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700'}`}
                  >
                    No Solventes
                  </button>
                  <button
                    onClick={() => setFiltroSolvenciaLocal('SOLVENTES')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${filtroSolvenciaLocal === 'SOLVENTES' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    Solventes
                  </button>
                </div>
              </div>

              {/* TABLA DE DESTINATARIOS */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[480px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-3.5 py-2.5">RIF / Cédula</th>
                      <th className="px-3.5 py-2.5">Contribuyente</th>
                      <th className="px-3.5 py-2.5">Teléfono / Celular</th>
                      <th className="px-3.5 py-2.5">Correo Electrónico</th>
                      <th className="px-3.5 py-2.5 text-center">Solvencia</th>
                      <th className="px-3.5 py-2.5 text-center">Estado de Envío</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {listaFiltradaParaTabla.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No se encontraron contribuyentes con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      listaFiltradaParaTabla.slice(0, 150).map((c, i) => (
                        <tr key={c.id || i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3.5 py-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {c.identidad}
                          </td>
                          <td className="px-3.5 py-2 font-semibold text-slate-800 max-w-[200px] truncate" title={c.contribuyente}>
                            {c.contribuyente}
                          </td>
                          <td className="px-3.5 py-2 whitespace-nowrap text-slate-600 font-mono">
                            {c.telefono ? (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {c.telefono}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic">S/N</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2 text-slate-600 font-mono max-w-[180px] truncate" title={c.correo}>
                            {c.correo}
                          </td>
                          <td className="px-3.5 py-2 text-center whitespace-nowrap">
                            {c.isNoSolvente ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Moroso
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Solvente
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2 text-center whitespace-nowrap">
                            {c.estadoEnvio === 'ENVIADO' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> Enviado
                              </span>
                            ) : c.estadoEnvio === 'FALLIDO' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 inline-flex items-center gap-1" title={c.errorMsg || 'Error'}>
                                <AlertTriangle className="w-3 h-3" /> Fallido
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                No Enviado (Pendiente)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {listaFiltradaParaTabla.length > 150 && (
                <p className="text-[11px] text-slate-400 text-right">
                  Mostrando primeros 150 registros de {listaFiltradaParaTabla.length} totales. Utilice el buscador para localizar un contacto específico.
                </p>
              )}

            </div>
          )}

          {/* PESTAÑA 3: CONFIGURACIÓN DETALLADA */}
          {activeTab === 'config' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
              <h3 className="font-bold text-slate-800 text-sm">
                Configuración del Servidor y Parámetros de Envío
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">Remitente Institucional:</span>
                  <div className="text-xs font-mono font-bold text-slate-800">{remitente}</div>
                  <span className="text-[10px] text-emerald-600 block mt-1">✓ Dominio y subdominio verificados</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">Lógica Anti-Duplicados:</span>
                  <div className="text-xs font-bold text-emerald-700">Activada Permanentemente</div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Cada correo enviado se almacena en el registro para evitar reenviar al mismo contribuyente.
                  </span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <h4 className="font-bold text-blue-900 text-xs">Instrucciones de Despacho Masivo:</h4>
                <ul className="text-xs text-blue-800 list-disc pl-5 space-y-1">
                  <li>Escoja la <strong>Plantilla</strong> adecuada según el objetivo (regularización de deuda, cobranza general o agradecimiento a solventes).</li>
                  <li>Seleccione la <strong>Audiencia</strong> deseada en el panel lateral (Solo Solventes, Solo No Solventes, o Todos).</li>
                  <li>Al presionar <strong>Lanzar / Reenviar</strong>, el sistema omite de forma 100% garantizada a los contribuyentes que ya recibieron el correo.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* COLUMNA DERECHA: PANEL DE CONTROL DE AUDIENCIA & LANZAMIENTO */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
            
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                <Send className="w-4 h-4 text-emerald-600" />
                Panel de Lanzamiento
              </h3>
              <p className="text-[11px] text-slate-500">
                Seleccione la audiencia objetivo y ejecute el despacho.
              </p>
            </div>

            {/* SELECTOR DE AUDIENCIA: SOLVENTES / NO SOLVENTES / TODOS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                1. Escoger Audiencia Destinataria:
              </label>

              <div className="space-y-2">
                {/* OPCION NO SOLVENTES */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  audiencia === 'NO_SOLVENTES'
                    ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="audiencia" 
                    checked={audiencia === 'NO_SOLVENTES'} 
                    onChange={() => setAudiencia('NO_SOLVENTES')}
                    className="accent-amber-600 w-4 h-4 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>Solo No Solventes (Con Deuda)</span>
                      <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[10px]">
                        {totalNoSolventes}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      Contribuyentes con facturas vencidas o saldo moroso.
                    </p>
                  </div>
                </label>

                {/* OPCION SOLVENTES */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  audiencia === 'SOLVENTES'
                    ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="audiencia" 
                    checked={audiencia === 'SOLVENTES'} 
                    onChange={() => setAudiencia('SOLVENTES')}
                    className="accent-emerald-600 w-4 h-4 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>Solo Solventes (Al Día)</span>
                      <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded text-[10px]">
                        {totalSolventes}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      Contribuyentes sin deuda activa para felicitaciones o solvencias.
                    </p>
                  </div>
                </label>

                {/* OPCION TODOS */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  audiencia === 'TODOS'
                    ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="audiencia" 
                    checked={audiencia === 'TODOS'} 
                    onChange={() => setAudiencia('TODOS')}
                    className="accent-blue-600 w-4 h-4 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <span>Todos los Contribuyentes</span>
                      <span className="px-1.5 py-0.2 bg-blue-200 text-blue-900 rounded text-[10px]">
                        {totalContactos}
                      </span>
                    </div>
                    <p className="text-[10px] text-blue-700 mt-0.5">
                      Totalidad del padrón para comunicados generales.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* RESUMEN DE LA AUDIENCIA SELECCIONADA */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                Estado de la Audiencia Seleccionada:
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                  <span className="block text-[10px] text-slate-400 font-semibold">Total</span>
                  <span className="font-bold text-slate-800 text-sm">{totalEnAudiencia}</span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="block text-[10px] text-emerald-600 font-semibold">Ya Enviados</span>
                  <span className="font-bold text-emerald-700 text-sm">{enviadosEnAudiencia}</span>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-100 shadow-2xs">
                  <span className="block text-[10px] text-amber-600 font-semibold">Por Enviar</span>
                  <span className="font-bold text-amber-700 text-sm">{pendientesEnAudiencia}</span>
                </div>
              </div>
            </div>

            {/* MODO DE ENVÍO */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block">
                2. Modo de Operación:
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestMode(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    isTestMode
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Envío de Prueba
                </button>

                <button
                  type="button"
                  onClick={() => setIsTestMode(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    !isTestMode
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Lanzamiento Masivo
                </button>
              </div>

              {/* CORREO DE PRUEBA SI ESTA ACTIVO */}
              {isTestMode && (
                <div className="space-y-1 pt-1.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Correo destinatario de prueba:
                  </label>
                  <input 
                    type="email" 
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-emerald-500"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              )}
            </div>

            {/* BOTÓN PRINCIPAL DE LANZAMIENTO */}
            <button
              onClick={handleSend}
              disabled={isSending || (!isTestMode && pendientesEnAudiencia === 0)}
              className={`w-full text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isTestMode 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : pendientesEnAudiencia === 0
                  ? 'bg-slate-400'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando Envíos ({progress}%)...</span>
                </>
              ) : isTestMode ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Prueba a {testEmail}</span>
                </>
              ) : pendientesEnAudiencia === 0 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>¡Todos los de esta audiencia ya fueron notificados!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {enviadosEnAudiencia > 0 
                      ? `Reenviar a los ${pendientesEnAudiencia} Pendientes` 
                      : `Lanzar Masivo a ${pendientesEnAudiencia} Destinatarios`}
                  </span>
                </>
              )}
            </button>

            {/* BARRA DE PROGRESO DE ENVÍO */}
            {isSending && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Despachando lotes...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* SELLO DE PROTECCIÓN ANTI-DUPLICADOS */}
            <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Garantía Anti-Duplicados
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                Al reenviar, el motor excluye automáticamente a los {enviadosEnAudiencia} correos que ya fueron enviados con éxito.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
