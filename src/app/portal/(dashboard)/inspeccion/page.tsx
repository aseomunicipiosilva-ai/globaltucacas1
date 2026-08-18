'use client';
import { SearchCheck, Send, Calendar } from 'lucide-react';

export default function InspeccionPage() {
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

        <form className="p-6 space-y-6" onSubmit={(e) => e.preventDefault()}>
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

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2 transition-colors">
              <Send className="w-4 h-4" />
              Solicitar Inspección
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
