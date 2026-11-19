import React, { useState, useEffect } from 'react';
import { Building2, Key, CheckCircle, AlertTriangle, X, DollarSign, User, ShieldCheck, Printer, MapPin, Calculator, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface CondoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  condominio: any; // Inmueble padre (condominio)
  currentBcvRate: number;
  onSelectUnidad: (unidad: {
    id: number | string;
    numero_unidad: string;
    propietario: string;
    cedula_rif: string;
    cuotaMesBs: number;
    condominioId: number;
    condominioNombre: string;
    condominioRif: string;
    condominioDireccion: string;
    cantInmuebles: number;
  }) => void;
}

export function CondoSelectorModal({
  isOpen,
  onClose,
  condominio,
  currentBcvRate,
  onSelectUnidad
}: CondoSelectorModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [masterPassword, setMasterPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Unidades
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>('');
  
  // Agregar o seleccionar unidad manual si no está en lista
  const [modoCrearUnidad, setModoCrearUnidad] = useState(false);
  const [manualApto, setManualApto] = useState('');
  const [manualPropietario, setManualPropietario] = useState('');
  const [manualCedula, setManualCedula] = useState('');

  // Propietario editable
  const [propietario, setPropietario] = useState('');
  const [cedulaRif, setCedulaRif] = useState('');

  // Cuota mensual real: 3.00 MMV por apartamento según Ordenanza del Municipio Silva
  const cuotaMesBsCalculada = 3.00 * currentBcvRate; // 3.00 MMV * Tasa BCV (ej: 3 * 992.8 = 2.978,40 Bs)
  const cantInmuebles = parseInt(condominio?.cant_inmuebles || '1', 10) || 1;

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMasterPassword('');
      setAuthError('');
      setSelectedUnidadId('');
      setModoCrearUnidad(false);
      setManualApto('');
      setManualPropietario('');
      setManualCedula('');
      setPropietario('');
      setCedulaRif('');
    }
  }, [isOpen]);

  if (!isOpen || !condominio) return null;

  // 1. Validar Clave Master
  const handleVerifyMaster = async () => {
    setAuthError('');
    if (!masterPassword) {
      setAuthError('Debe ingresar la Clave Master para autorizar este desglose.');
      return;
    }
    if (masterPassword !== 'Omar..') {
      setAuthError('Clave Master incorrecta. Solo supervisores autorizados pueden autorizar cobros individuales.');
      return;
    }

    setLoadingUnidades(true);
    try {
      // 1. Buscar si ya existen unidades creadas
      const { data, error } = await supabase
        .from('unidades_condominio')
        .select('*')
        .eq('condominio_id', condominio.id)
        .order('numero_unidad', { ascending: true });

      if (error) throw error;

      let list = data || [];

      // 2. Si no tiene unidades creadas, generar la lista virtual de apartamentos según cant_inmuebles
      if (list.length === 0 && cantInmuebles > 0) {
        const virtualList = [];
        for (let i = 1; i <= cantInmuebles; i++) {
          virtualList.push({
            id: `virtual-${i}`,
            condominio_id: condominio.id,
            numero_unidad: `Apartamento ${i}`,
            propietario: 'Por asignar',
            cedula_rif: '',
            estado: 'Pendiente',
            isVirtual: true
          });
        }
        list = virtualList;
      }

      setUnidades(list);
      setStep(2);

      const cajero = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || 'Caja';
      await logAudit('Autorización Desglose Individual de Condominio', {
        condominio_id: condominio.id,
        condominio_nombre: condominio.contribuyente,
        autorizado_con: 'Clave Master',
        cajero
      });
    } catch (err: any) {
      alert('Error cargando unidades: ' + err.message);
    } finally {
      setLoadingUnidades(false);
    }
  };

  // Confirmar y pasar a la pantalla de Caja
  const handleConfirmarSeleccion = async () => {
    let numApto = '';
    let propNombre = '';
    let propCedula = '';
    let unidadId: any = selectedUnidadId;

    if (modoCrearUnidad) {
      if (!manualApto.trim()) return alert('Ingrese el número o identificador del apartamento.');
      if (!manualPropietario.trim()) return alert('Ingrese el nombre del propietario.');
      if (!manualCedula.trim()) return alert('Ingrese la cédula del propietario.');
      numApto = manualApto.trim();
      propNombre = manualPropietario.trim();
      propCedula = manualCedula.toUpperCase().trim();
      unidadId = `manual-${Date.now()}`;
    } else {
      if (!selectedUnidadId) return alert('Seleccione un apartamento de la lista.');
      const u = unidades.find(x => String(x.id) === String(selectedUnidadId));
      if (!u) return;
      numApto = u.numero_unidad;
      propNombre = propietario.trim() || (u.propietario !== 'Por asignar' ? u.propietario : '');
      propCedula = cedulaRif.trim() || u.cedula_rif || '';

      if (!propNombre) return alert('Debe ingresar el nombre del propietario.');
      if (!propCedula) return alert('Debe ingresar la cédula del propietario.');
    }

    onSelectUnidad({
      id: unidadId,
      numero_unidad: numApto,
      propietario: propNombre,
      cedula_rif: propCedula,
      cuotaMesBs: cuotaMesBsCalculada,
      condominioId: condominio.id,
      condominioNombre: condominio.contribuyente,
      condominioRif: condominio.identidad,
      condominioDireccion: condominio.direccion || 'Municipio Silva, Tucacas, Falcón',
      cantInmuebles
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">Desglose de Unidades de Condominio</h3>
              <p className="text-xs text-emerald-200 truncate max-w-sm">{condominio.contribuyente}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* PASO 1: CLAVE MASTER */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <span className="font-bold block mb-1">ACCESO RESTRINGIDO - AUTORIZACIÓN REQUERIDA</span>
                  El desglose individual para cobrar un apartamento particular dentro de un condominio requiere autorización de supervisión. Ingrese la <b>Clave Master</b>.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🔒 Ingrese la Clave Master:
                </label>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyMaster()}
                  placeholder="Clave de autorización..."
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                  autoFocus
                />
                {authError && <p className="text-xs text-red-600 font-bold mt-1.5">{authError}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleVerifyMaster}
                  disabled={loadingUnidades}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Key className="w-3.5 h-3.5" />
                  {loadingUnidades ? 'Verificando...' : 'Autorizar y Desglosar'}
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: SELECCIÓN DEL APARTAMENTO */}
          {step === 2 && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Tarjeta con Dirección Real del Condominio y Tarifa Oficial */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dirección del Condominio Matriz:</span>
                </div>
                <p className="text-slate-600 pl-5 text-[11px] leading-relaxed">
                  {condominio.direccion || 'Municipio Silva, Tucacas, Falcón'}
                </p>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                  <div>
                    <span className="text-slate-500">Total Unidades:</span>
                    <span className="font-bold text-slate-700 ml-1.5">{cantInmuebles}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tarifa Oficial por Apto:</span>
                    <span className="font-black text-emerald-700 ml-1.5">
                      3.00 MMV (Bs. {cuotaMesBsCalculada.toFixed(2)}/mes)
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón switch para seleccionar de lista o ingresar número exacto */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Seleccione el Apartamento a Cobrar:
                </label>
                <button
                  type="button"
                  onClick={() => setModoCrearUnidad(!modoCrearUnidad)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline"
                >
                  {modoCrearUnidad ? '← Elegir de la lista' : '+ Ingresar número exacto (ej: Apto 3-B)'}
                </button>
              </div>

              {!modoCrearUnidad ? (
                <div>
                  <select
                    value={selectedUnidadId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setSelectedUnidadId(uid);
                      const u = unidades.find(x => String(x.id) === String(uid));
                      if (u) {
                        setPropietario(u.propietario && u.propietario !== 'Por asignar' && u.propietario !== 'No asignado' ? u.propietario : '');
                        setCedulaRif(u.cedula_rif || '');
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Seleccione Apartamento ({unidades.length} disponibles) --</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.numero_unidad} {u.propietario && u.propietario !== 'Por asignar' && u.propietario !== 'No asignado' ? `· ${u.propietario} (${u.cedula_rif})` : '· (Disponible)'}
                      </option>
                    ))}
                  </select>

                  {/* Datos del Propietario si se seleccionó de la lista */}
                  {selectedUnidadId && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">C.I. / R.I.F. Propietario:</label>
                        <input
                          type="text"
                          value={cedulaRif}
                          onChange={(e) => setCedulaRif(e.target.value)}
                          placeholder="V-12345678"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre Propietario:</label>
                        <input
                          type="text"
                          value={propietario}
                          onChange={(e) => setPropietario(e.target.value)}
                          placeholder="Nombre del titular"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Formulario Manual para Apto Específico (ej: PH-1, Villa 11, Apto 204) */
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Identificador de la Unidad:</label>
                    <input
                      type="text"
                      value={manualApto}
                      onChange={(e) => setManualApto(e.target.value)}
                      placeholder="Ej: Apto 3-B, Villa 11, Penthouse 2"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">C.I. / R.I.F. Propietario:</label>
                      <input
                        type="text"
                        value={manualCedula}
                        onChange={(e) => setManualCedula(e.target.value)}
                        placeholder="V-12345678"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre Propietario:</label>
                      <input
                        type="text"
                        value={manualPropietario}
                        onChange={(e) => setManualPropietario(e.target.value)}
                        placeholder="Nombre completo"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Caja Resumen de Monto a Abrir en Caja */}
              <div className="p-3 bg-emerald-100/60 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-emerald-900 block">TARIFA MENSUAL OFICIAL (ORDENANZA):</span>
                  <span className="text-[11px] text-emerald-700">3.00 MMV por apartamento</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-700">
                    Bs. {cuotaMesBsCalculada.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarSeleccion}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <DollarSign className="w-4 h-4" />
                  Abrir en Caja para Cancelar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
