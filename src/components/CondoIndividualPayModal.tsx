import React, { useState, useEffect } from 'react';
import { Building2, Key, CheckCircle, AlertTriangle, X, DollarSign, User, ShieldCheck, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

interface CondoIndividualPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  condominio: any; // Inmueble padre (condominio)
  currentBcvRate: number;
  onPaymentSuccess?: () => void;
}

export function CondoIndividualPayModal({
  isOpen,
  onClose,
  condominio,
  currentBcvRate,
  onPaymentSuccess
}: CondoIndividualPayModalProps) {
  // Pasos: 1 = Pedir Clave Master, 2 = Seleccionar Unidad y Cobrar, 3 = Éxito y Recibo
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [masterPassword, setMasterPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Unidades del condominio
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [selectedUnidadId, setSelectedUnidadId] = useState<number | null>(null);

  // Formulario de pago individual
  const [mesesAPagar, setMesesAPagar] = useState<number>(1);
  const [metodoPago, setMetodoPago] = useState<'PUNTO' | 'PAGO_MOVIL' | 'EFECTIVO_BS' | 'EFECTIVO_USD' | 'TRANSFERENCIA'>('PUNTO');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [nombrePagador, setNombrePagador] = useState('');
  const [cedulaPagador, setCedulaPagador] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Datos para recibo generado
  const [reciboGenerado, setReciboGenerado] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMasterPassword('');
      setAuthError('');
      setSelectedUnidadId(null);
      setReciboGenerado(null);
    }
  }, [isOpen]);

  if (!isOpen || !condominio) return null;

  // Cálculo de cuota individual
  // Si el condominio tiene cant_inmuebles (ej. 20) y tarifa MMV o deuda
  const cantInmuebles = parseInt(condominio.cant_inmuebles || '1', 10) || 1;
  const mmvCondoTotal = parseFloat(condominio.mmv_mes || '0') || (cantInmuebles * 0.40); // Base residencial promedio
  const cuotaMMVUnidad = mmvCondoTotal / cantInmuebles;
  const cuotaBsUnidadMes = cuotaMMVUnidad * currentBcvRate;
  const montoTotalCobrarBs = cuotaBsUnidadMes * mesesAPagar;

  // 1. Validar Clave Master
  const handleVerifyMaster = async () => {
    setAuthError('');
    if (!masterPassword) {
      setAuthError('Debe ingresar la Clave Master para autorizar este desglose.');
      return;
    }
    if (masterPassword !== 'Omar..') {
      setAuthError('Clave Master incorrecta. Solo supervisores autorizados pueden fragmentar pagos de condominios.');
      return;
    }

    // Autorizado -> Cargar unidades de la base de datos
    setLoadingUnidades(true);
    try {
      const { data, error } = await supabase
        .from('unidades_condominio')
        .select('*')
        .eq('condominio_id', condominio.id)
        .order('numero_unidad', { ascending: true });

      if (error) throw error;
      setUnidades(data || []);
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

  // 2. Procesar el cobro individual y restar de la deuda matriz
  const handleProcesarPagoIndividual = async () => {
    if (!selectedUnidadId) {
      alert('Debe seleccionar la unidad/apartamento que va a pagar.');
      return;
    }
    const unidad = unidades.find(u => u.id === selectedUnidadId);
    if (!unidad) return;

    if (!cedulaPagador.trim()) {
      alert('Debe ingresar la Cédula o RIF del propietario/pagador individual para su recibo.');
      return;
    }
    if (!nombrePagador.trim()) {
      alert('Debe ingresar el Nombre del propietario individual.');
      return;
    }

    setIsProcessing(true);
    try {
      const cajero = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || 'Caja Taquilla';
      const fechaHoy = new Date().toISOString().split('T')[0];
      const horaHoy = new Date().toLocaleTimeString('es-VE');
      const numComprobante = `REC-IND-${Date.now().toString().slice(-7)}`;

      // 1. Registrar recibo en documentos / comprobantes
      await supabase.from('documentos').insert([{
        documento: numComprobante,
        tipo: 'Recibo Individual Condominio',
        fecha: fechaHoy,
        contribuyente: `${nombrePagador.toUpperCase()} (${unidad.numero_unidad} - ${condominio.contribuyente})`,
        identidad: cedulaPagador.toUpperCase().trim(),
        estado: 'Pagado'
      }]);

      // 2. Descontar el monto de la deuda total del Condominio matriz
      // Obtenemos el saldo actual del condominio
      const { data: condoData } = await supabase
        .from('inmuebles')
        .select('saldo, deuda_mmv')
        .eq('id', condominio.id)
        .single();

      const saldoActualBs = parseFloat(condoData?.saldo || '0') || 0;
      const nuevoSaldoBs = Math.max(0, saldoActualBs - montoTotalCobrarBs);
      const nuevaDeudaMmv = (nuevoSaldoBs / currentBcvRate).toFixed(4);

      await supabase
        .from('inmuebles')
        .update({
          saldo: nuevoSaldoBs.toFixed(2),
          deuda_mmv: nuevaDeudaMmv
        })
        .eq('id', condominio.id);

      // 3. Actualizar la ficha de la unidad en unidades_condominio con el propietario verificado
      await supabase
        .from('unidades_condominio')
        .update({
          propietario: nombrePagador.trim(),
          cedula_rif: cedulaPagador.toUpperCase().trim(),
          estado: 'Solvente'
        })
        .eq('id', unidad.id);

      // 4. Auditoría fiscal del pago individual
      await logAudit('Pago Individual Taquilla Condominio', {
        condominio_id: condominio.id,
        condominio_nombre: condominio.contribuyente,
        unidad_id: unidad.id,
        numero_unidad: unidad.numero_unidad,
        propietario: nombrePagador,
        cedula: cedulaPagador,
        monto_bs: montoTotalCobrarBs,
        meses_pagados: mesesAPagar,
        saldo_anterior_condo: saldoActualBs,
        nuevo_saldo_condo: nuevoSaldoBs,
        cajero,
        comprobante: numComprobante
      });

      const datosRecibo = {
        comprobante: numComprobante,
        fecha: fechaHoy,
        hora: horaHoy,
        cajero,
        condominioNombre: condominio.contribuyente,
        condominioRif: condominio.identidad,
        condominioCod: condominio.cod_cont || `ID-${condominio.id}`,
        numeroUnidad: unidad.numero_unidad,
        propietario: nombrePagador,
        cedula: cedulaPagador,
        meses: mesesAPagar,
        cuotaMesBs: cuotaBsUnidadMes,
        totalBs: montoTotalCobrarBs,
        metodo: metodoPago,
        referencia: referenciaPago || 'PAGO DIRECTO EN TAQUILLA',
        saldoRestanteCondominioBs: nuevoSaldoBs
      };

      setReciboGenerado(datosRecibo);
      setStep(3);
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err: any) {
      alert('Error procesando pago individual: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generar PDF del Recibo Individual
  const imprimirReciboPDF = async () => {
    if (!reciboGenerado) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 180] // Formato ticket/recibo institucional de taquilla
    });

    const qrData = `ALCALDIA SILVA - ASEO URBANO\nRECIBO: ${reciboGenerado.comprobante}\nAPTO: ${reciboGenerado.numeroUnidad}\nCONDOMINIO: ${reciboGenerado.condominioNombre}\nPROPIETARIO: ${reciboGenerado.propietario} (${reciboGenerado.cedula})\nMONTO: Bs. ${reciboGenerado.totalBs.toFixed(2)}\nFECHA: ${reciboGenerado.fecha}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 70 });

    doc.setFillColor(15, 81, 50);
    doc.rect(0, 0, 100, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ALCALDÍA DEL MUNICIPIO JOSÉ LAURENCIO SILVA', 50, 6, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SERVICIO AUTÓNOMO DE ASEO URBANO (TUCACAS)', 50, 10, { align: 'center' });
    doc.text('COMPROBANTE OFICIAL DE PAGO INDIVIDUAL', 50, 13.5, { align: 'center' });

    doc.setTextColor(30, 30, 30);
    let y = 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`COMPROBANTE N°: ${reciboGenerado.comprobante}`, 50, y, { align: 'center' });
    y += 5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha/Hora: ${reciboGenerado.fecha} ${reciboGenerado.hora} | Cajero: ${reciboGenerado.cajero}`, 50, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(5, y, 95, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DATOS DEL CONDOMINIO MATRIZ:', 6, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Edificio/Conjunto: ${reciboGenerado.condominioNombre}`, 6, y);
    y += 3.5;
    doc.text(`R.I.F. Condominio: ${reciboGenerado.condominioRif} | Código: ${reciboGenerado.condominioCod}`, 6, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DATOS DE LA UNIDAD Y PROPIETARIO:', 6, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Unidad/Apto: ${reciboGenerado.numeroUnidad}`, 6, y);
    y += 3.5;
    doc.text(`Titular: ${reciboGenerado.propietario.toUpperCase()}`, 6, y);
    y += 3.5;
    doc.text(`C.I. / R.I.F.: ${reciboGenerado.cedula.toUpperCase()}`, 6, y);
    y += 5;
    doc.line(5, y, 95, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DESGLOSE DEL PAGO:', 6, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`Períodos cancelados: ${reciboGenerado.meses} mes(es)`, 6, y);
    y += 3.5;
    doc.text(`Cuota mensual por Apto: Bs. ${reciboGenerado.cuotaMesBs.toFixed(2)}`, 6, y);
    y += 3.5;
    doc.text(`Método: ${reciboGenerado.metodo} (Ref: ${reciboGenerado.referencia.slice(0, 18)})`, 6, y);
    y += 5;

    doc.setFillColor(240, 248, 240);
    doc.rect(5, y, 90, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 81, 50);
    doc.text(`TOTAL CANCELADO: Bs. ${reciboGenerado.totalBs.toFixed(2)}`, 50, y + 6.5, { align: 'center' });
    y += 14;

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.text('* Este pago fue amortizado de la cuenta matriz del condominio.', 50, y, { align: 'center' });
    y += 3;
    doc.text(`Saldo restante global del condominio: Bs. ${reciboGenerado.saldoRestanteCondominioBs.toFixed(2)}`, 50, y, { align: 'center' });
    y += 3;
    doc.text('Válido como comprobante individual para trámites en Catastro y Hacienda.', 50, y, { align: 'center' });
    y += 4;

    doc.addImage(qrDataUrl, 'PNG', 35, y, 30, 30);
    y += 34;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text('Alcaldía del Municipio José Laurencio Silva - Sistema Tributario', 50, y, { align: 'center' });

    doc.save(`Recibo_Individual_${reciboGenerado.numeroUnidad}_${reciboGenerado.cedula}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">Cobro Individual de Unidad en Condominio</h3>
              <p className="text-xs text-emerald-200 truncate max-w-sm">{condominio.contribuyente}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO POR PASO */}
        <div className="p-6">

          {/* PASO 1: VALIDACIÓN DE CLAVE MASTER */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <span className="font-bold block mb-1">ACCESO RESTRINGIDO - AUTORIZACIÓN REQUERIDA</span>
                  El desglose de cuotas individuales para condominios amortiza el saldo matriz y solo puede realizarse en taquilla presencial. Ingrese la <b>Clave Master</b> para desbloquear la nómina de apartamentos.
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
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono"
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

          {/* PASO 2: SELECCIÓN DE UNIDAD Y PROCESO DE COBRO */}
          {step === 2 && (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Resumen Condominio */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Saldo Matriz en Aseo:</span>
                  <span className="font-bold text-red-600 ml-1.5">Bs. {parseFloat(condominio.saldo || '0').toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-500">Total Unidades:</span>
                  <span className="font-bold text-slate-700 ml-1.5">{cantInmuebles}</span>
                </div>
                <div>
                  <span className="text-slate-500">Cuota Base/Apto:</span>
                  <span className="font-bold text-emerald-700 ml-1.5">Bs. {cuotaBsUnidadMes.toFixed(2)}/mes</span>
                </div>
              </div>

              {/* Selector de Apartamento / Unidad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Seleccione la Unidad o Apartamento a Cancelar:
                </label>
                {unidades.length === 0 ? (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800">
                    Este condominio aún no tiene las unidades desglosadas en la base de datos (capacidad declarada: {cantInmuebles} unidades).
                  </div>
                ) : (
                  <select
                    value={selectedUnidadId || ''}
                    onChange={(e) => {
                      const uid = parseInt(e.target.value, 10);
                      setSelectedUnidadId(uid);
                      const u = unidades.find(x => x.id === uid);
                      if (u) {
                        if (u.propietario && u.propietario !== 'No asignado') setNombrePagador(u.propietario);
                        if (u.cedula_rif) setCedulaPagador(u.cedula_rif);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Seleccione Apartamento / Local --</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.numero_unidad} {u.propietario && u.propietario !== 'No asignado' ? `(${u.propietario})` : '(Sin propietario asignado)'} - Estatus: {u.estado || 'Pendiente'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Datos del Propietario Individual */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">C.I. / R.I.F. Propietario:</label>
                  <input
                    type="text"
                    value={cedulaPagador}
                    onChange={(e) => setCedulaPagador(e.target.value)}
                    placeholder="V-12345678"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo Propietario:</label>
                  <input
                    type="text"
                    value={nombrePagador}
                    onChange={(e) => setNombrePagador(e.target.value)}
                    placeholder="Ej: Pastor Peña"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Meses a Pagar y Forma de Pago */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Meses a Cancelar:</label>
                  <select
                    value={mesesAPagar}
                    onChange={(e) => setMesesAPagar(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value={1}>1 Mes</option>
                    <option value={3}>3 Meses (Trimestre)</option>
                    <option value={6}>6 Meses (Semestre)</option>
                    <option value={12}>12 Meses (Año Completo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Pago:</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="PUNTO">Punto de Venta (Tarjeta)</option>
                    <option value="PAGO_MOVIL">Pago Móvil</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="EFECTIVO_BS">Efectivo Bolívares</option>
                    <option value="EFECTIVO_USD">Efectivo Divisas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Referencia / Comprobante Bancario:</label>
                <input
                  type="text"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Número de referencia bancaria o tarjeta..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Total a Cancelar */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-800 font-bold block">TOTAL A COBRAR EN CAJA:</span>
                  <span className="text-[10px] text-emerald-600">Se restará automáticamente de la deuda del Condominio</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-700">Bs. {montoTotalCobrarBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
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
                  onClick={handleProcesarPagoIndividual}
                  disabled={isProcessing || !selectedUnidadId}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <DollarSign className="w-4 h-4" />
                  {isProcessing ? 'Procesando...' : 'Confirmar Pago en Taquilla'}
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: ÉXITO Y GENERACIÓN DE RECIBO */}
          {step === 3 && reciboGenerado && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-800">¡Pago Individual Procesado con Éxito!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comprobante N°: <span className="font-mono font-bold text-slate-700">{reciboGenerado.comprobante}</span>
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Unidad Cancelada:</span>
                  <span className="font-bold text-slate-700">{reciboGenerado.numeroUnidad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Titular:</span>
                  <span className="font-bold text-slate-700">{reciboGenerado.propietario} ({reciboGenerado.cedula})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto Cobrado:</span>
                  <span className="font-bold text-emerald-600">Bs. {reciboGenerado.totalBs.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                  <span className="text-slate-500">Nuevo Saldo Global Condominio:</span>
                  <span className="font-bold text-red-600">Bs. {reciboGenerado.saldoRestanteCondominioBs.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={imprimirReciboPDF}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Imprimir Recibo Individual PDF
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Finalizar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
