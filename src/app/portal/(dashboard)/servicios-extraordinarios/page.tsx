'use client';
import { Truck, Upload, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useAppContext } from '@/store/AppContext';

export default function ServiciosExtraordinariosPage() {
  const [tipo, setTipo] = useState('');
  const [camion, setCamion] = useState('');
  const [distancia, setDistancia] = useState('');
  const [direccion, setDireccion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const appContext = useAppContext();

  // Mock de tasa BCV para el simulador
  const TASA_BCV = 40.50;

  let tarifaTCMV = 0;
  if (distancia === 'menor') {
    if (camion === '350') tarifaTCMV = 30;
    if (camion === '600') tarifaTCMV = 50;
    if (camion === '750') tarifaTCMV = 70;
  } else if (distancia === 'mayor') {
    if (camion === '350') tarifaTCMV = 40;
    if (camion === '600') tarifaTCMV = 60;
    if (camion === '750') tarifaTCMV = 80;
  }

  const costoTotalBs = (tarifaTCMV * TASA_BCV).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appContext || tarifaTCMV === 0) return;
    
    setIsSubmitting(true);
    
    const nuevaFactura = {
      contribuyente: 'Contribuyente Demo', // ideally taken from auth state
      monto: costoTotalBs,
      referencia: `SERV-EXT-${Math.floor(Math.random() * 10000)}`,
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
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-emerald-200 p-10 text-center">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Solicitud Generada Exitosamente!</h2>
        <p className="text-slate-600 mb-6">
          Su solicitud de recolección especial ha sido registrada y el cargo de <strong>{costoTotalBs} Bs</strong> ha sido agregado a su cuenta.
        </p>
        <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg inline-block border border-slate-100">
          Puede dirigirse al módulo de <strong>PAGAR</strong> para cancelar el monto de este servicio y procederemos con la programación de la unidad.
        </p>
        <div className="mt-8">
          <button onClick={() => setIsSuccess(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium transition-colors">
            Volver
          </button>
        </div>
      </div>
    );
  }

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

        <form className="p-6 space-y-6" onSubmit={handleSubmit}>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Camión Requerido *</label>
              <select 
                value={camion}
                onChange={(e) => setCamion(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500" required>
                <option value="">Seleccione capacidad...</option>
                <option value="350">Camión 350</option>
                <option value="600">Camión 600</option>
                <option value="750">Camión 750</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distancia del Servicio *</label>
              <select 
                value={distancia}
                onChange={(e) => setDistancia(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500 bg-white" required>
                <option value="">Seleccione rango...</option>
                <option value="menor">Menor a 20 Kms</option>
                <option value="mayor">Mayor a 20 Kms</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Exacta de Recolección *</label>
              <input 
                type="text" 
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-3 py-2.5 focus:ring-2 focus:ring-blue-500" 
                placeholder="Ej: Calle Principal, Frente a la plaza..." required />
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

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col items-end">
            <span className="text-sm font-medium text-slate-500">Cálculo de Tarifa (Tabla 3 Ordenanza)</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {tarifaTCMV > 0 ? `${costoTotalBs} Bs` : '0.00 Bs'}
            </div>
            {tarifaTCMV > 0 && (
              <span className="text-xs text-slate-400 mt-1">Equivalente a {tarifaTCMV} TCMV</span>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting || tarifaTCMV === 0}
              className="px-6 py-2 bg-[#ff5722] hover:bg-[#f4511e] disabled:opacity-50 text-white rounded font-medium flex items-center gap-2 transition-colors">
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Procesando...' : 'Solicitar y Generar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
