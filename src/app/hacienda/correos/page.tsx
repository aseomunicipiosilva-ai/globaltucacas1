'use client';
import { useState } from 'react';
import { Mail, Send, CheckCircle2, Users, AlertTriangle } from 'lucide-react';

export default function CorreosHaciendaPage() {
  const [destinatarios, setDestinatarios] = useState<'Todos' | 'Comercial' | 'Industrial' | 'Morosos'>('Comercial');
  const [asunto, setAsunto] = useState('Notificación de Obligaciones Tributarias - Hacienda Silva');
  const [mensaje, setMensaje] = useState(
    'Estimado contribuyente, se le recuerda que el período para la declaración mensual del ISAE y renovación de licencias se encuentra activo. Recuerde que para procesar sus trámites debe encontrarse solvente con el Aseo Urbano Municipal.'
  );
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviarMasivo = () => {
    setEnviando(true);
    setTimeout(() => {
      setEnviando(false);
      setEnviado(true);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Mail className="w-7 h-7 text-sky-400" />
          Emisión Masiva de Notificaciones por Correo
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Envío de estados de cuenta tributarios, circulares de hacienda y recordatorios de solvencia.
        </p>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Segmento de Contribuyentes:</label>
          <div className="flex gap-2">
            {(['Comercial', 'Industrial', 'Morosos', 'Todos'] as const).map(seg => (
              <button
                key={seg}
                type="button"
                onClick={() => setDestinatarios(seg)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  destinatarios === seg ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Asunto:</label>
          <input
            type="text"
            value={asunto}
            onChange={e => setAsunto(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Cuerpo del Mensaje:</label>
          <textarea
            rows={6}
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {enviado && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Campaña enviada exitosamente a los contribuyentes del segmento seleccionado.
          </div>
        )}

        <button
          onClick={enviarMasivo}
          disabled={enviando}
          className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {enviando ? 'Enviando correos...' : 'Enviar Comunicado Masivo'}
        </button>
      </div>
    </div>
  );
}
