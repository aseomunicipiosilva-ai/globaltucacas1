'use client';
import { useState } from 'react';
import { Mail, Send, CheckCircle2 } from 'lucide-react';

export default function CorreosCatastroPage() {
  const [destinatarios, setDestinatarios] = useState<'Todos' | 'Residencial' | 'Comercial' | 'Industrial'>('Residencial');
  const [asunto, setAsunto] = useState('Boleta de Derecho de Frente Inmobiliario - Catastro Silva');
  const [mensaje, setMensaje] = useState(
    'Estimado propietario, la Dirección de Catastro Municipal del Municipio Silva le notifica la emisión de su boleta de Derecho de Frente. Recuerde que para tramitar certificados y cédulas catastrales debe encontrarse solvente con el Aseo Urbano.'
  );
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = () => {
    setEnviando(true);
    setTimeout(() => {
      setEnviando(false);
      setEnviado(true);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-stone-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Mail className="w-7 h-7 text-orange-400" />
          Emisión de Boletas y Avisos por Correo • Catastro
        </h1>
        <p className="text-xs text-stone-400 mt-1">
          Envío de avalúos, cédulas catastrales y estados de cuenta a propietarios de inmuebles.
        </p>
      </div>

      <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-300 uppercase mb-2">Segmento Inmobiliario:</label>
          <div className="flex gap-2">
            {(['Residencial', 'Comercial', 'Industrial', 'Todos'] as const).map(seg => (
              <button
                key={seg}
                type="button"
                onClick={() => setDestinatarios(seg)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  destinatarios === seg ? 'bg-orange-600 text-white shadow-md' : 'bg-stone-900 text-stone-400 hover:text-white'
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-300 uppercase mb-2">Asunto:</label>
          <input
            type="text"
            value={asunto}
            onChange={e => setAsunto(e.target.value)}
            className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-300 uppercase mb-2">Mensaje:</label>
          <textarea
            rows={6}
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            className="w-full p-4 bg-stone-900 border border-stone-700 rounded-xl text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {enviado && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Boletas y avisos enviados a los propietarios del segmento {destinatarios}.
          </div>
        )}

        <button
          onClick={enviar}
          disabled={enviando}
          className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {enviando ? 'Enviando boletas...' : 'Enviar Avisos Catastrales'}
        </button>
      </div>
    </div>
  );
}
