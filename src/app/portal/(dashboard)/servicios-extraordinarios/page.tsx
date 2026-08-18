'use client';
import { Truck, Upload, AlertCircle, Send } from 'lucide-react';
import { useState } from 'react';

export default function ServiciosExtraordinariosPage() {
  const [tipo, setTipo] = useState('');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Sobre los Servicios Extraordinarios (Art. 50-52)</p>
          <p>
            Este servicio aplica para residuos que por sus dimensiones, peso o naturaleza no pueden ser recolectados por el servicio ordinario. 
            Incluye escombros, desechos vegetales (poda), muebles, cauchos, animales muertos, etc. El costo se calculará según el volumen y distancia.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700 uppercase flex items-center gap-2 text-sm">
            <Truck className="w-5 h-5 text-[#ff5722]" />
            SOLICITUD DE RECOLECCIÓN ESPECIAL
          </h2>
        </div>

        <form className="p-6 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Desecho o Material *</label>
              <select 
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                required
              >
                <option value="">Seleccione una opción...</option>
                <option value="escombros">Escombros y restos de construcción</option>
                <option value="vegetales">Desechos vegetales (Tala y poda)</option>
                <option value="voluminosos">Voluminosos (Muebles, colchones, enseres)</option>
                <option value="cauchos">Cauchos / Neumáticos</option>
                <option value="animales">Animales muertos</option>
                <option value="eventos">Residuos de eventos especiales (Ferias, verbenas)</option>
                <option value="otros">Otros materiales pesados o especiales</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad Estimada *</label>
              <input type="number" min="1" className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad de Medida *</label>
              <select className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500 bg-white" required>
                <option value="unidades">Unidades / Piezas</option>
                <option value="m3">Metros Cúbicos (m³)</option>
                <option value="kg">Kilogramos (Kg)</option>
                <option value="ton">Toneladas</option>
                <option value="bolsas">Bolsas industriales</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Exacta de Recolección *</label>
              <input type="text" className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="Ej: Calle Principal, Frente a la plaza..." required />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Evidencia Fotográfica (Opcional pero recomendada)</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-8 w-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <div className="flex text-sm text-slate-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                      <span>Subir archivo</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" />
                    </label>
                    <p className="pl-1">o arrastrar y soltar</p>
                  </div>
                  <p className="text-xs text-slate-500">PNG, JPG, GIF hasta 5MB</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Detalles o requerimientos adicionales</label>
              <textarea rows={3} className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Describa si se requiere maquinaria pesada, acceso difícil, etc."></textarea>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-[#ff5722] hover:bg-[#f4511e] text-white rounded font-medium flex items-center gap-2 transition-colors">
              <Send className="w-4 h-4" />
              Enviar Solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
