'use client';
import { SearchCheck, Send, Calendar, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppContext } from '@/store/AppContext';

export default function InspeccionPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const appContext = useAppContext();

  // Tarifa plana para inspección técnica: 3 TCMV
  const [tasaBcv, setTasaBcv] = useState<number>(0);

  useEffect(() => {
    fetch('/api/bcv')
      .then(res => res.json())
      .then(data => {
        if (data && data.tcmmv) {
          setTasaBcv(data.tcmmv);
        }
      })
      .catch(err => console.error("Error fetching BCV:", err));
  }, []);
  const tarifaTCMV = 3;
  const costoTotalBs = (tarifaTCMV * tasaBcv).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appContext) return;
    
    setIsSubmitting(true);
    
    const nuevaFactura = {
      contribuyente: 'Contribuyente Demo',
      monto: costoTotalBs,
      referencia: `INSP-TEC-${Math.floor(Math.random() * 10000)}`,
      estado: 'Pendiente'
    };

    try {
      await appContext.addFactura(nuevaFactura);
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-blue-200 p-10 text-center">
        <CheckCircle2 className="w-20 h-20 text-blue-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Inspección Solicitada!</h2>
        <p className="text-slate-600 mb-6">
          Su solicitud de inspección técnica fue registrada. El cargo administrativo de <strong>{costoTotalBs} Bs</strong> ha sido generado.
        </p>
        <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg inline-block border border-slate-100">
          Por favor, proceda a la sección <strong>PAGAR</strong> para cancelar el tributo. Una vez confirmado, los fiscales ambientales serán asignados a su caso.
        </p>
        <div className="mt-8">
          <button onClick={() => setIsSuccess(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium transition-colors">
            Nueva Solicitud
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700 uppercase flex items-center gap-2 text-sm">
            <SearchCheck className="w-5 h-5 text-blue-600" />
            SOLICITUD DE INSPECCIÓN TÉCNICA
          </h2>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <p className="text-sm text-slate-600">
            Utilice este formulario para solicitar la visita de los fiscales ambientales del Instituto Municipal del Ambiente (IMA) para evaluaciones, conformidades o revisión de casos específicos en su inmueble o comunidad.
          </p>
        </div>

        <form className="p-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de la Inspección *</label>
              <select className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500 bg-white" required>
                <option value="">Seleccione el motivo...</option>
                <option value="arboles">Evaluación de riesgo por árboles (Poda/Tala)</option>
                <option value="contaminacion">Foco de contaminación o botadero clandestino</option>
                <option value="verificacion">Verificación para Visto Bueno Ambiental</option>
                <option value="comercio">Inspección de local comercial / industrial</option>
                <option value="otros">Otros motivos</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción Detallada *</label>
              <textarea rows={4} className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="Explique brevemente la situación que requiere inspección..." required></textarea>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Exacta para la Inspección *</label>
              <input type="text" className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="Sector, Calle, Avenida, Nro de Casa/Local, Referencia" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Persona Contacto en el Sitio *</label>
              <input type="text" className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono de Contacto *</label>
              <input type="text" className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Disponibilidad de Horario (Referencial)</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                <select className="flex-1 text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="cualquiera">Cualquier horario hábil (Lunes a Viernes 8am - 4pm)</option>
                  <option value="manana">Solo mañanas (8:00 AM - 12:00 PM)</option>
                  <option value="tarde">Solo tardes (1:00 PM - 4:00 PM)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col items-end">
            <span className="text-sm font-medium text-slate-500">Tasa Administrativa por Inspección</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {costoTotalBs} Bs
            </div>
            <span className="text-xs text-slate-400 mt-1">Equivalente a {tarifaTCMV} TCMV</span>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded font-medium flex items-center gap-2 transition-colors">
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Procesando...' : 'Generar Pago y Solicitar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
