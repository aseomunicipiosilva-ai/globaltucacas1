'use client';
import React, { useState, useEffect } from 'react';
import { Tabs } from '@/components/Tabs';
import { Mail, Settings, Users, Send, CheckCircle, Loader2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CorreosPage() {
  const [asunto, setAsunto] = useState('Notificación Oficial - Estado de Cuenta Semanal | ISMA Municipio Silva');
  const [contenido, setContenido] = useState(`<div style="font-family: Arial, sans-serif; color: #333;">\n  <h3>Estimado(a) {{nombre}},</h3>\n  <p>Le notificamos el estado actualizado de su cuenta y servicios de aseo urbano.</p>\n  <p>Consulte su deuda y descargue su recibo ingresando al Portal del Contribuyente.</p>\n</div>`);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultMsg, setResultMsg] = useState<{ type: 'ok' | 'err'; title: string; desc: string } | null>(null);
  const [testEmail, setTestEmail] = useState('davidzara66@gmail.com');
  const [isTestMode, setIsTestMode] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);

  useEffect(() => {
    async function countEmails() {
      const { count } = await supabase
        .from('inmuebles')
        .select('id', { count: 'exact', head: true })
        .not('correo_electronico', 'is', null)
        .neq('correo_electronico', '');
      setTotalContacts(count || 630);
    }
    countEmails();
  }, []);

  const handleSend = async () => {
    if (!asunto.trim()) {
      alert("Por favor, ingrese un asunto para la campaña.");
      return;
    }
    
    if (!isTestMode && !confirm(`¿Está seguro de enviar este comunicado masivo a los ${totalContacts} contribuyentes registrados?`)) {
      return;
    }

    setIsSending(true);
    setProgress(15);
    setResultMsg(null);

    try {
      setProgress(40);
      const res = await fetch('/api/cron/email-semanal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: isTestMode,
          email: testEmail,
          asunto
        })
      });

      setProgress(85);
      const data = await res.json();
      setProgress(100);

      if (res.ok && data.success) {
        setResultMsg({
          type: 'ok',
          title: isTestMode ? '¡Correo de prueba enviado con éxito!' : '¡Envío semanal procesado exitosamente!',
          desc: isTestMode 
            ? `Enviado a ${testEmail}. Verifique su bandeja de entrada o spam.`
            : `Se procesaron ${data.enviados} correos exitosamente (${data.errores || 0} errores).`
        });
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

  const configTabContent = (
    <div className="space-y-6">
      {/* Banner de automatización semanal */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">Automatización Semanal Activa (Vercel Cron)</h4>
            <p className="text-xs text-emerald-700">Programada todos los <strong>Lunes a las 9:00 AM (VET) / 13:00 UTC</strong> hacia la ruta <code>/api/cron/email-semanal</code>.</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
          ACTIVO
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded p-4 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <Mail className="w-4 h-4" /> Redactar / Configuración de Campaña
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre Remitente</label>
            <input type="text" readOnly value="ISMA Recaudación - Municipio Silva" className="w-full border border-slate-300 bg-slate-50 rounded px-3 py-2 text-sm text-slate-700 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email Remitente Oficial</label>
            <input type="email" readOnly value="aseo.municipiosilva@globalgreenca.com" className="w-full border border-slate-300 bg-slate-50 rounded px-3 py-2 text-sm text-slate-700 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Asunto *</label>
          <input 
            type="text" 
            value={asunto}
            onChange={e => setAsunto(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 font-medium" 
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contenido de la Notificación Semanal</label>
          <textarea 
            rows={6} 
            value={contenido}
            onChange={e => setContenido(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 font-mono"
          />
          <p className="text-xs text-slate-500 mt-2">
            La plantilla oficial inyecta automáticamente la cédula/RIF, total adeudado en Bs, botones de acceso al portal y logotipos institucionales del Municipio Silva e ISMA.
          </p>
        </div>
      </div>
    </div>
  );

  const destinatariosTabContent = (
    <div className="bg-white border border-slate-200 rounded p-6 text-center text-slate-600 shadow-sm space-y-2">
      <div className="text-3xl font-bold text-emerald-600">{totalContacts}</div>
      <p className="text-sm">contribuyentes activos registrados con correo electrónico válido listos para recibir el comunicado semanal.</p>
    </div>
  );

  const tabs = [
    { id: 'configurar', label: 'Configurar y Probar', icon: <Settings className="w-4 h-4" />, content: configTabContent },
    { id: 'destinatarios', label: 'Destinatarios', icon: <Users className="w-4 h-4" />, content: destinatariosTabContent },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-emerald-700" />
          <h1 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
            Automatización de Envíos Masivos (ISMA)
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Conexión API Resend & Cron Vercel
        </div>
      </div>

      {resultMsg && (
        <div className={`px-4 py-3 rounded-lg border shadow-sm flex items-start gap-3 ${
          resultMsg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {resultMsg.type === 'ok' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
          <div>
            <h4 className="font-bold text-sm">{resultMsg.title}</h4>
            <p className="text-xs mt-0.5">{resultMsg.desc}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Contenido principal */}
        <div className="w-full lg:w-3/4">
          <Tabs tabs={tabs} />
        </div>

        {/* Panel lateral de ejecución */}
        <div className="w-full lg:w-1/4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Modo de Ejecución</h3>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                <input 
                  type="radio" 
                  name="modo" 
                  checked={isTestMode} 
                  onChange={() => setIsTestMode(true)}
                  className="accent-emerald-600"
                />
                Prueba Controlada (1 Destinatario)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                <input 
                  type="radio" 
                  name="modo" 
                  checked={!isTestMode} 
                  onChange={() => setIsTestMode(false)}
                  className="accent-emerald-600"
                />
                Envío Masivo Oficial ({totalContacts})
              </label>
            </div>

            {isTestMode && (
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Correo de Prueba:</label>
                <input 
                  type="email" 
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-500 font-mono"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            )}

            <button 
              onClick={handleSend}
              disabled={isSending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Procesando Lote...</>
              ) : (
                <><Send className="w-4 h-4" /> {isTestMode ? 'Enviar Correo de Prueba' : 'Ejecutar Envío Masivo'}</>
              )}
            </button>

            {isSending && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Enviando...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
