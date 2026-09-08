import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Save, XCircle, FileText, Power, Key, Eye, EyeOff, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { useAppContext } from '@/store/AppContext';
import { logos } from '@/lib/logosBase64';

interface UnidadesModalProps {
  condominioId: number;
  condominioNombre: string;
  condominioIdentidad?: string;
  onClose?: () => void;
  isInline?: boolean;
}

export function UnidadesModal({ condominioId, condominioNombre, condominioIdentidad, onClose, isInline }: UnidadesModalProps) {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaUnidad, setNuevaUnidad] = useState('');
  const [nuevoPropietario, setNuevoPropietario] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [nuevaFicha, setNuevaFicha] = useState('');
  const [nuevaCedula, setNuevaCedula] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    numero_unidad: '',
    propietario: '',
    cedula_rif: '',
    telefono: '',
    correo: '',
    ficha_catastral: '',
    estado: 'Solvente',
    ocupacion: 'Ocupada',
    activo: true
  });

  // Credenciales por unidad
  const [showCredencial, setShowCredencial] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState<Set<number>>(new Set());

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
        cedula_rif: nuevaCedula || '',
        telefono: nuevoTelefono || '',
        correo: nuevoCorreo || '',
        ficha_catastral: nuevaFicha || '',
        estado: 'Solvente',
        ocupacion: 'Ocupada'
      }])
      .select();

    if (!error && data) {
      setUnidades([...unidades, data[0]]);
      setNuevaUnidad('');
      setNuevoPropietario('');
      setNuevaCedula('');
      setNuevoTelefono('');
      setNuevoCorreo('');
      setNuevaFicha('');
    }
  };

  const eliminarUnidad = async (id: number) => {
    const { error } = await supabase.from('unidades_condominio').delete().eq('id', id);
    if (!error) {
      setUnidades(unidades.filter(u => u.id !== id));
    }
  };

  const toggleActivoUnidad = async (u: any) => {
    const nuevoActivo = u.activo === false ? true : false; // toggle
    const { error } = await supabase
      .from('unidades_condominio')
      .update({ activo: nuevoActivo })
      .eq('id', u.id);
    if (!error) {
      setUnidades(unidades.map(x => x.id === u.id ? { ...x, activo: nuevoActivo } : x));
    }
  };

  const iniciarEdicion = (u: any) => {
    setEditingId(u.id);
    setEditForm({
      numero_unidad: u.numero_unidad || '',
      propietario: u.propietario || '',
      cedula_rif: u.cedula_rif || '',
      telefono: u.telefono || '',
      correo: u.correo || '',
      ficha_catastral: u.ficha_catastral || '',
      estado: u.estado || 'Solvente',
      ocupacion: u.ocupacion || 'Ocupada',
      activo: u.activo !== false
    });
  };

  const guardarEdicion = async (id: number) => {
    const { error, data } = await supabase
      .from('unidades_condominio')
      .update({
        numero_unidad: editForm.numero_unidad,
        propietario: editForm.propietario,
        cedula_rif: editForm.cedula_rif,
        telefono: editForm.telefono,
        correo: editForm.correo,
        ficha_catastral: editForm.ficha_catastral,
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
      
      // Header background (gray bar)
      doc.setFillColor(230, 230, 230); // light gray
      doc.rect(0, 0, 210, 40, 'F');
      
      // ISMA logo only
      doc.addImage(logos.isma, 'JPEG', 15, 8, 45, 25);
      
      // Header Text
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("CERTIFICADO DE SOLVENCIA", 200, 20, { align: "right" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const codigoUnico = `S-${new Date().getTime().toString().slice(-6)}`;
      doc.text(`Nº Certificado: ${codigoUnico}`, 200, 28, { align: "right" });
      
      const fechaActual = new Date();
      const fechaActualStr = fechaActual.toLocaleDateString('es-VE');
      doc.text(`Fecha: ${fechaActualStr}`, 200, 34, { align: "right" });
      
      // Section 1: DATOS DEL CONTRIBUYENTE & DETALLES DEL INMUEBLE
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("DATOS DEL CONTRIBUYENTE", 15, 55);
      doc.text("DETALLES DEL INMUEBLE", 110, 55);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Contribuyente data
      doc.text("Razón Social:", 15, 62);
      doc.setFont("helvetica", "bold");
      doc.text(unidad.propietario || 'Propietario No Asignado', 40, 62);
      
      doc.setFont("helvetica", "normal");
      doc.text("RIF / C.I.:", 15, 68);
      doc.text(condominioIdentidad || 'N/A', 40, 68);
      
      doc.text("Teléfono:", 15, 74);
      doc.text('+58 412-9030238', 40, 74);
      
      doc.text("Código:", 15, 80);
      doc.text('C-000', 40, 80);
      
      // Inmueble data
      doc.setFont("helvetica", "normal");
      doc.text("Nro de Inmueble:", 110, 62);
      doc.text(unidad.numero_unidad, 135, 62);
      
      doc.text("Condominio:", 110, 68);
      doc.text(condominioNombre, 130, 68);
      
      doc.text("Dirección:", 110, 74);
      const dirSplit = doc.splitTextToSize('Tucacas Municipio Silva', 70);
      doc.text(dirSplit, 130, 74);
      
      // Section 2: PERÍODO DE SOLVENCIA
      doc.setFillColor(230, 230, 230);
      doc.rect(15, 95, 180, 8, 'F');
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("PERÍODO DE SOLVENCIA", 18, 100);
      
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(245, 245, 245);
      doc.rect(15, 103, 180, 25, 'FD');
      
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
      const vencMesAnio = `${('0' + (fechaVencimiento.getMonth() + 1)).slice(-2)}-${fechaVencimiento.getFullYear()}`;
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 144, 255); // blue
      doc.text(`SOLVENTE HASTA: ${vencMesAnio}`, 105, 115, { align: "center" });
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const vencStr = fechaVencimiento.toLocaleDateString('es-VE');
      doc.text(`CERTIFICADO VÁLIDO HASTA: ${vencStr}`, 105, 123, { align: "center" });
      
      // Section 3: DECLARACIÓN
      doc.setFillColor(230, 230, 230);
      doc.rect(15, 135, 180, 8, 'F');
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DECLARACIÓN", 18, 140);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const declText = "Hacemos constar que el inmueble referenciado ha cumplido con las obligaciones de pago señaladas en la Ordenanza Municipal por concepto de ASEO URBANO, encontrándose solvente hasta el período indicado.";
      const splitDecl = doc.splitTextToSize(declText, 175);
      doc.text(splitDecl, 15, 150);
      
      // QR Code
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aseosilva.globalrecca.com';
      const qrData = `${baseUrl}/validar?codigo=${codigoUnico}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 100 });
      doc.addImage(qrDataUrl, 'PNG', 85, 180, 40, 40);
      
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("Escanee este código QR para validar la autenticidad de este certificado de", 105, 225, { align: 'center' });
      doc.text(`solvencia. La validación en línea estará disponible hasta: ${vencStr}`, 105, 229, { align: 'center' });
      
      // Footer Note
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      const noteText = "Nota: Este documento es válido únicamente para los fines establecidos por la normativa municipal vigente y pierde su validez una vez vencida la fecha de expiración indicada. Cualquier alteración o modificación invalida el presente certificado.";
      const splitNote = doc.splitTextToSize(noteText, 180);
      doc.text(splitNote, 15, 240);
      
      doc.save(`Solvencia_${unidad.numero_unidad}_${new Date().getTime()}.pdf`);
    } catch (e: any) {
      alert("Error al generar PDF de Solvencia: " + e.message);
      console.error(e);
    }
  };

  const modalContent = (
    <div className={`bg-white w-full flex flex-col overflow-hidden ${isInline ? 'mt-4 border border-slate-200 rounded-lg shadow-sm' : 'rounded-xl shadow-xl max-w-5xl max-h-[90vh]'}`}>
      {/* Header */}
      {!isInline && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Unidades del Condominio</h2>
            <p className="text-sm text-slate-500 mt-1">{condominioNombre} • RIF: {condominioIdentidad || 'N/A'}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700">
              <X size={24} />
            </button>
          )}
        </div>
      )}
      
      {isInline && (
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Unidades del Condominio Registradas</h3>
        </div>
      )}

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Add Form */}
          <form onSubmit={agregarUnidad} className="flex flex-col gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex gap-4">
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
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Cédula / RIF (Opcional)</label>
                <input 
                  type="text" 
                  value={nuevaCedula}
                  onChange={(e) => setNuevaCedula(e.target.value)}
                  placeholder="Ej. V-12345678" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono (Opcional)</label>
                <input 
                  type="text" 
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  placeholder="Ej. 0414-1234567" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Correo Electrónico (Opcional)</label>
                <input 
                  type="email" 
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  placeholder="Ej. correo@ejemplo.com" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Ficha Catastral (Opcional)</label>
                <input 
                  type="text" 
                  value={nuevaFicha}
                  onChange={(e) => setNuevaFicha(e.target.value)}
                  placeholder="Ficha catastral" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 h-[38px]">
                  <Plus size={16} /> Añadir
                </button>
              </div>
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
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Unidad</th>
                      <th className="px-4 py-3">Propietario</th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3">Ficha</th>
                      <th className="px-4 py-3">Ocupación</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unidades.map((u) => {
                      const isUnitSolvent = !hasCondominioDebt || u.estado === 'Solvente';
                      return (
                      <React.Fragment key={u.id}>
                      <tr className="hover:bg-slate-50/50">
                        {editingId === u.id ? (
                          <>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                value={editForm.numero_unidad} 
                                onChange={(e) => setEditForm({...editForm, numero_unidad: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 min-w-[80px]"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                placeholder="Nombre"
                                value={editForm.propietario} 
                                onChange={(e) => setEditForm({...editForm, propietario: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 mb-1 min-w-[100px]"
                              />
                              <input 
                                type="text" 
                                placeholder="Cédula/RIF"
                                value={editForm.cedula_rif} 
                                onChange={(e) => setEditForm({...editForm, cedula_rif: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 min-w-[100px]"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                placeholder="Teléfono"
                                value={editForm.telefono} 
                                onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 mb-1 min-w-[100px]"
                              />
                              <input 
                                type="text" 
                                placeholder="Correo"
                                value={editForm.correo} 
                                onChange={(e) => setEditForm({...editForm, correo: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 min-w-[100px]"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                placeholder="Ficha"
                                value={editForm.ficha_catastral} 
                                onChange={(e) => setEditForm({...editForm, ficha_catastral: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 min-w-[80px]"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select 
                                value={editForm.ocupacion}
                                onChange={(e) => setEditForm({...editForm, ocupacion: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 min-w-[100px]"
                              >
                                <option value="Ocupada">Ocupada</option>
                                <option value="Desocupada">Desocupada</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <select 
                                value={editForm.estado}
                                onChange={(e) => setEditForm({...editForm, estado: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 min-w-[100px]"
                                disabled={!hasCondominioDebt}
                                title={!hasCondominioDebt ? "El condominio está solvente" : ""}
                              >
                                <option value="Solvente">Solvente</option>
                                <option value="Con Deuda">Con Deuda</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
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
                            <td className="px-3 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs" title={`ID: ${u.id}`}>#{u.id}</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{u.numero_unidad}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-700">{u.propietario}</div>
                              {u.cedula_rif && <div className="text-[10px] text-slate-500">C.I/RIF: {u.cedula_rif}</div>}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              <div>{u.telefono || 'Sin Telf.'}</div>
                              <div>{u.correo || 'Sin Correo'}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{u.ficha_catastral || 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-600">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                u.activo === false ? 'bg-slate-200 text-slate-500' : u.ocupacion === 'Ocupada' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {u.activo === false ? 'Inactivo' : (u.ocupacion || 'Ocupada')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                isUnitSolvent ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`} title={!hasCondominioDebt ? "Automático: Condominio Solvente" : "Manual"}>
                                {isUnitSolvent ? 'Solvente' : 'Con Deuda'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
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
                              <button
                                onClick={() => setShowCredencial(showCredencial === u.id ? null : u.id)}
                                className={`p-1.5 rounded-lg transition-colors mr-1 ${showCredencial === u.id ? 'bg-violet-100 text-violet-700' : 'text-violet-500 hover:bg-violet-50'}`}
                                title="Ver/Generar Credenciales de Acceso"
                              >
                                <Key size={16} />
                              </button>
                              <button
                                onClick={() => toggleActivoUnidad(u)}
                                className={`p-1.5 rounded-lg transition-colors mr-1 ${u.activo === false ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
                                title={u.activo === false ? 'Reactivar Local' : 'Desactivar Local'}
                              >
                                <Power size={16} />
                              </button>
                              <button onClick={() => eliminarUnidad(u.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                      {showCredencial === u.id && (
                        <tr className="bg-violet-50 border-b border-violet-100">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="flex items-center gap-6 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Key size={14} className="text-violet-600" />
                                <span className="text-xs font-bold text-violet-700 uppercase">Credenciales de Acceso Portal</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Usuario:</span>
                                <code className="text-xs font-mono bg-white border border-violet-200 px-2 py-0.5 rounded text-violet-800 font-bold">
                                  {u.cedula_rif || `COND-${condominioId}-${u.id}`}
                                </code>
                                <button onClick={() => navigator.clipboard.writeText(u.cedula_rif || `COND-${condominioId}-${u.id}`)} className="text-violet-500 hover:text-violet-700" title="Copiar">
                                  <Copy size={13} />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Contraseña:</span>
                                <code className="text-xs font-mono bg-white border border-violet-200 px-2 py-0.5 rounded text-violet-800 font-bold">
                                  {showPassword.has(u.id) ? `COND${u.id}${new Date().getFullYear()}` : '••••••••'}
                                </code>
                                <button onClick={() => setShowPassword(prev => { const s = new Set(prev); s.has(u.id) ? s.delete(u.id) : s.add(u.id); return s; })} className="text-violet-500 hover:text-violet-700" title="Mostrar/Ocultar">
                                  {showPassword.has(u.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                <button onClick={() => navigator.clipboard.writeText(`COND${u.id}${new Date().getFullYear()}`)} className="text-violet-500 hover:text-violet-700" title="Copiar">
                                  <Copy size={13} />
                                </button>
                              </div>
                              <span className="text-[10px] text-slate-400">* Usuario = Cédula/RIF del propietario. Contraseña por defecto: COND + ID + Año</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
  );

  if (isInline) {
    return modalContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {modalContent}
    </div>
  );
}


