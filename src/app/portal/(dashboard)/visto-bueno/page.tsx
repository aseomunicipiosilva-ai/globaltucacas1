'use client';
import { ShieldCheck, Upload, Send, FileText } from 'lucide-react';

export default function VistoBuenoPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700 uppercase flex items-center gap-2 text-sm">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            SOLICITUD DE VISTO BUENO AMBIENTAL
          </h2>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <p className="text-sm text-slate-600">
            El Visto Bueno Ambiental es un requisito indispensable para la obtención o renovación de la Licencia de Actividades Económicas y permisos de construcción. Por favor, complete la información y adjunte los recaudos exigidos.
          </p>
        </div>

        <form className="p-6 space-y-8" onSubmit={(e) => e.preventDefault()}>
          {/* Datos del Proyecto */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase mb-4 pb-2 border-b border-slate-200">1. Datos del Proyecto o Actividad</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto / Actividad Comercial *</label>
                <input type="text" className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-green-500" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción Breve de la Actividad *</label>
                <textarea rows={3} className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-green-500" required></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Solicitud *</label>
                <select className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-green-500 bg-white" required>
                  <option value="">Seleccione...</option>
                  <option value="nueva">Nueva Actividad Económica</option>
                  <option value="renovacion">Renovación</option>
                  <option value="construccion">Proyecto de Construcción</option>
                  <option value="modificacion">Modificación / Ampliación</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recaudos */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase mb-4 pb-2 border-b border-slate-200">2. Carga de Recaudos Digitales</h3>
            <p className="text-xs text-slate-500 mb-4">Todos los documentos deben estar en formato PDF y no superar los 5MB de tamaño.</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Copia del RIF Vigente</p>
                    <p className="text-xs text-slate-500">Persona natural o jurídica</p>
                  </div>
                </div>
                <label className="px-4 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
                  Examinar
                  <input type="file" className="sr-only" accept=".pdf" />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Memoria Descriptiva del Proyecto</p>
                    <p className="text-xs text-slate-500">Detallando procesos, generación de residuos y manejo propuesto</p>
                  </div>
                </div>
                <label className="px-4 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
                  Examinar
                  <input type="file" className="sr-only" accept=".pdf" />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Documento de Propiedad o Contrato de Arrendamiento</p>
                    <p className="text-xs text-slate-500">Del local o terreno donde operará</p>
                  </div>
                </div>
                <label className="px-4 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
                  Examinar
                  <input type="file" className="sr-only" accept=".pdf" />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium flex items-center gap-2 transition-colors">
              <Send className="w-4 h-4" />
              Procesar Solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
