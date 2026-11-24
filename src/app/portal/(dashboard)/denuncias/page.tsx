'use client';
import { MessageSquare, Camera, Send, History, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function DenunciasPage() {
  const [activeTab, setActiveTab] = useState('nueva');
  const [tipoReporte, setTipoReporte] = useState('');
  const [direccion, setDireccion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [denuncias, setDenuncias] = useState<any[]>([]);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);

  const cargarHistorial = async () => {
    const doc = localStorage.getItem('portal_doc') || '';
    if (!doc) return;
    setIsLoadingHistorial(true);
    try {
      const docLimpio = doc.replace(/[-]/g, '').toUpperCase();
      const { data, error } = await supabase
        .from('reclamos')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        const misReclamos = data.filter((r: any) => {
          const id = (r.identidad || '').replace(/[-]/g, '').toUpperCase();
          return id === docLimpio || id === doc.toUpperCase();
        });
        setDenuncias(misReclamos);
      }
    } catch (err) {
      console.error('Error cargando denuncias:', err);
    } finally {
      setIsLoadingHistorial(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoReporte || !direccion || !descripcion) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }

    setIsSubmitting(true);
    const doc = localStorage.getItem('portal_doc') || '';
    const nombre = localStorage.getItem('portal_user') || 'Contribuyente';
    const ticketId = `REC-${Date.now().toString().slice(-6)}`;
    const fechaActual = new Date().toISOString().split('T')[0];

    try {
      const sectorTexto = `Dirección: ${direccion} | Detalle: ${descripcion}`;
      const { data, error } = await supabase
        .from('reclamos')
        .insert([{
          ticket: ticketId,
          fecha: fechaActual,
          contribuyente: nombre,
          tipo: tipoReporte,
          sector: sectorTexto,
          estado: 'Pendiente',
          identidad: doc
        }])
        .select();

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      setTipoReporte('');
      setDireccion('');
      setDescripcion('');
      cargarHistorial();
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err: any) {
      console.error('Error guardando reclamo:', err);
      alert('Hubo un error al enviar el reporte. Por favor intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Denuncias y Reclamos</h1>
          <p className="text-slate-500 mt-1">Reporta incidencias, botes ilegales o fallas en el servicio.</p>
        </div>
      </div>

      {isSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">¡Reporte enviado exitosamente!</p>
            <p className="text-xs text-emerald-700">Ha sido recibido por el equipo de supervisión y gestión urbana.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button 
            onClick={() => setActiveTab('nueva')}
            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'nueva' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Nueva Denuncia</div>
          </button>
          <button 
            onClick={() => { setActiveTab('historial'); cargarHistorial(); }}
            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'historial' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <div className="flex items-center gap-2"><History className="w-4 h-4" /> Mis Denuncias ({denuncias.length})</div>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'nueva' && (
            <div className="max-w-2xl mx-auto">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Reporte *</label>
                  <select 
                    required 
                    value={tipoReporte}
                    onChange={(e) => setTipoReporte(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-green-500 bg-white"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Falla de Recolección">Falla de Recolección (El camión no pasó)</option>
                    <option value="Bote Ilegal">Bote de Basura Ilegal en Vía Pública</option>
                    <option value="Falla en Emisión de recibos">Problema de Emisión de recibos o Deuda Incorrecta</option>
                    <option value="Otro">Otro Motivo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección Exacta de la Incidencia *</label>
                  <input 
                    required 
                    type="text" 
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle, sector o punto de referencia" 
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-green-500" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción Detallada *</label>
                  <textarea 
                    required 
                    rows={4} 
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describa el problema..." 
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-green-500"
                  ></textarea>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg w-full transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" /> Enviar Reporte
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'historial' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500 font-medium">Reclamos y solicitudes enviadas a la fecha</span>
                <button 
                  onClick={cargarHistorial} 
                  disabled={isLoadingHistorial}
                  className="flex items-center gap-1.5 text-xs text-green-700 font-semibold hover:bg-green-50 px-2.5 py-1.5 rounded transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistorial ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>

              {isLoadingHistorial ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  <span className="text-xs">Cargando reportes...</span>
                </div>
              ) : denuncias.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-sm font-medium">No tienes reclamos ni denuncias registradas</p>
                  <p className="text-xs text-slate-400 mt-1">Cualquier reporte que generes aparecerá aquí en tiempo real.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">ID Ticket</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Detalle / Ubicación</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {denuncias.map((denuncia) => (
                        <tr key={denuncia.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-700">{denuncia.ticket || `REC-${denuncia.id}`}</td>
                          <td className="px-4 py-3">{denuncia.fecha || (denuncia.created_at ? denuncia.created_at.split('T')[0] : 'N/A')}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{denuncia.tipo}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{denuncia.sector || 'Sin detalles'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              denuncia.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' :
                              denuncia.estado === 'Rechazado' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>{denuncia.estado || 'Pendiente'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
