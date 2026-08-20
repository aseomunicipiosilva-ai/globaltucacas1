import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Save, XCircle, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { useAppContext } from '@/store/AppContext';

interface UnidadesModalProps {
  condominioId: number;
  condominioNombre: string;
  condominioIdentidad?: string;
  onClose: () => void;
}

export function UnidadesModal({ condominioId, condominioNombre, onClose }: UnidadesModalProps) {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaUnidad, setNuevaUnidad] = useState('');
  const [nuevoPropietario, setNuevoPropietario] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    numero_unidad: '',
    propietario: '',
    estado: 'Solvente',
    ocupacion: 'Ocupada'
  });

  useEffect(() => {
    fetchUnidades();
  }, [condominioId]);

  const fetchUnidades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('unidades_condominio')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('id', { ascending: true });
    
    if (!error && data) {
      setUnidades(data);
    }
    setLoading(false);
  };

  const agregarUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaUnidad) return;

    const { data, error } = await supabase
      .from('unidades_condominio')
      .insert([{
        condominio_id: condominioId,
        numero_unidad: nuevaUnidad,
        propietario: nuevoPropietario || 'No asignado',
        estado: 'Solvente',
        ocupacion: 'Ocupada'
      }])
      .select();

    if (!error && data) {
      setUnidades([...unidades, data[0]]);
      setNuevaUnidad('');
      setNuevoPropietario('');
    }
  };

  const eliminarUnidad = async (id: number) => {
    const { error } = await supabase.from('unidades_condominio').delete().eq('id', id);
    if (!error) {
      setUnidades(unidades.filter(u => u.id !== id));
    }
  };

  const iniciarEdicion = (u: any) => {
    setEditingId(u.id);
    setEditForm({
      numero_unidad: u.numero_unidad || '',
      propietario: u.propietario || '',
      estado: u.estado || 'Solvente',
      ocupacion: u.ocupacion || 'Ocupada'
    });
  };

  const guardarEdicion = async (id: number) => {
    const { error, data } = await supabase
      .from('unidades_condominio')
      .update({
        numero_unidad: editForm.numero_unidad,
        propietario: editForm.propietario,
        estado: editForm.estado,
        ocupacion: editForm.ocupacion
      })
      .eq('id', id)
      .select();

    if (!error && data) {
      setUnidades(unidades.map(u => u.id === id ? data[0] : u));
      setEditingId(null);
    }
  };

  const { facturas } = useAppContext();
  
  // Logic to check if the entire Condominio is solvent (no pending invoices)
  const hasCondominioDebt = React.useMemo(() => {
    if (!condominioIdentidad) return true; // Default to having debt if we can't verify
    const pendingFacturas = (facturas || []).filter(
      (f: any) => f.contribuyente === condominioIdentidad && f.estado === 'Pendiente'
    );
    return pendingFacturas.length > 0;
  }, [facturas, condominioIdentidad]);

  // Helper to load image as base64
  const loadImage = async (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject('No 2d context');
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const emitirSolvencia = async (unidad: any) => {
    const isUnitSolvent = !hasCondominioDebt || unidad.estado === 'Solvente';
    if (!isUnitSolvent) {
      alert("No se puede emitir solvencia porque la unidad o el condominio presenta deudas pendientes.");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Load Logos
      let logoAlcaldia = '';
      let logoIsma = '';
      try {
        logoAlcaldia = await loadImage('/logo_alcaldia.png');
        logoIsma = await loadImage('/logo_isma.png');
      } catch(e) {
        console.warn('Could not load logos', e);
      }
      
      if (logoIsma) doc.addImage(logoIsma, 'PNG', 14, 10, 20, 20);
      if (logoAlcaldia) doc.addImage(logoAlcaldia, 'PNG', 176, 10, 20, 20);

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("CERTIFICADO DE SOLVENCIA DE CONDOMINIO", 105, 45, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      
      const fechaActual = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const texto = `Se hace constar por medio de la presente que la unidad identificada como "${unidad.numero_unidad}", ` +
        `perteneciente al condominio "${condominioNombre}" (RIF/CI: ${condominioIdentidad || 'N/A'}) ` +
        `y registrada bajo la responsabilidad de "${unidad.propietario || 'Propietario No Asignado'}", ` +
        `se encuentra SOLVENTE con sus obligaciones referentes a la prestación del servicio de Aseo Urbano ` +
        `hasta la fecha de emisión de este documento.\n\n` +
        `Este certificado se expide a petición de la parte interesada, a los ${fechaActual}.`;
        
      const splitText = doc.splitTextToSize(texto, 170);
      doc.text(splitText, 20, 70);

      // Generate QR Code
      const qrData = `Solvencia - Unidad: ${unidad.numero_unidad} - Condominio: ${condominioNombre} - Fecha: ${fechaActual}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 100 });
      doc.addImage(qrDataUrl, 'PNG', 80, 130, 50, 50);
      
      doc.setFontSize(8);
      doc.text("Escanear para verificar validez", 105, 185, { align: 'center' });
      
      // Signature lines
      doc.line(40, 230, 90, 230);
      doc.text("Firma Autorizada", 65, 235, { align: 'center' });
      
      doc.line(120, 230, 170, 230);
      doc.text("Sello de la Institución", 145, 235, { align: 'center' });

      doc.save(`Solvencia_${unidad.numero_unidad}_${new Date().getTime()}.pdf`);
    } catch (e: any) {
      alert("Error al generar PDF de Solvencia: " + e.message);
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Administrar Unidades</h2>
            <p className="text-sm text-slate-500">{condominioNombre}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Add Form */}
          <form onSubmit={agregarUnidad} className="flex gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Número/Identificador de Unidad</label>
              <input 
                type="text" 
                value={nuevaUnidad}
                onChange={(e) => setNuevaUnidad(e.target.value)}
                placeholder="Ej. Apto 1A" 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del Propietario (Opcional)</label>
              <input 
                type="text" 
                value={nuevoPropietario}
                onChange={(e) => setNuevoPropietario(e.target.value)}
                placeholder="Ej. María Gómez" 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 h-[38px]">
                <Plus size={16} /> Añadir
              </button>
            </div>
          </form>

          {/* List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Unidades Registradas ({unidades.length})</h3>
            {loading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Cargando unidades...</div>
            ) : unidades.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                <p className="text-slate-500 text-sm">No hay unidades registradas en este condominio.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Unidad</th>
                      <th className="px-4 py-3">Propietario</th>
                      <th className="px-4 py-3">Ocupación</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unidades.map((u) => {
                      const isUnitSolvent = !hasCondominioDebt || u.estado === 'Solvente';
                      return (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        {editingId === u.id ? (
                          <>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                value={editForm.numero_unidad} 
                                onChange={(e) => setEditForm({...editForm, numero_unidad: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                value={editForm.propietario} 
                                onChange={(e) => setEditForm({...editForm, propietario: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select 
                                value={editForm.ocupacion}
                                onChange={(e) => setEditForm({...editForm, ocupacion: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                              >
                                <option value="Ocupada">Ocupada</option>
                                <option value="Desocupada">Desocupada</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <select 
                                value={editForm.estado}
                                onChange={(e) => setEditForm({...editForm, estado: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                                disabled={!hasCondominioDebt}
                                title={!hasCondominioDebt ? "El condominio está solvente" : ""}
                              >
                                <option value="Solvente">Solvente</option>
                                <option value="Con Deuda">Con Deuda</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button onClick={() => guardarEdicion(u.id)} className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors mr-1">
                                <Save size={16} />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <XCircle size={16} />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-medium text-slate-800">{u.numero_unidad}</td>
                            <td className="px-4 py-3 text-slate-600">{u.propietario}</td>
                            <td className="px-4 py-3 text-slate-600">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                u.ocupacion === 'Ocupada' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {u.ocupacion || 'Ocupada'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                isUnitSolvent ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`} title={!hasCondominioDebt ? "Automático: Condominio Solvente" : "Manual"}>
                                {isUnitSolvent ? 'Solvente' : 'Con Deuda'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => emitirSolvencia(u)} 
                                className={`p-1.5 rounded-lg transition-colors mr-1 ${isUnitSolvent ? 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50' : 'text-slate-300 cursor-not-allowed'}`}
                                title={isUnitSolvent ? "Emitir Solvencia PDF" : "La unidad presenta deuda"}
                              >
                                <FileText size={16} />
                              </button>
                              <button onClick={() => iniciarEdicion(u)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors mr-1">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => eliminarUnidad(u.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
