'use client';
import { useState, useEffect } from 'react';
import { 
  Users, Save, ArrowLeft, Plus, Shield, ShieldAlert, ShieldCheck, 
  AlertCircle, UserX, UserCheck, Trash2, CheckCircle2 
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/audit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const defaultPermissions = {
  crear_contribuyente: false,
  editar_contribuyente: false,
  borrar_contribuyente: false,
  gestionar_pagos: false,
  anular_pagos: false,
  anular_facturas: false,
  caja_tasa_personalizada: false,
  ver_reportes: false,
  gestionar_usuarios: false,
  precindencia: false,
};

export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal de confirmación para eliminar
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; trabajador: any | null }>({
    open: false,
    trabajador: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTrabajadores();
  }, []);

  const fetchTrabajadores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('trabajadores').select('*').order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setTrabajadores(data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al cargar trabajadores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  const handleEdit = (trabajador: any) => {
    setFormData({ ...trabajador });
    setIsEditing(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleAdd = () => {
    setFormData({
      id: null,
      nombre: '',
      cedula: '',
      correo: '',
      usuario: '',
      clave: '',
      rol: 'Taquilla / Operador',
      estado: 'Activo',
      letra: '',
      permisos: { ...defaultPermissions }
    });
    setIsEditing(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Validar que la letra no esté duplicada en otro trabajador activo
      if (formData.letra && formData.letra.trim() && formData.estado === 'Activo') {
        const { data: letraExistente } = await supabase
          .from('trabajadores')
          .select('id, nombre, letra')
          .eq('letra', formData.letra.trim().toUpperCase())
          .neq('id', formData.id || '')
          .eq('estado', 'Activo')
          .maybeSingle();
        if (letraExistente) {
          setErrorMsg(`La letra '${formData.letra.toUpperCase()}' ya está asignada al trabajador: ${letraExistente.nombre}. Cada trabajador activo debe tener una letra única.`);
          setIsSaving(false);
          return;
        }
      }

      const payload: any = {
        nombre: formData.nombre,
        cedula: formData.cedula,
        correo: formData.correo,
        usuario: formData.usuario,
        rol: formData.rol,
        estado: formData.estado,
        letra: formData.letra ? formData.letra.toUpperCase() : '',
        permisos: formData.permisos
      };
      // Solo sobreescribir clave si fue escrita/ingresada, o si es nuevo registro
      if (formData.clave && String(formData.clave).trim()) {
        payload.clave = String(formData.clave).trim();
      } else if (!formData.id) {
        payload.clave = formData.clave || '123456';
      }

      if(formData.id) {
        // Update
        const { error } = await supabase.from('trabajadores').update(payload).eq('id', formData.id);
        if (error) throw error;
        logAudit('Editar Trabajador', { id: formData.id, usuario: formData.usuario, estado: formData.estado, rol: formData.rol }, 'CONFIGURACION');
      } else {
        // Insert
        const { error } = await supabase.from('trabajadores').insert([payload]);
        if (error) throw error;
        logAudit('Crear Trabajador', { usuario: formData.usuario, estado: formData.estado, rol: formData.rol }, 'CONFIGURACION');
      }

      await fetchTrabajadores();
      setIsEditing(false);
      setSuccessMsg(`Trabajador ${formData.nombre} guardado correctamente.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al guardar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Alternar rápidamente entre Activo y Suspendido
  const handleToggleEstado = async (trabajador: any, nuevoEstado: 'Activo' | 'Suspendido') => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (nuevoEstado === 'Activo' && trabajador.letra && trabajador.letra.trim()) {
        const { data: letraExistente } = await supabase
          .from('trabajadores')
          .select('id, nombre, letra')
          .eq('letra', trabajador.letra.trim().toUpperCase())
          .neq('id', trabajador.id)
          .eq('estado', 'Activo')
          .maybeSingle();
        if (letraExistente) {
          setErrorMsg(`No se puede reactivar: La letra '${trabajador.letra.toUpperCase()}' ya está en uso por ${letraExistente.nombre}. Edita la letra antes de activarlo.`);
          return;
        }
      }

      const { error } = await supabase
        .from('trabajadores')
        .update({ estado: nuevoEstado })
        .eq('id', trabajador.id);

      if (error) throw error;

      logAudit(nuevoEstado === 'Suspendido' ? 'Suspender Trabajador' : 'Activar Trabajador', {
        id: trabajador.id,
        usuario: trabajador.usuario,
        nombre: trabajador.nombre,
        nuevoEstado
      }, 'CONFIGURACION');

      await fetchTrabajadores();
      setSuccessMsg(
        nuevoEstado === 'Suspendido'
          ? `El trabajador ${trabajador.nombre} ha sido SUSPENDIDO. Su acceso queda bloqueado de inmediato.`
          : `El trabajador ${trabajador.nombre} ha sido ACTIVADO exitosamente.`
      );

      if (isEditing && formData?.id === trabajador.id) {
        setFormData((prev: any) => ({ ...prev, estado: nuevoEstado }));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al cambiar estado: ' + err.message);
    }
  };

  // Eliminar permanentemente a un trabajador
  const handleDelete = async (trabajador: any) => {
    setIsDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('trabajadores')
        .delete()
        .eq('id', trabajador.id);

      if (error) throw error;

      logAudit('Eliminar Trabajador', {
        id: trabajador.id,
        usuario: trabajador.usuario,
        nombre: trabajador.nombre,
        rol: trabajador.rol
      }, 'CONFIGURACION');

      setDeleteModal({ open: false, trabajador: null });
      if (isEditing && formData?.id === trabajador.id) {
        setIsEditing(false);
      }
      await fetchTrabajadores();
      setSuccessMsg(`El trabajador "${trabajador.nombre}" (${trabajador.usuario}) fue ELIMINADO permanentemente. Su acceso ha quedado revocado.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al eliminar trabajador: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRoleChange = (role: string) => {
    let newPerms = { ...formData.permisos };
    if (role === 'Administrador') {
      Object.keys(newPerms).forEach(k => newPerms[k as keyof typeof newPerms] = true);
    } else if (role === 'Auditor') {
      Object.keys(newPerms).forEach(k => newPerms[k as keyof typeof newPerms] = false);
      newPerms.ver_reportes = true;
    } else if (role === 'Taquilla / Operador') {
      Object.keys(newPerms).forEach(k => newPerms[k as keyof typeof newPerms] = false);
      newPerms.crear_contribuyente = true;
      newPerms.gestionar_pagos = true;
    } else if (role === 'Supervisor') {
      Object.keys(newPerms).forEach(k => newPerms[k as keyof typeof newPerms] = true);
      newPerms.borrar_contribuyente = false;
      newPerms.gestionar_usuarios = false;
    } else if (role === 'Operador de Censo') {
      Object.keys(newPerms).forEach(k => newPerms[k as keyof typeof newPerms] = false);
      newPerms.crear_contribuyente = true;
    }
    setFormData({ ...formData, rol: role, permisos: newPerms });
  };

  const togglePermission = (key: string) => {
    setFormData({
      ...formData,
      permisos: {
        ...formData.permisos,
        [key]: !formData.permisos[key]
      }
    });
  };

  const columns = [
    { key: 'nombre', header: 'Nombre Completo' },
    { key: 'usuario', header: 'Usuario' },
    { key: 'letra', header: 'Letra', render: (row: any) => (
      <span className="font-bold text-slate-700">{row.letra || '-'}</span>
    )},
    { key: 'rol', header: 'Rol', render: (row: any) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${row.rol === 'Administrador' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
        {row.rol}
      </span>
    )},
    { key: 'estado', header: 'Estado', render: (row: any) => (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
        row.estado === 'Activo' 
          ? 'bg-green-100 text-green-700 border border-green-200' 
          : 'bg-red-100 text-red-700 border border-red-200'
      }`}>
        {row.estado === 'Activo' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
        {row.estado}
      </span>
    )},
    { key: 'actions', header: 'Acciones', render: (row: any) => (
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => handleEdit(row)} 
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded border border-slate-300 font-medium transition-colors"
          title="Ver o editar datos y permisos"
        >
          Editar
        </button>

        {row.estado === 'Activo' ? (
          <button 
            onClick={() => handleToggleEstado(row, 'Suspendido')} 
            className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1 rounded border border-amber-200 font-medium transition-colors flex items-center gap-1"
            title="Suspender acceso inmediato"
          >
            <UserX className="w-3 h-3" /> Suspender
          </button>
        ) : (
          <button 
            onClick={() => handleToggleEstado(row, 'Activo')} 
            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 font-medium transition-colors flex items-center gap-1"
            title="Reactivar cuenta"
          >
            <UserCheck className="w-3 h-3" /> Activar
          </button>
        )}

        <button 
          onClick={() => setDeleteModal({ open: true, trabajador: row })} 
          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded border border-red-200 font-medium transition-colors flex items-center gap-1"
          title="Eliminar permanentemente del sistema"
        >
          <Trash2 className="w-3 h-3" /> Eliminar
        </button>
      </div>
    )}
  ];

  const permisosList = [
    { key: 'crear_contribuyente', label: 'Crear Contribuyentes', desc: 'Permite registrar nuevos contribuyentes en el sistema.' },
    { key: 'editar_contribuyente', label: 'Editar Contribuyentes', desc: 'Permite modificar datos o configurar condominios.' },
    { key: 'borrar_contribuyente', label: 'Eliminar Contribuyentes', desc: 'Permite borrar registros permanentemente.' },
    { key: 'gestionar_pagos', label: 'Procesar Pagos', desc: 'Permite registrar cobros y convenios de pago.' },
    { key: 'anular_pagos', label: 'Anular Recibos', desc: 'Permite revertir pagos ya procesados.' },
    { key: 'anular_facturas', label: 'Anular Recibos', desc: 'Permite anular recibos emitidas.' },
    { key: 'caja_tasa_personalizada', label: 'Aplicar Tasa BCV Manual (Caja)', desc: 'Permite editar la tasa BCV manualmente al cobrar en Caja.' },
    { key: 'ver_reportes', label: 'Ver Reportes', desc: 'Acceso a los reportes financieros e informes.' },
    { key: 'gestionar_usuarios', label: 'Gestionar Trabajadores', desc: 'Permite crear o editar accesos al sistema.' },
    { key: 'precindencia', label: 'Módulo de Precindencia', desc: 'Permite acceder al módulo de precindencia.' },
  ];

  if (isEditing) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Shield className="w-6 h-6 text-slate-700" />
            <h1 className="text-xl font-semibold text-slate-800 uppercase tracking-wide">
              {formData.nombre ? 'Editar Trabajador' : 'Nuevo Trabajador'}
            </h1>
          </div>

          {formData.id && (
            <div className="flex items-center gap-2">
              {formData.estado === 'Activo' ? (
                <button
                  type="button"
                  onClick={() => handleToggleEstado(formData, 'Suspendido')}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" /> Suspender Cuenta
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleEstado(formData, 'Activo')}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Reactivar Cuenta
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeleteModal({ open: true, trabajador: formData })}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase border-b border-slate-100 pb-2 mb-4">Datos Básicos</h2>
              
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Nombre Completo</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>
              
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Cédula</label>
                <input required type="text" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Correo Electrónico</label>
                <input required type="email" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Nombre de Usuario</label>
                <input required type="text" value={formData.usuario} onChange={e => setFormData({...formData, usuario: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>
              
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Contraseña (Opcional)</label>
                <input type="password" placeholder="********" value={formData.clave || ''} onChange={e => setFormData({...formData, clave: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Estado de la Cuenta</label>
                <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 font-semibold">
                  <option value="Activo">Activo (Con Acceso)</option>
                  <option value="Suspendido">Suspendido (Sin Acceso)</option>
                </select>
              </div>
              
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Letra Identificadora (Caja / Auditoría)</label>
                <input type="text" maxLength={1} placeholder="Ej: A, B, F..." value={formData.letra || ''} onChange={e => setFormData({...formData, letra: e.target.value.toUpperCase()})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 font-bold text-center uppercase" />
                <span className="text-[10px] text-slate-400 mt-1 block">Aparecerá en los recibos impresos (ej. Caja: F-OMAR)</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase">Rol y Permisos</h2>
                <div className="w-1/2">
                  <select value={formData.rol} onChange={e => handleRoleChange(e.target.value)} className="w-full border-2 border-blue-200 bg-blue-50 rounded px-3 py-1.5 text-sm font-semibold text-blue-800 outline-none focus:border-blue-500">
                    <option value="Administrador">Administrador</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Taquilla / Operador">Taquilla / Operador</option>
                    <option value="Operador de Censo">Operador de Censo</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-6">Activa o desactiva los módulos a los que este trabajador tendrá acceso. Al seleccionar un Rol predeterminado arriba, se auto-configurarán estos permisos.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permisosList.map(perm => (
                  <div 
                    key={perm.key} 
                    className={`flex items-start gap-3 p-3 rounded-lg border ${formData.permisos[perm.key] ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'} cursor-pointer hover:border-blue-300 transition-colors`}
                    onClick={() => {
                      togglePermission(perm.key);
                      if (formData.rol !== 'Personalizado') setFormData((prev: any) => ({...prev, rol: 'Personalizado'}));
                    }}
                  >
                    <div className="mt-0.5">
                      {formData.permisos[perm.key] ? (
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${formData.permisos[perm.key] ? 'text-blue-800' : 'text-slate-600'}`}>{perm.label}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">{perm.desc}</p>
                    </div>
                    <div className="ml-auto">
                      <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${formData.permisos[perm.key] ? 'bg-blue-600' : 'bg-slate-300'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${formData.permisos[perm.key] ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded text-sm font-medium border border-slate-300 transition-colors"
              >
                Cancelar
              </button>
              
              <button 
                type="submit" 
                disabled={isSaving} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow flex items-center gap-2 font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? <AlertCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                {isSaving ? 'Guardando...' : 'Guardar Trabajador'}
              </button>
            </div>
          </div>
        </form>

        {/* Modal de confirmación al eliminar desde la edición */}
        {deleteModal.open && deleteModal.trabajador && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">¿Eliminar este trabajador?</h3>
                  <p className="text-xs text-slate-500">Esta acción no se puede deshacer.</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-sm space-y-1">
                <div><span className="text-slate-500 text-xs">Nombre:</span> <strong className="text-slate-800">{deleteModal.trabajador.nombre}</strong></div>
                <div><span className="text-slate-500 text-xs">Usuario:</span> <code className="bg-slate-200 px-1 py-0.5 rounded text-xs text-slate-800 font-bold">{deleteModal.trabajador.usuario}</code></div>
                <div><span className="text-slate-500 text-xs">Rol:</span> <span className="text-slate-700 font-medium">{deleteModal.trabajador.rol}</span></div>
              </div>

              <p className="text-xs text-red-600 font-medium">
                Al eliminar este trabajador, su sesión se cerrará de forma automática e inmediata y nunca más podrá acceder al sistema.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ open: false, trabajador: null })}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteModal.trabajador)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow transition-colors disabled:opacity-50"
                >
                  {isDeleting ? <AlertCircle className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Permanentemente'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-slate-700" />
          <h1 className="text-xl font-semibold text-slate-800 uppercase tracking-wide">
            Gestión de Trabajadores
          </h1>
        </div>
        
        <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Trabajador
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-3 rounded text-sm mb-4 border border-green-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
          <span>{successMsg}</span>
        </div>
      )}
      
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500">Cargando trabajadores...</div>
      ) : (
        <DataTable data={trabajadores} columns={columns} itemsPerPage={10} />
      )}

      {/* Modal de confirmación para eliminar */}
      {deleteModal.open && deleteModal.trabajador && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">¿Eliminar este trabajador?</h3>
                <p className="text-xs text-slate-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-sm space-y-1">
              <div><span className="text-slate-500 text-xs">Nombre:</span> <strong className="text-slate-800">{deleteModal.trabajador.nombre}</strong></div>
              <div><span className="text-slate-500 text-xs">Usuario:</span> <code className="bg-slate-200 px-1 py-0.5 rounded text-xs text-slate-800 font-bold">{deleteModal.trabajador.usuario}</code></div>
              <div><span className="text-slate-500 text-xs">Rol:</span> <span className="text-slate-700 font-medium">{deleteModal.trabajador.rol}</span></div>
            </div>

            <p className="text-xs text-red-600 font-medium">
              Al eliminar este trabajador, su sesión se cerrará de forma automática e inmediata y nunca más podrá acceder al sistema.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, trabajador: null })}
                disabled={isDeleting}
                className="px-4 py-2 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteModal.trabajador)}
                disabled={isDeleting}
                className="px-4 py-2 rounded text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow transition-colors disabled:opacity-50"
              >
                {isDeleting ? <AlertCircle className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
