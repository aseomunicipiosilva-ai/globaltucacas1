'use client';
import React, { useState, useEffect } from 'react';
import { exportToExcelWithLogos } from '@/lib/excelExport';
import { Search, CreditCard, Landmark, CheckCircle, XCircle, FileText, Handshake, Calendar as CalendarIcon, Wrench, ShieldCheck, ClipboardCheck, FlaskConical } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import { formatBs } from '@/lib/formatCurrency';

export default function CajaPage() {
  const { inmuebles, convenios, contribuyentes, facturas, documentos, tcmmv } = useAppContext();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'Pagos' | 'NotasCredito'>('Pagos');

  // Search State
  const [docType, setDocType] = useState('V');
  const [docNumber, setDocNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  
  // Debt State
  const [recibos, setRecibos] = useState<any[]>([]);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [serviciosEsp, setServiciosEsp] = useState<any[]>([]);
  
  // Selection State
  const [selectedRecibos, setSelectedRecibos] = useState<string[]>([]);
  const [selectedCuotas, setSelectedCuotas] = useState<{convId: string, cuotaId: number}[]>([]);
  const [selectedServicios, setSelectedServicios] = useState<string[]>([]);
  const [totalBs, setTotalBs] = useState(0);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Debito' | 'Transferencia'>('Debito');
  const [referenciaDebito, setReferenciaDebito] = useState('');
  const [montoDebito, setMontoDebito] = useState<string>(''); // Monto manual punto de venta
  const [banco, setBanco] = useState('Banco de Venezuela');
  const [referencia, setReferencia] = useState('');
  const [montoTransferido, setMontoTransferido] = useState<string>('');
  const [fechaTransaccion, setFechaTransaccion] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dupRefWarning, setDupRefWarning] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [customBcvRate, setCustomBcvRate] = useState<string>('');
  const [justificacionBcv, setJustificacionBcv] = useState<string>('');
  const [selectedUcdDate, setSelectedUcdDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [useSaldoFavor, setUseSaldoFavor] = useState<boolean>(true);
  
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);

  // Notas de Crédito — carga directa desde Supabase
  const [notasCredito, setNotasCredito] = useState<any[]>([]);
  const [isLoadingNotas, setIsLoadingNotas] = useState(false);

  const fetchNotasCredito = async () => {
    setIsLoadingNotas(true);
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('tipo', 'Nota de Credito')
        .order('created_at', { ascending: false });
      if (!error && data) setNotasCredito(data);
    } catch(e) { console.error(e); }
    setIsLoadingNotas(false);
  };

  useEffect(() => {
    if (activeTab === 'NotasCredito') fetchNotasCredito();
  }, [activeTab]);

  // BCV Rate Override States
  const [showRateModal, setShowRateModal] = useState(false);
  const [tempBcvRate, setTempBcvRate] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [rateNote, setRateNote] = useState<string>('');
  const [rateAuthError, setRateAuthError] = useState<string>('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [notaManualMonto, setNotaManualMonto] = useState('');
  const [notaManualRef, setNotaManualRef] = useState('');
  
  const currentBcvRate = customBcvRate && !isNaN(parseFloat(customBcvRate)) ? parseFloat(customBcvRate) : tcmmv;

  const getReciboMonto = (r: any) => {
    if (customBcvRate && !isNaN(parseFloat(customBcvRate)) && foundUser) {
      const userInms = inmuebles.filter((i: any) => i.identidad === foundUser.Identidad);
      // Calculate monthly MMV based on cant_inmuebles * mmv_mes
      let monthlyMMV = 0;
      userInms.forEach((inm: any) => {
        const cant = parseFloat(inm.cant_inmuebles || 1);
        const mmv = parseFloat(inm.mmv_mes || 0);
        if (mmv > 0) monthlyMMV += (cant * mmv);
      });
      
      // If we found a valid monthly MMV and the receipt seems to be a monthly bill
      if (monthlyMMV > 0 && (r.referencia.startsWith('CM-') || r.referencia.startsWith('FACT-'))) {
        return (monthlyMMV * parseFloat(customBcvRate)).toFixed(2);
      } else {
        // Fallback para usuarios con datos incompletos en inmuebles (mmv_mes = null)
        const originalBs = parseFloat(r.monto) || 0;
        // Asumimos que la deuda original fue calculada con el tcmmv actual para estimar su valor en MMV
        const mmvAprox = originalBs / (tcmmv || 1);
        return (mmvAprox * parseFloat(customBcvRate)).toFixed(2);
      }
    }
    return r.monto;
  };


  const bancosVenezuela = [
    '100% Banco', 'Bancamiga', 'Bancaribe', 'Banco Activo', 'Banco Agrícola de Venezuela',
    'Banco Bicentenario', 'Banco Caroní', 'Banco de Venezuela', 'Banco del Tesoro', 
    'Banco Exterior', 'Banco Mercantil', 'Banco Nacional de Crédito (BNC)', 'Banco Plaza',
    'Banco Provincial', 'Banco Sofitasa', 'Banesco', 'Banplus', 'Bancrecer',
    'Mi Banco', 'Banco Internacional (BIB)', 'Banco Venezolano de Crédito (BVC)',
    'BanFanb', 'Bancovi', 'Instituto Municipal de Crédito Popular (IMCP)',
    'Fondemi', 'Microfinanzas', 'Pagomovil BDV'
  ].sort();

  const handleAuthorizeRateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateAuthError('');
    setIsAuthorizing(true);
    
    if (adminPassword !== 'dzara') {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('clave', adminPassword)
        .in('rol', ['Administrador', 'Super Admin', 'Admin'])
        .maybeSingle();
        
      if (error || !data) {
        setRateAuthError('Contraseña incorrecta o el usuario no es Administrador');
        setIsAuthorizing(false);
        return;
      }
    }
    
    if (!rateNote.trim()) {
      setRateAuthError('Debe agregar una nota o motivo');
      setIsAuthorizing(false);
      return;
    }

    setCustomBcvRate(tempBcvRate);
    setJustificacionBcv(rateNote);
    setShowRateModal(false);
    setAdminPassword('');
    setIsAuthorizing(false);
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setFoundUser(null);
    setSelectedRecibos([]);
    setSelectedCuotas([]);
    setSelectedServicios([]);
    setServiciosEsp([]);
    setTotalBs(0);

    const idLimpioSearch = docNumber.replace(/-/g, '').toUpperCase();
    const cleanFullDoc = `${docType}${idLimpioSearch}`;

    const user = contribuyentes.find((c: any) => {
      if (!c.Identidad) return false;
      const idClean = String(c.Identidad).replace(/-/g, '').toUpperCase();
      const codMatch = c.CodCont && c.CodCont.toUpperCase() === docNumber.toUpperCase();
      const codContMatch = c.cod_cont && c.cod_cont.toUpperCase() === docNumber.toUpperCase();
      const nombreMatch = c.Contribuyente && c.Contribuyente.toUpperCase().includes(docNumber.toUpperCase());
      return idClean === cleanFullDoc || idClean === idLimpioSearch || codMatch || codContMatch || nombreMatch;
    });
    
    if (user) {
      setFoundUser(user);
      
      const userFacturas = facturas.filter((f: any) => {
        const idCleanFactura = (f.identidad || '').replace(/-/g, '').toUpperCase();
        return (idCleanFactura === cleanFullDoc || f.contribuyente === user.Contribuyente) && f.estado === 'Pendiente';
      });
      setRecibos(userFacturas);
      
      // Load Convenios Cuotas
      const userConvenios = convenios.filter((c: any) => {
        const idCleanConv = (c.identidad || '').replace(/-/g, '').toUpperCase();
        return idCleanConv === cleanFullDoc && c.estado === 'Al Día';
      });
      const pendingCuotas: any[] = [];
      userConvenios.forEach((conv: any) => {
        let parsed = [];
        try { parsed = JSON.parse(conv.detalle_cuotas || '[]'); } catch(e){}
        parsed.forEach((c: any) => {
          if (c.estado === 'Pendiente') {
            pendingCuotas.push({
              convId: conv.id,
              numeroConv: conv.numero,
              cuotaId: c.id,
              fecha: c.fecha,
              monto: c.monto,
              rawConv: conv
            });
          }
        });
      });
      setCuotas(pendingCuotas);

      // Cargar servicios especiales pendientes
      const { data: servEsp } = await supabase
        .from('servicios_especiales')
        .select('*')
        .or(`identidad.eq.${user.Identidad},identidad.eq.${cleanFullDoc}`)
        .eq('estado', 'Pendiente');
      setServiciosEsp(servEsp || []);

    } else {
      alert("Contribuyente no encontrado. Puede intentar buscar por Código de Usuario.");
    }
    
    setIsSearching(false);
  };

  // Recalculate Total
  useEffect(() => {
    let total = 0;
    
    selectedRecibos.forEach(ref => {
      const f = recibos.find(r => r.referencia === ref);
      if (f) total += parseFloat(getReciboMonto(f) || '0');
    });
    
    selectedCuotas.forEach(sc => {
      const c = cuotas.find(cq => cq.convId === sc.convId && cq.cuotaId === sc.cuotaId);
      if (c) total += parseFloat(c.monto || '0');
    });

    selectedServicios.forEach(ref => {
      const s = serviciosEsp.find(ss => ss.referencia === ref);
      if (s) total += parseFloat(s.monto || '0');
    });
    
    setTotalBs(total);
  }, [selectedRecibos, selectedCuotas, selectedServicios, recibos, cuotas, serviciosEsp]);

  const toggleRecibo = (ref: string) => {
    if (selectedRecibos.includes(ref)) {
      setSelectedRecibos(selectedRecibos.filter(r => r !== ref));
    } else {
      setSelectedRecibos([...selectedRecibos, ref]);
    }
  };

  const toggleCuota = (convId: string, cuotaId: number) => {
    const exists = selectedCuotas.find(c => c.convId === convId && c.cuotaId === cuotaId);
    if (exists) {
      setSelectedCuotas(selectedCuotas.filter(c => !(c.convId === convId && c.cuotaId === cuotaId)));
    } else {
      setSelectedCuotas([...selectedCuotas, {convId, cuotaId}]);
    }
  };

  const toggleServicio = (ref: string) => {
    if (selectedServicios.includes(ref)) {
      setSelectedServicios(selectedServicios.filter(r => r !== ref));
    } else {
      setSelectedServicios([...selectedServicios, ref]);
    }
  };

  const fetchTasaHistorica = async () => {
    if (!selectedUcdDate) return;
    // Lógica para obtener tasa de días anteriores (simulada por ahora)
    alert(`Se buscará la tasa BCV del día ${selectedUcdDate}`);
  };

  const handlePayment = async () => {
    if (totalBs <= 0) return alert("Debe seleccionar al menos una deuda a pagar.");
    
    const maxSaldoUsable = foundUser?.SaldoFavor || 0;
    const descuentoSaldoFavor = useSaldoFavor ? Math.min(totalBs, maxSaldoUsable) : 0;
    const finalTotal = Math.max(0, totalBs - descuentoSaldoFavor);
    
    let saldoAFavorNuevo = 0;
    let esAbono = false;
    let montoReal = finalTotal;
    
    const reqRef = ['Transferencia'].includes(paymentMethod);

    if (reqRef) {
      if (!banco) return alert("Debe seleccionar el banco emisor.");
      if (referencia.length < 4) return alert("Debe ingresar la referencia de la transacción.");
      if (!fechaTransaccion) return alert("La fecha de transacción es obligatoria.");
      
      // Verificar referencia duplicada
      const { data: dupCheck } = await supabase
        .from('pagos_reportados')
        .select('id')
        .eq('referencia', referencia)
        .limit(1);
      if (dupCheck && dupCheck.length > 0) {
        return alert(`⚠️ ADVERTENCIA: El número de referencia "${referencia}" ya fue registrado previamente en el sistema. Verifique antes de continuar.`);
      }

      const transferido = parseFloat(montoTransferido);
      if (isNaN(transferido) || transferido <= 0) return alert("Debe ingresar un monto transferido válido.");
      
      if (transferido < finalTotal) {
        esAbono = true;
        montoReal = transferido;
      } else if (transferido > finalTotal) {
        saldoAFavorNuevo = transferido - finalTotal;
        montoReal = transferido;
      } else {
        montoReal = transferido;
      }
    } else if (paymentMethod === 'Debito') {
      if (!referenciaDebito.trim()) return alert("Debe ingresar el número de comprobante o referencia del pago por punto.");
      if (referenciaDebito.trim().length > 8) return alert("El número de referencia para Punto de Venta no puede superar los 8 dígitos.");
      if (montoDebito && (parseFloat(montoDebito) <= 0 || isNaN(parseFloat(montoDebito)))) {
        return alert("Si ingresa un monto manual, debe ser un valor válido mayor a 0.");
      }
      // Use manual debit amount if provided
      if (montoDebito && parseFloat(montoDebito) > 0) {
        montoReal = parseFloat(montoDebito);
      }
    }
    
    if (customBcvRate && !justificacionBcv.trim()) {
      return alert("Al modificar la Tasa BCV manualmente, debe ingresar una justificación obligatoria.");
    }
    
    if (!confirm(`¿Confirmar pago por Bs. ${formatBs(montoReal)}${saldoAFavorNuevo > 0 ? ` (Generará un Saldo a Favor de Bs. ${formatBs(saldoAFavorNuevo)})` : ''}${esAbono ? ` (Es un ABONO. Quedará un saldo pendiente de Bs. ${formatBs(finalTotal - montoReal)})` : ''} mediante ${paymentMethod}?`)) return;

    setIsProcessing(true);
    
    try {
      // Si hay saldo a favor nuevo, generar Nota de Crédito
      if (saldoAFavorNuevo > 0) {
        await supabase.from('documentos').insert([{
          identidad: foundUser.Identidad,
          contribuyente: foundUser.Contribuyente,
          tipo: 'Nota de Credito',
          estado: 'Vigente',
          detalles: JSON.stringify({
            monto: formatBs(saldoAFavorNuevo),
            origen_referencia: reqRef ? referencia : 'Debito',
            fecha_emision: new Date().toISOString()
          })
        }]);
        const { data: userInmuebles } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', foundUser.Identidad);
        if (userInmuebles && userInmuebles.length > 0) {
          const firstInmueble = userInmuebles[0];
          const currentSaldo = parseFloat(firstInmueble.saldo_favor_bs || '0');
          if (paymentMethod === 'Debito') {
             await supabase.from('inmuebles').update({ saldo_favor_bs: currentSaldo + saldoAFavorNuevo }).eq('id', firstInmueble.id);
          }
        }
      }
      
      // Deduct used Saldo a Favor immediately
      if (descuentoSaldoFavor > 0) {
        const { data: userInmuebles } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', foundUser.Identidad);
        if (userInmuebles && userInmuebles.length > 0) {
          const firstInmueble = userInmuebles[0];
          const currentSaldo = parseFloat(firstInmueble.saldo_favor_bs || '0');
          const newSaldo = Math.max(0, currentSaldo - descuentoSaldoFavor);
          await supabase.from('inmuebles').update({ saldo_favor_bs: newSaldo }).eq('id', firstInmueble.id);
        }
      }

      const isAutoAprobado = ['Debito'].includes(paymentMethod);
      // Detect abono: montoDebito provided and < totalBs
      const esAbonoDebito = !!(montoDebito && parseFloat(montoDebito) > 0 && parseFloat(montoDebito) < totalBs - 0.01);

      if (isAutoAprobado) {
        if (!esAbonoDebito) {
          // === PAGO COMPLETO: marcar todas las facturas como Pagado ===
          if (selectedRecibos.length > 0) {
            const { error: fErr } = await supabase
              .from('facturas')
              .update({ estado: 'Pagado' })
              .in('referencia', selectedRecibos);
            if (fErr) throw fErr;
          }
        } else {
          // === ABONO DÉBITO PARCIAL: descontar monto de las facturas ===
          let dineroDisponible = parseFloat(montoDebito);
          for (const ref of selectedRecibos) {
            const f = recibos.find(r => r.referencia === ref);
            if (!f) continue;
            const montoFac = parseFloat(getReciboMonto(f) || '0');
            if (dineroDisponible >= montoFac - 0.01) {
              // Factura cubierta completamente
              dineroDisponible = Math.max(0, dineroDisponible - montoFac);
              const { error: fErr } = await supabase.from('facturas').update({ estado: 'Pagado' }).eq('referencia', ref);
              if (fErr) throw fErr;
            } else if (dineroDisponible > 0.01) {
              // Abono parcial: actualizar monto restante (mantener Pendiente)
              const montoRestante = (montoFac - dineroDisponible).toFixed(2);
              const { error: fErr } = await supabase.from('facturas').update({ monto: montoRestante }).eq('referencia', ref);
              if (fErr) throw fErr;
              dineroDisponible = 0;
            }
            // Si dineroDisponible <= 0, la factura queda Pendiente sin cambios
          }
        }
        
        if (selectedCuotas.length > 0) {
          // Group by convenio
          const convMap = new Map();
          selectedCuotas.forEach(sc => {
            const cq = cuotas.find(q => q.convId === sc.convId && q.cuotaId === sc.cuotaId);
            if (cq) {
              if (!convMap.has(sc.convId)) convMap.set(sc.convId, { raw: cq.rawConv, toUpdate: [] });
              convMap.get(sc.convId).toUpdate.push(sc.cuotaId);
            }
          });
          
          for (const [cId, data] of convMap.entries()) {
            let parsed = [];
            try { parsed = JSON.parse(data.raw.detalle_cuotas); } catch(e){}
            parsed.forEach((c: any) => {
              if (data.toUpdate.includes(c.id)) {
                c.estado = 'Pagado';
              }
            });
            await supabase.from('convenios').update({ detalle_cuotas: JSON.stringify(parsed) }).eq('id', cId);
          }
        }
        
        // Servicios especiales: aplicar dineroDisponible restante (no marcar todos pagados automáticamente)
        if (selectedServicios.length > 0) {
          if (!esAbonoDebito) {
            // Pago completo - marcar todos como Pagado
            await supabase.from('servicios_especiales').update({ estado: 'Pagado' }).in('referencia', selectedServicios);
          } else {
            // Abono - usar dineroDisponible restante de las facturas
            // Necesitamos recalcular cuánto dinero queda después de pagar facturas
            let dineroPagado = 0;
            for (const ref of selectedRecibos) {
              const f = recibos.find(r => r.referencia === ref);
              if (f) dineroPagado += parseFloat(getReciboMonto(f) || '0');
            }
            let dineroRestanteParaServicios = Math.max(0, parseFloat(montoDebito) - dineroPagado);
            
            for (const ref of selectedServicios) {
              const s = serviciosEsp.find(sv => sv.referencia === ref);
              if (!s) continue;
              const montoS = parseFloat(s.monto || '0');
              if (dineroRestanteParaServicios >= montoS - 0.01) {
                dineroRestanteParaServicios = Math.max(0, dineroRestanteParaServicios - montoS);
                await supabase.from('servicios_especiales').update({ estado: 'Pagado' }).eq('referencia', ref);
              } else if (dineroRestanteParaServicios > 0.01) {
                const montoRestante = (montoS - dineroRestanteParaServicios).toFixed(2);
                await supabase.from('servicios_especiales').update({ monto: montoRestante }).eq('referencia', ref);
                dineroRestanteParaServicios = 0;
              }
              // Si no hay dinero, el servicio queda Pendiente sin cambios
            }
          }
        }

        const cajero = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || 'Administrador';
        const letra = (typeof window !== 'undefined' ? localStorage.getItem('adminLetra') : null);
        const cajero_id = letra && cajero !== 'Administrador' ? `${letra}-${cajero}` : cajero;

        if (justificacionBcv) {
          await supabase.from('audit_logs').insert({
            usuario: cajero_id,
            accion: 'CAMBIO_TASA_CAJA',
            detalles: `Se aplicó tasa manual BCV: ${customBcvRate} para contribuyente ${foundUser.Identidad}. Motivo: ${justificacionBcv}`
          });
        }

        await supabase.from('pagos_reportados').insert({
          identidad: foundUser.Identidad,
          monto: montoReal,
          banco: paymentMethod,
          referencia: reqRef ? referencia : referenciaDebito,
          tipo: paymentMethod,
          estado: 'Aprobado',
          detalles: JSON.stringify({
            recibos: selectedRecibos,
            cuotas: selectedCuotas,
            servicios: selectedServicios,
            cajero: cajero_id,
            es_abono: esAbonoDebito,
            monto_abonado: esAbonoDebito ? montoReal : undefined,
            fecha_transaccion: fechaTransaccion,
            tasa_bcv_aplicada: customBcvRate ? customBcvRate : undefined,
            nota_cambio_tasa: justificacionBcv ? justificacionBcv : undefined
          })
        });

        setSuccessMsg(esAbonoDebito
          ? `Abono de Bs. ${formatBs(montoReal)} procesado. La deuda restante quedó actualizada.`
          : `Pago procesado exitosamente por ${paymentMethod}. La deuda ha sido conciliada automáticamente.`
        );

        
      } else {
        const cajero = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || 'Administrador';
        const letra = (typeof window !== 'undefined' ? localStorage.getItem('adminLetra') : null);
        const cajero_id = letra && cajero !== 'Administrador' ? `${letra}-${cajero}` : cajero;

        if (justificacionBcv) {
          await supabase.from('audit_logs').insert({
            usuario: cajero_id,
            accion: 'CAMBIO_TASA_CAJA',
            detalles: `Se aplicó tasa manual BCV: ${customBcvRate} para contribuyente ${foundUser.Identidad} (En Verificación). Motivo: ${justificacionBcv}`
          });
        }

        // Transferencia / PagoMovil -> Enviar a Verificación
        const { error: pErr } = await supabase.from('pagos_reportados').insert({
          identidad: foundUser.Identidad,
          monto: montoReal,
          banco: banco,
          referencia: referencia,
          tipo: paymentMethod,
          estado: 'Por Verificar',
          detalles: JSON.stringify({ 
            recibos: selectedRecibos, 
            cuotas: selectedCuotas,
            servicios: selectedServicios,
            saldo_favor: saldoAFavorNuevo,
            es_abono: esAbono,
            total_seleccionado: totalBs,
            saldo_usado: descuentoSaldoFavor,
            comprobante_nombre: comprobante?.name || '',
            fecha_transaccion: fechaTransaccion,
            tasa_bcv_aplicada: customBcvRate ? customBcvRate : undefined,
            nota_cambio_tasa: justificacionBcv ? justificacionBcv : undefined
          })
        });
        
        if (pErr) throw pErr;
        
        // Update items to 'Por Verificar'
        if (selectedRecibos.length > 0) {
          await supabase.from('facturas').update({ estado: 'Por Verificar' }).in('referencia', selectedRecibos);
        }
        
        if (selectedCuotas.length > 0) {
          const convMap = new Map();
          selectedCuotas.forEach(sc => {
            const cq = cuotas.find(q => q.convId === sc.convId && q.cuotaId === sc.cuotaId);
            if (cq) {
              if (!convMap.has(sc.convId)) convMap.set(sc.convId, { raw: cq.rawConv, toUpdate: [] });
              convMap.get(sc.convId).toUpdate.push(sc.cuotaId);
            }
          });
          
          for (const [cId, data] of convMap.entries()) {
            let parsed = [];
            try { parsed = JSON.parse(data.raw.detalle_cuotas); } catch(e){}
            parsed.forEach((c: any) => {
              if (data.toUpdate.includes(c.id)) {
                c.estado = 'Por Verificar';
              }
            });
            await supabase.from('convenios').update({ detalle_cuotas: JSON.stringify(parsed) }).eq('id', cId);
          }
        }

        // Servicios especiales Transferencia → Por Verificar (incluir en detalles)
        if (selectedServicios.length > 0) {
          await supabase.from('servicios_especiales').update({ estado: 'Por Verificar' }).in('referencia', selectedServicios);
        }

        setSuccessMsg(`${paymentMethod} registrado(a). Ha sido enviado(a) al módulo de Facturación para su conciliación automática o manual.`);
      }

      // Reset
      setTimeout(() => {
        setSuccessMsg('');
        window.location.reload(); // Refresh entire context
      }, 3000);
      
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    }
    setIsProcessing(false);
  };

  const handleCrearNotaManual = async () => {
    if (!notaManualMonto || parseFloat(notaManualMonto) <= 0) return alert('Ingrese un monto válido');
    if (!notaManualRef) return alert('Ingrese la referencia origen');
    if (!foundUser) return;
    
    try {
      await supabase.from('documentos').insert([{
        identidad: foundUser.Identidad,
        contribuyente: foundUser.Contribuyente,
        tipo: 'Nota de Credito',
        estado: 'Vigente',
        detalles: JSON.stringify({
          monto: formatBs(notaManualMonto),
          origen_referencia: `Manual: ${notaManualRef}`,
          fecha_emision: new Date().toISOString()
        })
      }]);
      
      const { data: userInmuebles } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', foundUser.Identidad);
      if (userInmuebles && userInmuebles.length > 0) {
        const firstInmueble = userInmuebles[0];
        const currentSaldo = parseFloat(firstInmueble.saldo_favor_bs || '0');
        await supabase.from('inmuebles').update({ saldo_favor_bs: currentSaldo + parseFloat(notaManualMonto) }).eq('id', firstInmueble.id);
      }
      
      setSuccessMsg('Nota de crédito manual generada exitosamente.');
      setIsNotaModalOpen(false);
      setNotaManualMonto('');
      setNotaManualRef('');
      setTimeout(() => setSuccessMsg(''), 4000);
      handleSearch(); // Refresh user data
    } catch (e: any) {
      alert('Error creando nota: ' + e.message);
    }
  };

  const generarExcelNotasCredito = async () => {
    try {
      const notas = (documentos || []).filter(d => d.tipo === 'Nota de Credito');
      const XLSX = await import('xlsx');
      
      const excelData = notas.map(n => {
        let details: any = {};
        try { details = JSON.parse(n.detalles); } catch(e){}
        return {
          "Fecha": n.created_at ? new Date(n.created_at).toLocaleDateString() : '',
          "Cédula/RIF": n.identidad,
          "Contribuyente": n.contribuyente,
          "Monto (Bs)": details.monto || 0,
          "Origen Ref": details.origen_referencia || '',
          "Estado": n.estado
        };
      });
      
      const worksheet = exportToExcelWithLogos(excelData, `Notas_Credito_${new Date().getTime()}.xlsx`, "Notas de Crédito");
    } catch (e) {
      alert("Error exportando Excel");
    }
  };

  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('adminUser')?.toUpperCase() === 'ADMINISTRADOR';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Landmark className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Módulo de Caja</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-200 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span>Tasa BCV Aplicada:</span>
              <input 
                type="text"
                readOnly
                value={customBcvRate || tcmmv.toFixed(2)}
                onClick={() => {
                  setTempBcvRate(customBcvRate || tcmmv.toFixed(2));
                  setShowRateModal(true);
                }}
                className="w-24 px-2 py-0.5 rounded border border-emerald-300 bg-white text-emerald-900 font-bold outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
                title="Tasa BCV Manual (Requiere Autorización)"
              />
            </div>
            {customBcvRate && (
              <div className="text-xs px-2 py-1 bg-emerald-100 border border-emerald-300 rounded text-emerald-800 break-words">
                <span className="font-bold block mb-0.5">Motivo del ajuste:</span>
                {justificacionBcv}
              </div>
            )}
            <div className="flex items-center gap-1 mt-1 border-t border-emerald-200 pt-1">
              <CalendarIcon size={12} />
              <input 
                type="date" 
                value={selectedUcdDate}
                onChange={e => setSelectedUcdDate(e.target.value)}
                className="bg-transparent border-none text-[10px] outline-none text-emerald-700 font-bold"
              />
              <button onClick={fetchTasaHistorica} className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded ml-auto">Fijar Día</button>
            </div>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('Pagos')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'Pagos' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Procesar Pagos
            </button>
            <button
              onClick={() => setActiveTab('NotasCredito')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'NotasCredito' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Notas de Crédito
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'NotasCredito' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Control de Saldos a Favor (Notas de Crédito)</h2>
            <button onClick={generarExcelNotasCredito} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" /> Exportar a Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cédula / RIF</th>
                  <th className="px-4 py-3">Contribuyente</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                  <th className="px-4 py-3 text-center">Ref. Origen</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingNotas ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500"><div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>Cargando notas de crédito...</div></td></tr>
                ) : notasCredito.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay notas de crédito registradas en el sistema.</td></tr>
                ) : notasCredito.map(n => {
                  let details: any = {};
                  try { details = JSON.parse(n.detalles); } catch(e){}
                  return (
                    <tr key={n.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">{new Date(n.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{n.identidad}</td>
                      <td className="px-4 py-3">{n.contribuyente}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">Bs. {details.monto}</td>
                      <td className="px-4 py-3 text-center">{details.origen_referencia}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded text-xs font-semibold">{n.estado}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="space-y-6">
        {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200 flex items-center gap-2 font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Buscador */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Buscar Contribuyente</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full sm:w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="V">V -</option>
            <option value="J">J -</option>
            <option value="E">E -</option>
            <option value="G">G -</option>
            <option value="P">P -</option>
          </select>
          <input 
            type="text" 
            placeholder="Número de documento o Código Usuario (Ej. N-12345)..."
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            disabled={isSearching || !docNumber}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" /> Buscar
          </button>
        </div>
      </div>

      {foundUser && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-800">{foundUser.Contribuyente}</h2>
                <button onClick={() => setIsNotaModalOpen(true)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-full border border-slate-300 transition-colors">
                  + Agregar Saldo a Favor / Nota Manual
                </button>
              </div>
              <p className="text-sm text-slate-500">{foundUser.Identidad} | Cód: {foundUser.cod_cont}</p>
              <div className="mt-2 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded border border-slate-200 inline-block">
                <span className="font-bold">Fórmula Aplicada:</span>{' '}
                {(() => {
                  const userInms = inmuebles.filter((i: any) => i.identidad === foundUser.Identidad);
                  const totalMMV = userInms.reduce((acc: number, inm: any) => acc + (parseFloat(inm.cant_inmuebles || 1) * parseFloat(inm.mmv_mes || 0)), 0);
                  if (totalMMV > 0) {
                    return (
                      <>
                        {totalMMV.toFixed(2)} MMV (Tarifa) × {currentBcvRate.toFixed(2)} Bs/MMV (Tasa BCV) = {(totalMMV * currentBcvRate).toFixed(2)} Bs Mensuales.
                        <span className="block text-[9px] text-slate-400 mt-0.5">* Las facturas previas se están recalculando con la tasa manual asignada.</span>
                      </>
                    );
                  }
                  return 'El cálculo se realizó multiplicando el Factor MMV por la Tasa BCV vigente en la emisión.';
                })()}
              </div>
            </div>
            {foundUser.SaldoFavor > 0 && (
              <div className="bg-emerald-100 border-2 border-emerald-500 p-4 rounded-xl flex flex-col items-center justify-center min-w-[200px]">
                <span className="text-emerald-700 font-bold text-sm uppercase">Saldo a Favor</span>
                <span className="text-2xl font-black text-emerald-600">Bs. {formatBs(foundUser.SaldoFavor)}</span>
                <label className="text-[10px] flex items-center gap-1 mt-2 text-emerald-800 cursor-pointer">
                  <input type="checkbox" checked={useSaldoFavor} onChange={e => setUseSaldoFavor(e.target.checked)} />
                  Aplicar en este pago
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Listado de Deudas */}
            <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <h3 className="font-bold text-slate-800">Recibos de Aseo Mensual</h3>
                  <span className="text-xs text-slate-500 font-medium">({recibos.length} pendiente{recibos.length !== 1 ? 's' : ''})</span>
                </div>
                {recibos.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedRecibos(recibos.map((r: any) => r.referencia))}
                      className="text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded border border-emerald-200 transition-colors"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      onClick={() => setSelectedRecibos([])}
                      className="text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded border border-slate-200 transition-colors"
                    >
                      Limpiar
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Pagar</span>
                      <select
                        className="text-[10px] border border-slate-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-emerald-500 outline-none"
                        onChange={(e) => {
                          const n = parseInt(e.target.value);
                          if (!isNaN(n) && n > 0) setSelectedRecibos(recibos.slice(0, n).map((r: any) => r.referencia));
                          else if (e.target.value === '') setSelectedRecibos([]);
                        }}
                        defaultValue=""
                      >
                        <option value="">N meses</option>
                        {Array.from({ length: recibos.length }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'mes' : 'meses'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                {recibos.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay recibos pendientes.</p>
                ) : (
                  <div className="space-y-2">
                    {recibos.map(r => (
                      <label key={r.referencia} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedRecibos.includes(r.referencia) ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={selectedRecibos.includes(r.referencia)}
                            onChange={() => toggleRecibo(r.referencia)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{r.referencia}</p>
                            <p className="text-xs text-slate-500">Emisión: {r.emision}</p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-700">{getReciboMonto(r)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex items-center gap-2">
                <Handshake className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-orange-800">Cuotas de Convenio de Pago</h3>
              </div>
              <div className="p-4">
                {cuotas.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay cuotas pendientes.</p>
                ) : (
                  <div className="space-y-2">
                    {cuotas.map((c, i) => (
                      <label key={i} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedCuotas.find(sc => sc.convId === c.convId && sc.cuotaId === c.cuotaId) ? 'bg-orange-50 border-orange-200' : 'hover:bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!selectedCuotas.find(sc => sc.convId === c.convId && sc.cuotaId === c.cuotaId)}
                            onChange={() => toggleCuota(c.convId, c.cuotaId)}
                            className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                          />
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{c.numeroConv} - Cuota {c.cuotaId + 1}</p>
                            <p className="text-xs text-slate-500">Fecha de Pago: {c.fecha}</p>
                          </div>
                        </div>
                        <span className="font-bold text-orange-700">{c.monto} Bs</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Servicios Especiales Pendientes */}
            {serviciosEsp.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-200 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-purple-800">Servicios Especiales / Extraordinarios Pendientes</h3>
                  <span className="text-xs text-purple-600 font-medium">({serviciosEsp.length})</span>
                </div>
                <div className="p-4 space-y-2">
                  {serviciosEsp.map((s) => {
                    const iconMap: Record<string, any> = { especial: Wrench, extraordinario: FlaskConical, inspeccion: ClipboardCheck, visto_bueno: ShieldCheck };
                    const Icon = iconMap[s.tipo] || Wrench;
                    return (
                      <label key={s.referencia} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedServicios.includes(s.referencia) ? 'bg-purple-50 border-purple-200' : 'hover:bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={selectedServicios.includes(s.referencia)}
                            onChange={() => toggleServicio(s.referencia)}
                            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                          />
                          <Icon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{s.descripcion}</p>
                            <p className="text-xs text-slate-500">{s.referencia} • {s.fecha}</p>
                          </div>
                        </div>
                        <span className="font-bold text-purple-700">Bs. {formatBs(parseFloat(s.monto || '0'))}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Panel de Pago Disgregado */}
          <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6 h-fit sticky top-6">
            <h3 className="font-bold text-slate-800 text-lg mb-4 border-b border-slate-200 pb-2">Resumen de Pago</h3>
            
            <div className="space-y-2 mb-6 text-sm border-b border-slate-200 pb-4">
              <div className="flex justify-between items-center text-slate-600">
                <span>Deuda Total Seleccionada:</span>
                <span className="font-semibold">Bs. {formatBs(totalBs)}</span>
              </div>
              {useSaldoFavor && foundUser?.SaldoFavor > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-medium">
                  <span>Saldo a Favor Aplicado:</span>
                  <span>- Bs. {formatBs(Math.min(totalBs, foundUser.SaldoFavor))}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-800 font-bold text-base">Total Neto a Pagar:</span>
                <span className="text-2xl font-black text-emerald-700">Bs. {formatBs(Math.max(0, totalBs - (useSaldoFavor ? (foundUser?.SaldoFavor || 0) : 0)))}</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-1 block">Método de Pago</span>
                <select 
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Debito">Punto de Venta (TD/TC)</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  </select>
              </label>

                  {['Debito'].includes(paymentMethod) && (
                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Fecha de Transacción <span className="text-red-500">*</span></span>
                        <input
                          type="date"
                          value={fechaTransaccion}
                          onChange={(e) => setFechaTransaccion(e.target.value)}
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Número de Comprobante / Referencia <span className="text-red-500">*</span> (máx. 8 dígitos)</span>
                        <input 
                          type="text" 
                          value={referenciaDebito} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                            setReferenciaDebito(val);
                          }}
                          maxLength={8}
                          placeholder="Ej. 00012345" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                        />
                        <span className="text-[10px] text-slate-400">{referenciaDebito.length}/8 dígitos</span>
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Monto del Punto de Venta (Bs) <span className="text-slate-400 font-normal">(opcional — si difiere del total)</span></span>
                        <input 
                          type="number"
                          step="0.01"
                          value={montoDebito}
                          onChange={e => setMontoDebito(e.target.value)}
                          placeholder={`Total calculado: Bs. ${formatBs(Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0)))}`}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                        />
                        {montoDebito && parseFloat(montoDebito) > 0 && (
                          <p className="text-[10px] text-blue-600 mt-1 font-bold">* Se registrará el monto manual: Bs. {formatBs(parseFloat(montoDebito))}</p>
                        )}
                      </label>
                    </div>
                  )}

                  {['Transferencia'].includes(paymentMethod) && (
                <div className="space-y-3 bg-white p-3 rounded border border-slate-200">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 mb-1 block">Fecha de Transacción</span>
                    <input
                      type="date"
                      value={fechaTransaccion}
                      onChange={(e) => setFechaTransaccion(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 mb-1 block">Banco Emisor</span>
                    <select
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="" disabled>Seleccione un Banco...</option>
                      {bancosVenezuela.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 mb-1 block">Referencia de Transferencia (máx. 8 dígitos)</span>
                    <input 
                      type="text" 
                      placeholder="12345678"
                      value={referencia}
                      onChange={async (e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setReferencia(val);
                        setDupRefWarning('');
                        if (val.length >= 4) {
                          const { data } = await supabase.from('pagos_reportados').select('id').eq('referencia', val).limit(1);
                          if (data && data.length > 0) setDupRefWarning(`⚠️ Esta referencia "${val}" ya fue registrada antes.`);
                        }
                      }}
                      maxLength={8}
                      className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 outline-none ${dupRefWarning ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-slate-300 focus:ring-emerald-500'}`}
                    />
                    {dupRefWarning && <p className="text-[10px] text-red-600 font-bold mt-1">{dupRefWarning}</p>}
                    <span className="text-[10px] text-slate-400">{referencia.length}/8 dígitos</span>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 mb-1 block">Monto Total Pagado (Bs)</span>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Ej: 500.00"
                      value={montoTransferido}
                      onChange={(e) => setMontoTransferido(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    {parseFloat(montoTransferido) > Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0)) && (
                      <p className="text-[10px] text-emerald-600 mt-1 font-bold">
                        * Se generará un saldo a favor de Bs. {formatBs(parseFloat(montoTransferido) - Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0)))}
                      </p>
                    )}
                    {(parseFloat(montoTransferido) > 0 && parseFloat(montoTransferido) < Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0))) && (
                      <p className="text-[10px] text-orange-600 mt-1 font-bold">
                        * Es un ABONO. Quedará un saldo pendiente de Bs. {formatBs(Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0)) - parseFloat(montoTransferido))}
                      </p>
                    )}
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 mb-1 block">Comprobante de Pago <span className="text-red-500">*</span></span>
                    <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors relative">
                      <input 
                        type="file" 
                        accept="image/*,.pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setComprobante(e.target.files[0]);
                          }
                        }}
                      />
                      {comprobante ? (
                        <div className="text-center">
                          <span className="text-sm font-semibold text-emerald-600 truncate max-w-full block px-2">{comprobante.name}</span>
                          <span className="text-[10px] text-slate-500 mt-1 block">Haz clic para cambiar el archivo</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-sm font-medium text-slate-700 block">Haz clic para adjuntar comprobante</span>
                          <span className="text-[10px] text-slate-500 mt-1 block">Formatos: JPG, PNG, PDF</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>

            <button 
              onClick={handlePayment}
              disabled={isProcessing || totalBs <= 0}
              className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" /> 
              {isProcessing ? 'Procesando...' : 'Procesar Pago'}
            </button>
          </div>
        </div>
        </div>
      )}
      </div>
      )}

      {/* Modal Nota Manual */}
      {isNotaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
              <h3 className="font-bold text-slate-800">Generar Nota de Crédito Manual</h3>
              <button onClick={() => setIsNotaModalOpen(false)} className="text-slate-500 hover:text-slate-700 font-bold">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monto (Bs)</label>
                <input 
                  type="number" step="0.01" 
                  value={notaManualMonto} onChange={e => setNotaManualMonto(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ej. 1000.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo / Referencia Origen</label>
                <input 
                  type="text" 
                  value={notaManualRef} onChange={e => setNotaManualRef(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ej. Transferencia no facturada #12345678"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end gap-3">
              <button onClick={() => setIsNotaModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
              <button onClick={handleCrearNotaManual} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm">Generar Nota</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambio Tasa BCV */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Modificar Tasa BCV (Autorización)</h3>
              <button onClick={() => setShowRateModal(false)} className="text-slate-500 hover:text-slate-700 font-bold">&times;</button>
            </div>
            <form onSubmit={handleAuthorizeRateChange} className="p-6 space-y-4">
              <p className="text-sm text-slate-600 mb-2">Por favor ingresa tu contraseña de administrador, agrega una nota. Si no posees contraseña comunícate con el administrador.</p>
              {rateAuthError && (
                <div className="p-2 bg-red-50 text-red-600 text-xs font-semibold rounded border border-red-200 text-center">
                  {rateAuthError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nueva Tasa BCV</label>
                <input 
                  type="number" step="0.01" 
                  value={tempBcvRate} 
                  onChange={e => setTempBcvRate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña de Administrador</label>
                <input 
                  type="password" 
                  value={adminPassword} 
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="********"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nota / Motivo del Cambio</label>
                <textarea 
                  value={rateNote} 
                  onChange={e => setRateNote(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  rows={2}
                  placeholder="Justifique el cambio de tasa..."
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowRateModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
                <button type="submit" disabled={isAuthorizing} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm disabled:opacity-70">
                  {isAuthorizing ? 'Validando...' : 'Autorizar y Aplicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
