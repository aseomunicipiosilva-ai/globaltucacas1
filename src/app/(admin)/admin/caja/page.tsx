'use client';
import React, { useState, useEffect } from 'react';
import { exportToExcelWithLogos } from '@/lib/excelExport';
import { TreePine, Search, CreditCard, Landmark, CheckCircle, XCircle, FileText, Handshake, Calendar as CalendarIcon, Wrench, ShieldCheck, ClipboardCheck, FlaskConical, Printer, X, RefreshCw } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import { formatBs } from '@/lib/formatCurrency';
import { ReciboImprimible } from '@/components/ReciboImprimible';
import { logAudit } from '@/lib/audit';

export default function CajaPage() {
  const { inmuebles, convenios, contribuyentes, documentos, tcmmv } = useAppContext();
  
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
  const [pagosPendientes, setPagosPendientes] = useState<any[]>([]); // Pagos multiples en verificacion
  const [pagosAprobados, setPagosAprobados] = useState<any[]>([]);
  const [facturasAjustes, setFacturasAjustes] = useState<Record<string, any>>({});
  const [serviciosEsp, setServiciosEsp] = useState<any[]>([]);
  const [talaPoda, setTalaPoda] = useState<any[]>([]);
  const [selectedTalaPoda, setSelectedTalaPoda] = useState<string[]>([]);
  
  // Selection State
  const [selectedRecibos, setSelectedRecibos] = useState<string[]>([]);
  const [selectedCuotas, setSelectedCuotas] = useState<{convId: string, cuotaId: number}[]>([]);
  const [selectedServicios, setSelectedServicios] = useState<string[]>([]);
  const [totalBs, setTotalBs] = useState(0);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Debito' | 'Transferencia' | 'Saldo a Favor'>('Debito');
  const [referenciaDebito, setReferenciaDebito] = useState('');
  const [montoDebito, setMontoDebito] = useState<string>(''); // Monto manual punto de venta
  const [banco, setBanco] = useState('Banco de Venezuela');
  const [referencia, setReferencia] = useState('');
  const [montoTransferido, setMontoTransferido] = useState<string>('');
  const [fechaTransaccion, setFechaTransaccion] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dupRefWarning, setDupRefWarning] = useState<string>('');
  const [transferenciasMultiples, setTransferenciasMultiples] = useState<
    { id: string; banco: string; referencia: string; monto: string; fecha: string; comprobante?: File | null; dupWarning?: string }[]
  >([
    { id: '1', banco: 'Banesco', referencia: '', monto: '', fecha: new Date().toISOString().split('T')[0], comprobante: null }
  ]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [customBcvRate, setCustomBcvRate] = useState<string>('');
  const [justificacionBcv, setJustificacionBcv] = useState<string>('');
  const [selectedUcdDate, setSelectedUcdDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [useSaldoFavor, setUseSaldoFavor] = useState<boolean>(true);
  
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);
  const [isPagoMultiple, setIsPagoMultiple] = useState(false);

  // Modal de Confirmación de Pago
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<any>(null);

  // Historial de pagos de hoy en caja (persistente desde base de datos)
  const [todayPagos, setTodayPagos] = useState<any[]>([]);
  const [isLoadingTodayPagos, setIsLoadingTodayPagos] = useState(false);

  const fetchTodayPagos = async () => {
    setIsLoadingTodayPagos(true);
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('pagos_reportados')
        .select('*')
        .gte('created_at', todayStr + 'T00:00:00-04:00')
        .not('estado', 'in', '(Anulado,Reversado,Condonado,Rechazado)')
        .order('created_at', { ascending: false });

      if (data) {
        const u = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || '';
        const norm = (s: string) => (s || '').replace(/^[A-Z]-/, '').trim().toLowerCase();
        const isAdminUser = typeof window !== 'undefined' && ['administrador', 'admin', 'dzara', 'rvillegas'].includes(u.toLowerCase());

        const filtered = data.filter((p: any) => {
          let det: any = {};
          try { det = typeof p.detalles === 'object' ? p.detalles : JSON.parse(p.detalles || '{}'); } catch(e){}
          const pCajero = det.cajero || det.analista || det.usuario || det.operador || det.origen || '';
          if (isAdminUser) return true;
          return norm(pCajero) === norm(u);
        });
        setTodayPagos(filtered);
      }
    } catch(e) {
      console.error('Error fetching today pagos:', e);
    } finally {
      setIsLoadingTodayPagos(false);
    }
  };

  useEffect(() => {
    fetchTodayPagos();
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const docParam = sp.get('doc');
      if (docParam) {
        setDocNumber(docParam);
        setTimeout(() => {
          const btn = document.getElementById('btn-buscar-caja');
          if (btn) btn.click();
        }, 300);
      }
    }
  }, []);

  // Historial de pagos de la sesión actual
  const [sessionPagos, setSessionPagos] = useState<any[]>([]);

  // Recibo imprimible post-pago
  const [reciboData, setReciboData] = React.useState<any>(null);
  const [tipoReciboEmision, setTipoReciboEmision] = useState<'consolidado' | 'individual'>('consolidado');
  const [modalMesAnterior, setModalMesAnterior] = useState(false);
  const [mesAnteriorMes, setMesAnteriorMes] = useState('01');
  const [mesAnteriorAnio, setMesAnteriorAnio] = useState('2026');
  const [mesAnteriorMonto, setMesAnteriorMonto] = useState('');
  const [isAddingRetro, setIsAddingRetro] = useState(false);
  // Filtro de meses para el recibo
  const [reciboFiltro, setReciboFiltro] = React.useState<'todos' | 'rango'>('todos');
  const [reciboDesde, setReciboDesde] = React.useState<string>('');   // 'YYYY-MM' e.g. '2026-07'
  const [reciboHasta, setReciboHasta] = React.useState<string>('');

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

  const getPendingMontoForRecibo = (ref: string) => {
    let montoPend = 0;
    pagosPendientes.forEach((p: any) => {
      let det: any = {};
      try { det = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch (e) {}
      const refs: string[] = det.recibos || [];
      if (refs.includes(ref)) {
        const montoPago = parseFloat(String(p.monto || '0').replace(/[^0-9.]/g, '')) || 0;
        if (refs.length > 0) montoPend += (montoPago / refs.length);
      }
    });
    return montoPend;
  };

  const isItemPending = (ref: string) => {
    const f = recibos.find((r: any) => r.referencia === ref);
    if (!f) return false;
    const montoPendiente = parseFloat(getReciboMonto(f) || '0');
    // Bloquear si el recibo está completamente cubierto por pagos 'Por Verificar' o si ya está Pagado
    if (montoPendiente <= 0.01) return true;
    return false;
  };

  const getReciboMonto = (r: any) => {
    if (!foundUser) {
      return String(parseFloat(String(r.monto || '0').replace(/[^\d.]/g, '')) || 0);
    }

    const tasaActual = (customBcvRate && !isNaN(parseFloat(customBcvRate))) 
        ? parseFloat(customBcvRate) 
        : (tcmmv || 0);

    const userInms = inmuebles.filter((i: any) =>
      (i.identidad || '').replace(/-/g,'').toUpperCase() === (foundUser.Identidad || '').replace(/-/g,'').toUpperCase() &&
      i.estado !== 'Eliminado'
    );

    let baseMonto = parseFloat(String(r.monto || '0').replace(/[^\d.]/g, '')) || 0;

    // Verificar si tiene ajuste mensual específico (ej. Inmueble desocupado)
    const ajuste = facturasAjustes[r.referencia];
    if (ajuste) {
      if (ajuste.mmv_mes && ajuste.mmv_mes > 0 && tasaActual > 0) {
        baseMonto = parseFloat((ajuste.mmv_mes * tasaActual).toFixed(2));
      } else if (ajuste.monto) {
        baseMonto = parseFloat(ajuste.monto);
      }
    } else if (r.referencia?.startsWith('CM-') && r.estado !== 'Abonado' && tasaActual > 0) {
      let targetInms = userInms.filter((inm: any) =>
        (inm.inmueble && (r.referencia || '').includes(inm.inmueble)) ||
        (inm.cod_cont && (r.referencia || '').includes(inm.cod_cont))
      );
      if (targetInms.length === 0) targetInms = userInms;

      let monthlyMMV = 0;
      targetInms.forEach((inm: any) => {
        const cant = parseFloat(inm.cant_inmuebles || 1);
        const mmv  = parseFloat(inm.mmv_mes || 0);
        if (mmv > 0) monthlyMMV += cant * mmv;
      });
      if (monthlyMMV > 0) {
        baseMonto = monthlyMMV * tasaActual;
      }
    }

    // Descontar abonos ya aprobados para este recibo
    let totalAbonado = 0;
    pagosAprobados.forEach((p: any) => {
      let det: any = {};
      try { det = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch (e) {}
      const refs: string[] = det.recibos || [];
      if (refs.includes(r.referencia)) {
        const montoPago = parseFloat(String(p.monto || '0').replace(/[^0-9.]/g, '')) || 0;
        if (refs.length > 0) totalAbonado += (montoPago / refs.length);
      }
    });

    if (totalAbonado > 0) {
      baseMonto = Math.max(0, baseMonto - totalAbonado);
    } else if (r.estado === 'Abonado') {
      baseMonto = parseFloat(String(r.monto || '0').replace(/[^\d.]/g, '')) || 0;
    }

    // Descontar pagos pendientes de verificación
    let montoPendiente = 0;
    pagosPendientes.forEach((p: any) => {
      let det: any = {};
      try { det = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch (e) {}
      const refs: string[] = det.recibos || [];
      if (refs.includes(r.referencia)) {
        const montoPago = parseFloat(String(p.monto || '0').replace(/[^0-9.]/g, '')) || 0;
        if (refs.length > 0) montoPendiente += (montoPago / refs.length);
      }
    });

    return String(Math.max(0, baseMonto - montoPendiente).toFixed(2));
  };

  const getAbonoInfo = (r: any) => {
    const tasaActual = (customBcvRate && !isNaN(parseFloat(customBcvRate))) ? parseFloat(customBcvRate) : (tcmmv || 0);
    let originalMonto = parseFloat(String(r.monto || '0').replace(/[^\d.]/g, '')) || 0;
    const ajuste = facturasAjustes[r.referencia];
    if (ajuste?.mmv_mes && ajuste.mmv_mes > 0 && tasaActual > 0) {
      originalMonto = ajuste.mmv_mes * tasaActual;
    } else if (ajuste?.monto) {
      originalMonto = parseFloat(ajuste.monto);
    } else if (r.referencia?.startsWith('CM-') && tasaActual > 0) {
      const userInms = inmuebles.filter((i: any) => (i.identidad || '').replace(/-/g,'').toUpperCase() === (foundUser?.Identidad || '').replace(/-/g,'').toUpperCase() && i.estado !== 'Eliminado');
      let targetInms = userInms.filter((inm: any) => (inm.inmueble && r.referencia.includes(inm.inmueble)) || (inm.cod_cont && r.referencia.includes(inm.cod_cont)));
      if (targetInms.length === 0) targetInms = userInms;
      let monthlyMMV = 0;
      targetInms.forEach((inm: any) => {
        const cant = parseFloat(inm.cant_inmuebles || 1);
        const mmv = parseFloat(inm.mmv_mes || 0);
        if (mmv > 0) monthlyMMV += cant * mmv;
      });
      if (monthlyMMV > 0) originalMonto = monthlyMMV * tasaActual;
    }

    let totalAbonado = 0;
    pagosAprobados.forEach((p: any) => {
      let det: any = {};
      try { det = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch (e) {}
      const refs: string[] = det.recibos || [];
      if (refs.includes(r.referencia)) {
        const montoPago = parseFloat(String(p.monto || '0').replace(/[^0-9.]/g, '')) || 0;
        if (refs.length > 0) totalAbonado += (montoPago / refs.length);
      }
    });

    const esAbono = totalAbonado > 0 || r.estado === 'Abonado';
    const montoAbonado = totalAbonado > 0 ? totalAbonado : Math.max(0, originalMonto - (parseFloat(String(r.monto || '0').replace(/[^\d.]/g, '')) || 0));
    const restante = parseFloat(getReciboMonto(r));

    return { esAbono, originalMonto, montoAbonado, restante };
  };



  const bancosVenezuela = [
    '100% Banco', 'Bancamiga', 'Bancaribe', 'Banco Activo', 'Banco Agrícola de Venezuela',
    'Banco Bicentenario', 'Banco Caroní', 'Banco de Venezuela', 'Banco del Tesoro', 
    'Banco Exterior', 'Banco Mercantil', 'Banco Nacional de Crédito (BNC)', 'Banco Plaza',
    'Banco Provincial', 'Banco Sofitasa', 'Banco del Sur', 'Banesco', 'Banplus', 'Bancrecer',
    'Mi Banco', 'Banco Internacional (BIB)', 'Banco Venezolano de Crédito (BVC)',
    'BanFanb', 'Bancovi', 'Instituto Municipal de Crédito Popular (IMCP)',
    'Fondemi', 'Microfinanzas', 'Pagomovil BDV', 'Otro'].sort();

  const handleAuthorizeRateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateAuthError('');
    setIsAuthorizing(true);
    
    if (adminPassword !== 'dzara') {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('clave', adminPassword)
        .in('rol', ['Administrador', 'Super Admin', 'Admin']).eq('estado', 'Activo')
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
    setPagosPendientes([]);
    setTotalBs(0);

    const idLimpioSearch = docNumber.replace(/-/g, '').toUpperCase();
    const cleanFullDoc = (idLimpioSearch.startsWith('J') || idLimpioSearch.startsWith('V') || idLimpioSearch.startsWith('G') || idLimpioSearch.startsWith('E') || idLimpioSearch.startsWith('C'))
      ? idLimpioSearch
      : `${docType}${idLimpioSearch}`;

    let user = contribuyentes.find((c: any) => {
      if (!c.Identidad) return false;
      const idClean = String(c.Identidad).replace(/-/g, '').toUpperCase();
      const codMatch = c.CodCont && c.CodCont.toUpperCase() === docNumber.toUpperCase();
      const codContMatch = c.cod_cont && c.cod_cont.toUpperCase() === docNumber.toUpperCase();
      const nombreMatch = c.Contribuyente && c.Contribuyente.toUpperCase().includes(docNumber.toUpperCase());
      return idClean === cleanFullDoc || idClean === idLimpioSearch || codMatch || codContMatch || nombreMatch;
    });

    // Fallback: usuario nuevo aprobado recientemente que aún no está en el contexto React
    if (!user) {
      const { data: inmFallback } = await supabase
        .from('inmuebles')
        .select('*')
        .or(`identidad.eq.${cleanFullDoc},identidad.eq.${idLimpioSearch},cod_cont.ilike.${docNumber}`)
        .limit(1)
        .maybeSingle();

      if (inmFallback) {
        user = {
          Identidad: inmFallback.identidad,
          Contribuyente: inmFallback.contribuyente,
          Telefono: inmFallback.telefono || 'No registrado',
          Correo: inmFallback.correo_electronico || 'No registrado',
          CodCont: inmFallback.cod_cont,
          cod_cont: inmFallback.cod_cont,
          Direccion: inmFallback.direccion,
          Clasificacion: inmFallback.clasificacion || 'Residencial',
          SaldoFavor: parseFloat(inmFallback.saldo_favor_bs || '0'),
          Estado: inmFallback.estado || 'Activo'
        };
      }
    }
    
    if (user) {
      // Obtener saldo_favor_bs fresco desde Supabase (el contexto puede estar desactualizado
      // si hubo conciliaciones o notas de crédito posteriores a la carga inicial)
      const { data: inmFresh } = await supabase
        .from('inmuebles')
        .select('saldo_favor_bs')
        .or(`identidad.eq.${user.Identidad},identidad.eq.${cleanFullDoc}`);
      
      const saldoFavorFresh = (inmFresh || []).reduce(
        (sum: number, i: any) => sum + (parseFloat(i.saldo_favor_bs || '0') || 0), 0
      );
      
      setFoundUser({ ...user, SaldoFavor: saldoFavorFresh });
      
      // Consulta directa a Supabase: siempre fresca, incluye todas las CM- mensuales
      // Incluye variantes de identidad (con/sin guión) + búsqueda por nombre (recibos antiguas sin identidad)
      const identidadClean = (user.Identidad || '').replace(/-/g, '').toUpperCase();
      const { data: allUserFacturas } = await supabase
        .from('facturas')
        .select('*')
        .in('estado', ['Pendiente', 'Por Verificar', 'Abonado'])
        .or(`identidad.eq.${user.Identidad},identidad.eq.${cleanFullDoc},identidad.eq.${identidadClean}`)
        .order('emision', { ascending: true });

      // Fallback: buscar por nombre del contribuyente (cubre recibos con identidad en formato
      // distinto o NULL — ej: RECIB- generadas por ajuste de deuda sin guión V-)
      let fallbackFacturas: any[] = [];
      if ((allUserFacturas || []).length === 0 && user.Contribuyente) {
        const { data: fByName } = await supabase
          .from('facturas')
          .select('*')
          .in('estado', ['Pendiente', 'Por Verificar'])
          .eq('contribuyente', user.Contribuyente)
          .order('emision', { ascending: true });
        
        if (fByName && fByName.length > 0) {
          fallbackFacturas = fByName;
          // Backfill identidad en BD para que próximas búsquedas funcionen directamente
          const idsToUpdate = fByName.map((f: any) => f.id);
          await supabase
            .from('facturas')
            .update({ identidad: user.Identidad })
            .in('id', idsToUpdate);
        }
      }

      // NO combinar con contexto React (puede estar desactualizado tras un pago)
      // Solo usar datos frescos de Supabase
      const combined = [...(allUserFacturas || []), ...fallbackFacturas];

      // Ordenar: primero recibos normales (RECIB-), luego CM- por fecha
      combined.sort((a: any, b: any) => {
        const aIsCM = a.referencia?.startsWith('CM-');
        const bIsCM = b.referencia?.startsWith('CM-');
        if (!aIsCM && bIsCM) return -1;
        if (aIsCM && !bIsCM) return 1;
        return (a.emision || '').localeCompare(b.emision || '');
      });

      setRecibos(combined);
      setSelectedRecibos(combined.map((r: any) => r.referencia));

      
      // Cargar convenios frescos directamente desde Supabase
      const { data: dbConvenios } = await supabase
        .from('convenios')
        .select('*')
        .or(`identidad.eq.${user.Identidad},identidad.eq.${cleanFullDoc},identidad.eq.${identidadClean}`)
        .not('estado', 'in', '(Anulado,Liquidado,Solvente,Condonado)');

      let allConvenios = dbConvenios || [];
      if (allConvenios.length === 0 && user.Contribuyente) {
        const { data: convByName } = await supabase
          .from('convenios')
          .select('*')
          .ilike('contribuyente', `%${user.Contribuyente.trim()}%`)
          .not('estado', 'in', '(Anulado,Liquidado,Solvente,Condonado)');
        if (convByName) allConvenios = convByName;
      }

      // Buscar pagos existentes de convenios para este usuario
      const { data: pagosConv } = await supabase
        .from('pagos_reportados')
        .select('*')
        .or(`identidad.eq.${user.Identidad},identidad.eq.${cleanFullDoc},identidad.eq.${identidadClean}`)
        .in('estado', ['Aprobado', 'Por Verificar']);

      const cuotasPagadasSet = new Set<string>();
      (pagosConv || []).forEach((p: any) => {
        let det: any = {};
        try { det = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch(e){}
        const pCuotas = det.cuotas || [];
        pCuotas.forEach((cq: any) => {
          cuotasPagadasSet.add(`${cq.convId || cq.numeroConv}_${cq.cuotaId}`);
        });

        const convRef = det.convenio_numero || (p.referencia && p.referencia.startsWith('DEC-') ? p.referencia : null);
        if (convRef) {
          const isInicial = (det.cuota_pagada && (det.cuota_pagada.includes('Inicial') || det.cuota_pagada.includes('Cuota 1'))) ||
                            (det.concepto && (det.concepto.toLowerCase().includes('inicial') || det.concepto.toLowerCase().includes('cuota 1')));
          if (isInicial) {
            cuotasPagadasSet.add(`${convRef}_0`);
            const matchedConv = allConvenios.find((c: any) => c.numero === convRef);
            if (matchedConv) cuotasPagadasSet.add(`${matchedConv.id}_0`);
          }
          if (
            det.cuota_pagada === 'Total' ||
            det.tipo_pago === 'contado' ||
            (det.concepto && det.concepto.toLowerCase().includes('contado'))
          ) {
            for (let i = 0; i < 20; i++) {
              cuotasPagadasSet.add(`${convRef}_${i}`);
              const matchedConv = allConvenios.find((c: any) => c.numero === convRef);
              if (matchedConv) cuotasPagadasSet.add(`${matchedConv.id}_${i}`);
            }
          }
          // Soporte para cuotas pagadas identificadas por texto (ej. "Cuota 2", "Cuota 3")
          if (det.cuota_pagada && /cuota\s*(\d+)/i.test(det.cuota_pagada)) {
            const m = det.cuota_pagada.match(/cuota\s*(\d+)/i);
            if (m) {
              const num = parseInt(m[1]) - 1;
              if (num >= 0) {
                cuotasPagadasSet.add(`${convRef}_${num}`);
                const matchedConv = allConvenios.find((c: any) => c.numero === convRef);
                if (matchedConv) cuotasPagadasSet.add(`${matchedConv.id}_${num}`);
              }
            }
          }
        }
      });

      const pendingCuotas: any[] = [];
      allConvenios.forEach((conv: any) => {
        const isContado = conv.frecuencia === 'Única' || conv.cuotas === '1' || conv.cuotas === 1;
        const totalBs = parseFloat(String(conv.monto_total || '0').replace(/[^\d.]/g, '')) || 0;
        const nCuotas = isContado ? 1 : (conv.cuotas === 'N/A' || !conv.cuotas ? 1 : (parseInt(String(conv.cuotas)) || 1));
        const startDate = new Date(conv.inicio || conv.created_at || new Date());

        // Verificar si existe algún pago aprobado o en verificación para este convenio
        const pagoAsociado = (pagosConv || []).find((p: any) => {
          let det: any = {};
          try { det = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch(e){}
          const numMatch = det.convenio_numero && det.convenio_numero === conv.numero;
          const refMatch = p.referencia && (p.referencia === conv.numero || p.referencia.includes(conv.numero));
          const idMatch = det.cuotas && det.cuotas.some((cq: any) => String(cq.convId) === String(conv.id));
          const conceptoContadoMatch = det.concepto && det.concepto.toLowerCase().includes('contado');
          return numMatch || refMatch || idMatch || (isContado && conceptoContadoMatch);
        });

        // Si el decreto/convenio fue de contado y ya tiene pago (aprobado o en verificación), NO debe salir en caja
        if (isContado && pagoAsociado) {
          if (pagoAsociado.estado === 'Aprobado') {
            supabase.from('convenios').update({ estado: 'Solvente' }).eq('id', conv.id).then(() => {});
          }
          return;
        }

        // 1. Obtener la cuota inicial pactada (desde metadata en documento_url)
        let cuotaInicialPactada = 0;
        if (conv.documento_url && conv.documento_url.startsWith('meta:')) {
          try {
            const meta = JSON.parse(conv.documento_url.slice(5));
            if (meta.pago_inicial) cuotaInicialPactada = parseFloat(meta.pago_inicial) || 0;
          } catch(e){}
        }

        // Buscar si hubo pago inicial ya efectivamente cobrado/reportado
        let pagoInicialPagado = 0;
        let pagoInicialCobradoReal = false;
        (pagosConv || []).forEach((p: any) => {
          let det: any = {};
          try { det = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch(e){}
          const isThisConv = det.convenio_numero === conv.numero || (p.referencia && p.referencia.includes(conv.numero));
          const isIni = (det.cuota_pagada && det.cuota_pagada.includes('Inicial')) || (det.concepto && det.concepto.toLowerCase().includes('inicial'));
          if (isThisConv && isIni) {
            pagoInicialPagado = parseFloat(p.monto || '0') || 0;
            pagoInicialCobradoReal = true;
          }
        });

        // Monto de la cuota inicial (lo pactado si no se ha pagado, o lo cobrado)
        const montoInicial = pagoInicialCobradoReal ? pagoInicialPagado : (cuotaInicialPactada > 0 ? cuotaInicialPactada : (nCuotas > 1 ? (totalBs * 0.25) : totalBs));
        
        // Monto de las cuotas mensuales (restando la inicial del total y dividiendo exactamente entre el número de cuotas escogidas)
        const cuotasMensualesCount = nCuotas;
        const montoCuotaRestante = (montoInicial > 0)
          ? Math.max(0, (totalBs - montoInicial) / cuotasMensualesCount).toFixed(2)
          : (totalBs / cuotasMensualesCount).toFixed(2);

        let convCuotasPendientes = 0;
        
        // 1. Cuota Inicial (si es convenio fraccionado)
        if (conv.frecuencia !== 'Única') {
          const keyIni1 = `${conv.id}_0`;
          const keyIni2 = `${conv.numero}_0`;
          if (!cuotasPagadasSet.has(keyIni1) && !cuotasPagadasSet.has(keyIni2)) {
            convCuotasPendientes++;
            pendingCuotas.push({
              convId: String(conv.id),
              numeroConv: conv.numero,
              cuotaId: 0,
              cuotaNum: 0,
              esInicial: true,
              label: 'Cuota Inicial',
              totalCuotas: cuotasMensualesCount,
              fecha: startDate.toISOString().slice(0, 10),
              monto: montoInicial.toFixed(2),
              rawConv: conv
            });
          }
        }

        // 2. Cuotas Mensuales (Cuota 1 de N, Cuota 2 de N, ... Cuota N de N)
        for (let m = 1; m <= cuotasMensualesCount; m++) {
          const cuotaIndex = m;
          const key1 = `${conv.id}_${cuotaIndex}`;
          const key2 = `${conv.numero}_${cuotaIndex}`;
          if (!cuotasPagadasSet.has(key1) && !cuotasPagadasSet.has(key2)) {
            convCuotasPendientes++;
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + m);

            const esSoloContado = (conv.frecuencia === 'Única');
            const montoEsta = esSoloContado ? totalBs.toFixed(2) : montoCuotaRestante;
            const labelCuota = esSoloContado ? 'Pago Único de Contado' : `Cuota ${m} de ${cuotasMensualesCount}`;

            pendingCuotas.push({
              convId: String(conv.id),
              numeroConv: conv.numero,
              cuotaId: cuotaIndex,
              cuotaNum: m,
              esInicial: false,
              label: labelCuota,
              totalCuotas: cuotasMensualesCount,
              fecha: dueDate.toISOString().slice(0, 10),
              monto: montoEsta,
              rawConv: conv
            });
          }
        }

        // Si ya no le quedan cuotas pendientes, actualizar a Solvente
        if (convCuotasPendientes === 0) {
          supabase.from('convenios').update({ estado: 'Solvente' }).eq('id', conv.id).then(() => {});
        }
      });
      setCuotas(pendingCuotas);

      // Si existe una Cuota Inicial de un decreto/convenio pendiente, seleccionarla por defecto
      const iniciales = pendingCuotas.filter(c => c.esInicial);
      if (iniciales.length > 0) {
        setSelectedCuotas(iniciales.map(c => ({ convId: c.convId, cuotaId: c.cuotaId })));
        // Desmarcar recibos ordinarios para priorizar el pago de la Cuota Inicial del Decreto
        setSelectedRecibos([]);
      }

      // Cargar servicios especiales pendientes
      const { data: servEsp } = await supabase
        .from('servicios_especiales')
        .select('*')
        .or(`identidad.eq.${user.Identidad},identidad.eq.${cleanFullDoc}`)
        .eq('estado', 'Pendiente');
      setServiciosEsp((servEsp || []).filter((s: any) => s.tipo !== 'tala_poda'));

      // Cargar servicios de tala y poda pendientes
      const { data: talaData } = await supabase
        .from('servicios_especiales')
        .select('*')
        .or(`identidad.eq.${user.Identidad},identidad.eq.${cleanFullDoc}`)
        .eq('tipo', 'tala_poda')
        .eq('estado', 'Pendiente');
      setTalaPoda(talaData || []);

      // Cargar ajustes de actividad/tarifa mensual de sistema_config
      try {
        const { data: cfgRow } = await supabase.from('sistema_config').select('valor').eq('id', 'facturas_ajustes_meses').maybeSingle();
        if (cfgRow?.valor) setFacturasAjustes(cfgRow.valor);
      } catch (_e) {}

      // Cargar pagos pendientes de verificar y aprobados para abonos
      const { data: allPagosData } = await supabase
        .from('pagos_reportados')
        .select('*')
        .or('identidad.eq.' + user.Identidad + ',identidad.eq.' + cleanFullDoc);
      
      const pend = (allPagosData || []).filter((p: any) => p.estado === 'Por Verificar');
      const aprob = (allPagosData || []).filter((p: any) => p.estado === 'Aprobado' || p.estado === 'Conciliado');
      setPagosPendientes(pend);
      setPagosAprobados(aprob);

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

    selectedTalaPoda.forEach(ref => {
      const s = talaPoda.find(ss => ss.referencia === ref);
      if (s) total += parseFloat(s.monto || '0');
    });
    
    setTotalBs(total);
  }, [selectedRecibos, selectedCuotas, selectedServicios, selectedTalaPoda, recibos, cuotas, serviciosEsp, talaPoda]);

  const toggleRecibo = (ref: string) => {
    const sortedRecibos = [...recibos].sort((a: any, b: any) => {
      // Primero CM- luego RECIB- etc.
      const aIsCM = a.referencia?.startsWith('CM-');
      const bIsCM = b.referencia?.startsWith('CM-');
      if (!aIsCM && bIsCM) return -1;
      if (aIsCM && !bIsCM) return 1;
      return (a.emision || '').localeCompare(b.emision || '');
    });
    
    const currentIndex = sortedRecibos.findIndex(r => r.referencia === ref);
    if (currentIndex === -1) return;
    if (isItemPending(ref) && !isPagoMultiple) {
      alert('Este recibo tiene un pago por transferencia asociado que está Por Verificar. Para registrar otra transferencia adicional o complementaria (Pago Múltiple), active la casilla "Pago Múltiple".');
      return;
    }

    if (selectedRecibos.includes(ref)) {
      // Deselecting: deselect this one and all subsequent ones del MISMO inmueble
      const currentRef = sortedRecibos[currentIndex];
      const refParts = (currentRef?.referencia || '').split('-');
      const inmuebleId = refParts.length >= 3 ? `${refParts[1]}-${refParts[2]}` : null;

      const toRemove = inmuebleId
        ? sortedRecibos.slice(currentIndex).filter(r => (r.referencia || '').includes(inmuebleId)).map(r => r.referencia)
        : sortedRecibos.slice(currentIndex).map(r => r.referencia);
      setSelectedRecibos(selectedRecibos.filter(r => !toRemove.includes(r)));
    } else {
      // Selecting: verificar orden SOLO dentro del mismo inmueble
      const currentRef = sortedRecibos[currentIndex];
      const refParts = (currentRef?.referencia || '').split('-');
      const inmuebleId = refParts.length >= 3 ? `${refParts[1]}-${refParts[2]}` : null;

      if (inmuebleId) {
        // Solo verificar facturas anteriores del MISMO inmueble
        const previousSameInmueble = sortedRecibos
          .slice(0, currentIndex)
          .filter(r => (r.referencia || '').includes(inmuebleId))
          .map(r => r.referencia);
        const missingPrevious = previousSameInmueble.some(pr => !selectedRecibos.includes(pr) && !isItemPending(pr));

        if (missingPrevious) {
          alert('¡No se puede adelantar meses! Debe seleccionar y pagar las deudas más antiguas de este inmueble primero.');
          return;
        }
      } else {
        // Sin inmueble identificable: validación global (comportamiento original)
        const previousRefs = sortedRecibos.slice(0, currentIndex).map(r => r.referencia);
        const missingPrevious = previousRefs.some(pr => !selectedRecibos.includes(pr) && !isItemPending(pr));
        if (missingPrevious) {
          alert('¡No se puede adelantar meses! Debe seleccionar y pagar las deudas más antiguas primero.');
          return;
        }
      }

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

  const toggleTalaPoda = (ref: string) => {
    if (selectedTalaPoda.includes(ref)) {
      setSelectedTalaPoda(selectedTalaPoda.filter(r => r !== ref));
    } else {
      setSelectedTalaPoda([...selectedTalaPoda, ref]);
    }
  };

  const fetchTasaHistorica = async () => {
    if (!selectedUcdDate) return;
    // Lógica para obtener tasa de días anteriores (simulada por ahora)
    alert(`Se buscará la tasa BCV del día ${selectedUcdDate}`);
  };


  const handleAgregarMesAnterior = async () => {
    if (!foundUser) return;
    setIsAddingRetro(true);
    try {
      const userInms = (inmuebles || []).filter((i: any) => i.identidad === foundUser.Identidad || (i.identidad && foundUser.Identidad && i.identidad.replace(/-/g,'').toUpperCase() === foundUser.Identidad.replace(/-/g,'').toUpperCase()));
      const userInm = userInms.length > 0 ? userInms[0] : null;
      const mmv = parseFloat(userInm?.mmv_mes || '1.0');
      const rate = currentBcvRate || tcmmv || 50;
      const montoCalc = mesAnteriorMonto && parseFloat(mesAnteriorMonto) > 0 
        ? parseFloat(mesAnteriorMonto) 
        : parseFloat((mmv * rate).toFixed(2));

      const refRetro = `RETRO-${(foundUser.Identidad || '').replace(/[^a-zA-Z0-9]/g, '')}-${mesAnteriorMes}-${mesAnteriorAnio}`;
      const emisionDate = `${mesAnteriorAnio}-${mesAnteriorMes}-01`;

      // Verificar si ya existe esa referencia en facturas
      const { data: existFac } = await supabase
        .from('facturas')
        .select('id, referencia')
        .eq('referencia', refRetro)
        .limit(1);

      if (existFac && existFac.length > 0) {
        alert("Ese período ya se encuentra registrado en el sistema para este contribuyente.");
        setIsAddingRetro(false);
        return;
      }

      const { data: newFac, error: facErr } = await supabase.from('facturas').insert([{
        identidad: foundUser.Identidad,
        contribuyente: foundUser.Contribuyente,
        referencia: refRetro,
        monto: montoCalc,
        estado: 'Pendiente',
        emision: emisionDate,
        vencimiento: `${mesAnteriorAnio}-${mesAnteriorMes}-28`
      }]).select().single();

      if (facErr) throw facErr;

      const nuevaFactura = newFac || {
        identidad: foundUser.Identidad,
        contribuyente: foundUser.Contribuyente,
        referencia: refRetro,
        monto: montoCalc,
        estado: 'Pendiente',
        emision: emisionDate
      };

      setRecibos(prev => [nuevaFactura, ...prev]);
      setSelectedRecibos(prev => [...prev, refRetro]);
      setModalMesAnterior(false);
      setMesAnteriorMonto('');
      alert(`Período retroactivo (${mesAnteriorMes}/${mesAnteriorAnio}) agregado a la cuenta con éxito.`);
    } catch (e: any) {
      alert("Error al agregar período anterior: " + e.message);
    }
    setIsAddingRetro(false);
  };

  const handlePayment = async () => {
    if (totalBs <= 0) return alert("Debe seleccionar al menos una deuda a pagar.");
    
    const maxSaldoUsable = foundUser?.SaldoFavor || 0;
    // Cuando el método de pago ES Saldo a Favor, el checkbox no aplica
    // (evita doble deducción: una por descuento + otra por el método)
    const descuentoSaldoFavor = (paymentMethod !== 'Saldo a Favor' && useSaldoFavor)
      ? Math.min(totalBs, maxSaldoUsable)
      : 0;
    const finalTotal = Math.max(0, totalBs - descuentoSaldoFavor);
    
    let saldoAFavorNuevo = 0;
    let esAbono = false;
    let montoReal = finalTotal;
    
    const reqRef = ['Transferencia'].includes(paymentMethod);

    if (reqRef) {
      if (isPagoMultiple && transferenciasMultiples.length > 1) {
        // Validación de múltiples transferencias
        for (let i = 0; i < transferenciasMultiples.length; i++) {
          const t = transferenciasMultiples[i];
          if (!t.banco) return alert(`Debe seleccionar el banco emisor en la transferencia #${i + 1}.`);
          const refClean = (t.referencia || '').trim();
          if (refClean.length !== 8 || !/^\d{8}$/.test(refClean)) {
            return alert(`La referencia en la transferencia #${i + 1} debe tener exactamente 8 dígitos numéricos (máximo y mínimo 8).`);
          }
          if (!t.fecha) return alert(`La fecha de transacción es obligatoria en la transferencia #${i + 1}.`);
          const mMonto = parseFloat(t.monto);
          if (isNaN(mMonto) || mMonto <= 0) return alert(`Debe ingresar un monto válido mayor a 0 en la transferencia #${i + 1}.`);
          if (!t.comprobante) {
            return alert(`Debe adjuntar el comprobante de pago de la transferencia #${i + 1} (${refClean}).`);
          }
        }
        // Verificar duplicados entre ellas
        const refList = transferenciasMultiples.map(t => t.referencia.trim());
        const uniqueRefs = new Set(refList);
        if (uniqueRefs.size !== refList.length) {
          return alert('No puede ingresar referencias duplicadas entre las transferencias.');
        }
        // Verificar en BD
        for (const t of transferenciasMultiples) {
          const { data: dupCheck } = await supabase
            .from('pagos_reportados')
            .select('id')
            .eq('referencia', t.referencia.trim())
            .limit(1);
          if (dupCheck && dupCheck.length > 0) {
            return alert(`⚠️ ADVERTENCIA: La referencia "${t.referencia.trim()}" ya fue registrada previamente en el sistema.`);
          }
        }
        const transferido = transferenciasMultiples.reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0);
        if (transferido < finalTotal) {
          esAbono = true;
          montoReal = transferido;
        } else if (transferido > finalTotal) {
          saldoAFavorNuevo = transferido - finalTotal;
          montoReal = transferido;
        } else {
          montoReal = transferido;
        }
      } else {
        if (!banco) return alert("Debe seleccionar el banco emisor.");
        const refClean = referencia.trim();
        if (refClean.length !== 8 || !/^\d{8}$/.test(refClean)) {
          return alert("La referencia de transferencia debe tener exactamente 8 dígitos numéricos (máximo y mínimo 8).");
        }
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

        if (!isPagoMultiple && !comprobante) {
          return alert("Debe adjuntar el comprobante de pago de la transferencia.");
        }
        const transferido = parseFloat(montoTransferido);
        if (isNaN(transferido) || transferido <= 0) return alert("Debe ingresar un monto transferido válido.");
        
        if (transferido < finalTotal || isPagoMultiple) {
          esAbono = true;
          montoReal = transferido;
        } else if (transferido > finalTotal) {
          saldoAFavorNuevo = transferido - finalTotal;
          montoReal = transferido;
        } else {
          montoReal = transferido;
        }
      }
    } else if (paymentMethod === 'Debito') {
      if (!referenciaDebito.trim()) return alert("Debe ingresar el número de comprobante o referencia del pago por punto.");
      if (referenciaDebito.trim().length > 8) return alert("El número de referencia para Punto de Venta no puede superar los 8 dígitos.");
      
      // Verificar referencia duplicada (BLOQUEO ESTRICTO)
      const refDebTrim = referenciaDebito.trim();
      const { data: dupCheck } = await supabase
        .from('pagos_reportados')
        .select('id')
        .eq('referencia', refDebTrim)
        .limit(1);
      if (dupCheck && dupCheck.length > 0) {
        return alert(`⛔ BLOQUEO DE SEGURIDAD: El comprobante de Punto de Venta "${refDebTrim}" ya fue registrado previamente en el sistema. Verifique antes de continuar.`);
      }

      const { data: dupFacturas } = await supabase
        .from('facturas')
        .select('id')
        .eq('referencia_pago', refDebTrim)
        .limit(1);
      if (dupFacturas && dupFacturas.length > 0) {
        return alert(`⛔ BLOQUEO DE SEGURIDAD: El comprobante de Punto de Venta "${refDebTrim}" ya fue liquidado en otra factura.`);
      }
      if (montoDebito && (parseFloat(montoDebito) <= 0 || isNaN(parseFloat(montoDebito)))) {
        return alert("Si ingresa un monto manual, debe ser un valor válido mayor a 0.");
      }
      // Use manual debit amount if provided
      if (montoDebito && parseFloat(montoDebito) > 0) {
        montoReal = parseFloat(montoDebito);
      }
    } else if (paymentMethod === 'Saldo a Favor') {
      // El método paga con el saldo directamente (totalBs completo, sin descuento previo)
      const saldoDisponible = foundUser?.SaldoFavor || 0;
      if (saldoDisponible <= 0) return alert("El contribuyente no tiene Saldo a Favor disponible.");
      if (saldoDisponible < totalBs) {
        return alert(`Saldo a Favor insuficiente. Disponible: Bs. ${formatBs(saldoDisponible)}. Deuda total: Bs. ${formatBs(totalBs)}.\nUse otro método de pago o combínelo con el descuento de saldo parcial.`);
      }
      montoReal = totalBs; // Paga la deuda completa con el saldo
    }
    
    if (customBcvRate && !justificacionBcv.trim()) {
      return alert("Al modificar la Tasa BCV manualmente, debe ingresar una justificación obligatoria.");
    }
    
    // ── Abrir modal de confirmación en lugar de confirm() nativo ──
    setConfirmPayload({
      montoReal, finalTotal, saldoAFavorNuevo, esAbono, descuentoSaldoFavor,
      reqRef,
      recibosSeleccionados: selectedRecibos,
      cuotasSeleccionadas: selectedCuotas,
      serviciosSeleccionados: selectedServicios,
      talaPodaSeleccionada: selectedTalaPoda,
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAndPay = async () => {
    if (isProcessing) return; // Prevent double clicks
    if (!confirmPayload) return;
    const { montoReal, finalTotal, saldoAFavorNuevo, esAbono, descuentoSaldoFavor, reqRef } = confirmPayload;
    setIsConfirmModalOpen(false);
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
      
      // Deduct used Saldo a Favor (via checkbox discount on other methods)
      if (descuentoSaldoFavor > 0) {
        const { data: userInmuebles } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', foundUser.Identidad);
        if (userInmuebles && userInmuebles.length > 0) {
          const firstInmueble = userInmuebles[0];
          const currentSaldo = parseFloat(firstInmueble.saldo_favor_bs || '0');
          const newSaldo = Math.max(0, currentSaldo - descuentoSaldoFavor);
          await supabase.from('inmuebles').update({ saldo_favor_bs: newSaldo }).eq('id', firstInmueble.id);
        }
        
        const isAutoAprobado = ['Debito', 'Saldo a Favor'].includes(paymentMethod);
        if (!isAutoAprobado) {
          let dineroDisponible = descuentoSaldoFavor;
          for (const ref of selectedRecibos) {
            const f = recibos.find(r => r.referencia === ref);
            if (!f) continue;
            const montoFac = parseFloat(getReciboMonto(f) || '0');
            if (dineroDisponible >= montoFac - 0.01) {
              dineroDisponible = Math.max(0, dineroDisponible - montoFac);
              await supabase.from('facturas').update({ estado: 'Pagado' }).eq('referencia', ref);
            } else if (dineroDisponible > 0.01) {
              const montoRestante = (montoFac - dineroDisponible).toFixed(2);
              await supabase.from('facturas').update({ monto: montoRestante, estado: 'Abonado' }).eq('referencia', ref);
              dineroDisponible = 0;
            }
          }
          const cajero = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || 'Administrador';
          const letra = (typeof window !== 'undefined' ? localStorage.getItem('adminLetra') : null);
          const cajero_id = letra && cajero !== 'Administrador' ? `${letra}-${cajero}` : cajero;
          
          await supabase.from('pagos_reportados').insert({
            identidad: foundUser.Identidad,
            monto: descuentoSaldoFavor,
            banco: 'Saldo a Favor',
            referencia: `SF-${Date.now().toString().slice(-6)}`,
            tipo: 'Saldo a Favor',
            estado: 'Aprobado',
            detalles: JSON.stringify({ 
              recibos: selectedRecibos, 
              cuotas: selectedCuotas,
              servicios: selectedServicios,
              tala_poda: selectedTalaPoda,
              cajero: cajero_id,
              es_abono: true,
              total_seleccionado: totalBs,
              tasa_bcv: currentBcvRate,
              deuda_total_sistema: foundUser.DeudaTotal,
              fecha_transaccion: fechaTransaccion
            })
          });
        }
      }

      // Deduct when the payment METHOD itself is Saldo a Favor
      if (paymentMethod === 'Saldo a Favor') {
        const { data: userInmuebles } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', foundUser.Identidad);
        if (userInmuebles && userInmuebles.length > 0) {
          const firstInmueble = userInmuebles[0];
          const currentSaldo = parseFloat(firstInmueble.saldo_favor_bs || '0');
          const newSaldo = Math.max(0, currentSaldo - montoReal);
          await supabase.from('inmuebles').update({ saldo_favor_bs: newSaldo }).eq('id', firstInmueble.id);
        }
      }

      const isAutoAprobado = ['Debito', 'Saldo a Favor'].includes(paymentMethod);
      // Detect abono: montoDebito provided and < totalBs
      const esAbonoDebito = !!(montoDebito && parseFloat(montoDebito) > 0 && parseFloat(montoDebito) < totalBs - 0.01);

      if (isAutoAprobado) {
        if (!esAbonoDebito) {
          // === PAGO COMPLETO: marcar todas las recibos como Pagado ===
          if (selectedRecibos.length > 0) {
            const { error: fErr } = await supabase
              .from('facturas')
              .update({ estado: 'Pagado' })
              .in('referencia', selectedRecibos);
            if (fErr) throw fErr;
          }
        } else {
          // === ABONO DÉBITO PARCIAL: descontar monto de las recibos ===
          let dineroDisponible = parseFloat(montoDebito);
          for (const ref of selectedRecibos) {
            const f = recibos.find(r => r.referencia === ref);
            if (!f) continue;
            const montoFac = parseFloat(getReciboMonto(f) || '0');
            if (dineroDisponible >= montoFac - 0.01) {
              // Recibo cubierta completamente
              dineroDisponible = Math.max(0, dineroDisponible - montoFac);
              const { error: fErr } = await supabase.from('facturas').update({ estado: 'Pagado' }).eq('referencia', ref);
              if (fErr) throw fErr;
            } else if (dineroDisponible > 0.01) {
              // Abono parcial: actualizar monto restante (mantener Pendiente)
              const montoRestante = (montoFac - dineroDisponible).toFixed(2);
              const { error: fErr } = await supabase.from('facturas').update({ monto: montoRestante, estado: 'Abonado' }).eq('referencia', ref);
              if (fErr) throw fErr;
              dineroDisponible = 0;
            }
            // Si dineroDisponible <= 0, la recibo queda Pendiente sin cambios
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
            const remaining = cuotas.filter((q: any) => q.convId === cId && !data.toUpdate.includes(q.cuotaId));
            if (remaining.length === 0) {
              await supabase.from('convenios').update({ estado: 'Solvente' }).eq('id', cId);
            }
          }
        }
        
        // Tala y Poda debito: pagar completo
        if (selectedTalaPoda.length > 0 && !esAbonoDebito) {
          await supabase.from('servicios_especiales').update({ estado: 'Pagado' }).in('referencia', selectedTalaPoda);
        }
        // Servicios especiales: solo se pagan completos (no hay abono parcial)
        if (selectedServicios.length > 0) {
          if (!esAbonoDebito) {
            // Pago completo - marcar todos como Pagado
            await supabase.from('servicios_especiales').update({ estado: 'Pagado' }).in('referencia', selectedServicios);
          } else {
            // Abono: calcular dinero restante despues de cubrir recibos
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
                // Alcanza para cubrir el servicio completo
                dineroRestanteParaServicios = Math.max(0, dineroRestanteParaServicios - montoS);
                await supabase.from('servicios_especiales').update({ estado: 'Pagado' }).eq('referencia', ref);
              }
              // Si no alcanza: el servicio queda Pendiente INTACTO (sin modificar el monto)
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
            tala_poda: selectedTalaPoda,
            cajero: cajero_id,
            es_abono: esAbonoDebito,
            monto_abonado: esAbonoDebito ? montoReal : undefined,
            tasa_bcv: currentBcvRate,
            deuda_total_sistema: foundUser.DeudaTotal,
            fecha_transaccion: fechaTransaccion,
            tasa_bcv_aplicada: customBcvRate ? customBcvRate : undefined,
            nota_cambio_tasa: justificacionBcv ? justificacionBcv : undefined
          })
        });

        if (esAbonoDebito) {
          (window as any).__lastPaymentAbono = { 
            esAbono: true, 
            montoCancelado: montoReal, 
            montoPendiente: Math.max(0, (foundUser.DeudaTotal || finalTotal) - montoReal),
            tasaBcv: currentBcvRate
          };
        } else {
          (window as any).__lastPaymentAbono = { esAbono: false, tasaBcv: currentBcvRate };
        }
        setSuccessMsg(esAbonoDebito
          ? `Abono de Bs. ${formatBs(montoReal)} procesado. La deuda restante quedó actualizada.`
          : `Pago procesado exitosamente por ${paymentMethod}. La deuda ha sido conciliada automáticamente.`
        );
        // ── AUDITORÍA: Cobro completado ──
        logAudit(
          esAbonoDebito ? 'Abono Parcial en Caja' : `Cobro por ${paymentMethod} en Caja`,
          {
            contribuyente: foundUser.Contribuyente,
            identidad: foundUser.Identidad,
            monto_bs: montoReal,
            metodo: paymentMethod,
            referencias: selectedRecibos,
            servicios: selectedServicios,
            cuotas: selectedCuotas.map((c: any) => c.convId),
            tasa_bcv: currentBcvRate,
            referencia_pago: reqRef ? referencia : referenciaDebito,
            es_abono: esAbonoDebito,
          },
          'COBRO'
        );
        if (justificacionBcv) {
          logAudit('Tasa BCV Modificada en Caja', {
            contribuyente: foundUser.Identidad,
            tasa_aplicada: customBcvRate,
            justificacion: justificacionBcv,
          }, 'TASA');
        }

        // ── RECIBO AUTOMÁTICO DESPUÉS DEL PAGO DÉBITO ──
        if (!esAbonoDebito) {
          try {
            const cajeroRecibo = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || 'Administrador';
            const letraRecibo = (typeof window !== 'undefined' ? localStorage.getItem('adminLetra') : null);
            const cajero_id_recibo = letraRecibo && cajeroRecibo !== 'Administrador' ? `${letraRecibo}-${cajeroRecibo}` : cajeroRecibo;
            const userInmsRec = (inmuebles as any[]).filter((i: any) =>
              (i.identidad || '').replace(/-/g,'').toUpperCase() === (foundUser.Identidad || '').replace(/-/g,'').toUpperCase()
            );
            const primerInm = userInmsRec[0];
            const MESES_REC = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
            const getMesRec = (emision: string) => {
              if (!emision) return '---';
              const p = emision.split('-');
              return p.length >= 2 ? `${MESES_REC[parseInt(p[1])-1]} ${p[0]}` : emision;
            };

            // Agrupar facturas seleccionadas por inmueble
            const facturasPorInmueble: Record<string, { inm: any; refs: string[] }> = {};
            selectedRecibos.forEach((ref: string) => {
              // Extraer código de inmueble de la referencia CM-I-000080-09-2026
              const matchedInm = userInmsRec.find((i: any) => i.inmueble && ref.includes(i.inmueble));
              const inmKey = matchedInm?.inmueble || '__general__';
              if (!facturasPorInmueble[inmKey]) {
                facturasPorInmueble[inmKey] = { inm: matchedInm || primerInm, refs: [] };
              }
              facturasPorInmueble[inmKey].refs.push(ref);
            });

            // Si solo se pagan cuotas o servicios especiales sin facturas ordinarias, asegurar al menos 1 grupo
            if (Object.keys(facturasPorInmueble).length === 0 && (selectedCuotas.length > 0 || selectedServicios.length > 0)) {
              facturasPorInmueble['__general__'] = { inm: primerInm, refs: [] };
            }

            const grupos = Object.values(facturasPorInmueble);
            const recibosArray = grupos.map((grupo, idx) => {
              const inmGrupo = grupo.inm || primerInm;
              let conceptosGrupo: any[] = [];

              // Calcular período de las facturas seleccionadas
              const facsGrupo = grupo.refs.map((ref: string) => recibos.find((r: any) => r.referencia === ref)).filter(Boolean);
              facsGrupo.sort((a: any, b: any) => new Date(a.emision || '1900-01-01').getTime() - new Date(b.emision || '1900-01-01').getTime());
              
              let periodoGrupo = '';
              if (facsGrupo.length > 0) {
                const mesIni = getMesRec(facsGrupo[0].emision);
                const mesFin = getMesRec(facsGrupo[facsGrupo.length - 1].emision);
                periodoGrupo = mesIni === mesFin ? mesIni : `${mesIni} A ${mesFin}`;
              }

              grupo.refs.forEach((ref: string) => {
                const f = recibos.find((r: any) => r.referencia === ref);
                const montoF = f ? parseFloat(getReciboMonto(f) || '0') : 0;
                const abonoPrevio = f && f.monto_abonado ? parseFloat(String(f.monto_abonado || '0').replace(/[^\d.]/g, '')) : 0;
                const mesTxt = getMesRec(f?.emision || '');
                const descPeriodo = facsGrupo.length > 1
                  ? `Servicio Aseo Urbano - Período: ${periodoGrupo} (Mes: ${mesTxt})`
                  : `Servicio Aseo Urbano - Período: ${mesTxt}`;
                
                if (abonoPrevio > 0) {
                  conceptosGrupo.push({
                    descripcion: descPeriodo,
                    precioUnit: montoF + abonoPrevio,
                    total: montoF + abonoPrevio
                  });
                  // Si no es abono (se esta completando), no mostramos el descuento de abonos anteriores para que la factura salga por el monto completo.
                  if (esAbono) {
                    conceptosGrupo.push({
                      descripcion: `Abonos Anteriores (Mes: ${mesTxt})`,
                      precioUnit: -abonoPrevio,
                      total: -abonoPrevio
                    });
                  }
                } else {
                  conceptosGrupo.push({
                    descripcion: descPeriodo,
                    precioUnit: montoF,
                    total: montoF
                  });
                }
              });
              // Agregar cuotas de convenios si fueron seleccionadas
              if (selectedCuotas.length > 0 && idx === 0) {
                selectedCuotas.forEach((sc: any) => {
                  const cq = cuotas.find((q: any) => q.convId === sc.convId && q.cuotaId === sc.cuotaId);
                  if (cq) {
                    const montoCq = parseFloat(cq.monto || '0');
                    let pDecreto = '';
                    if (cq.rawConv?.documento_url && cq.rawConv.documento_url.startsWith('meta:')) {
                      try { pDecreto = JSON.parse(cq.rawConv.documento_url.slice(5)).periodo_decreto || ''; } catch(e){}
                    }
                    const strPeriodo = pDecreto ? ` - Período: ${pDecreto}` : '';
                    const labelCuota = cq.label || (cq.esInicial ? 'Cuota Inicial' : `Cuota ${cq.cuotaNum || cq.cuotaId + 1} de ${cq.totalCuotas || 1}`);
                    conceptosGrupo.push({
                      descripcion: `${labelCuota}${strPeriodo} - Convenio ${cq.numeroConv || ''}`,
                      precioUnit: montoCq,
                      total: montoCq
                    });
                  }
                });
              }

              // Agregar servicios especiales si fueron seleccionados
              if (selectedServicios.length > 0 && idx === 0) {
                selectedServicios.forEach((idServ: any) => {
                  const sObj = (serviciosEsp as any[] || []).find((s: any) => s.id === idServ);
                  if (sObj) {
                    const montoS = parseFloat(sObj.monto || '0');
                    conceptosGrupo.push({
                      descripcion: `Servicio Especial: ${sObj.tipo_servicio || 'Servicio'} (${sObj.numero || ''})`,
                      precioUnit: montoS,
                      total: montoS
                    });
                  }
                });
              }

              const totalGrupo = conceptosGrupo.reduce((s: number, c: any) => s + c.total, 0);
              const refNum = (grupo.refs[0] || '').split('-').pop()?.padStart(7, '0') || String(idx + 1).padStart(7, '0');
              return {
                reciboNo: refNum,
                controlWeb: `WEB-${refNum}`,
                fechaEmision: new Date().toISOString().split('T')[0],
                codContribuyente: inmGrupo?.cod_cont || foundUser.Identidad,
                razonSocial: inmGrupo?.contribuyente || foundUser.Contribuyente || '',
                domicilioFiscal: ((inmGrupo?.direccion || 'TUCACAS MUNICIPIO SILVA, FALCÓN') as string).toUpperCase(),
                rifCi: foundUser.Identidad,
                caja: cajero_id_recibo,
                conceptos: conceptosGrupo,
                subTotal: totalGrupo,
                exento: totalGrupo,
                iva: 0,
                total: totalGrupo,
                formaPago: 'PUNTO DE VENTA',
                banco: 'Debito',
                referencia: reqRef ? referencia : referenciaDebito,
                tasaBcv: currentBcvRate || tcmmv || undefined,
              };
            });

            // Unificar en 1 solo recibo consolidado si se elige 'consolidado' o si hay varios grupos
            if (tipoReciboEmision === 'consolidado' && recibosArray.length > 1) {
              const todosConceptos: any[] = [];
              let granTotal = 0;
              recibosArray.forEach(r => {
                todosConceptos.push(...r.conceptos);
                granTotal += r.total;
              });
              const primerR = recibosArray[0];
              setReciboData({
                ...primerR,
                reciboNo: primerR.reciboNo,
                controlWeb: primerR.controlWeb,
                conceptos: todosConceptos,
                subTotal: granTotal,
                exento: granTotal,
                total: granTotal
              });
            } else {
              setReciboData(recibosArray.length === 1 ? recibosArray[0] : recibosArray);
            }
          } catch(rErr) { console.warn('Error al generar recibo automático:', rErr); }
        }

        
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
        // Upload comprobante to Supabase Storage if present
        let comprobanteUrl = '';
        let comprobanteB64 = '';
        if (comprobante) {
          // Try Storage first
          try {
            const ext = comprobante.name.split('.').pop() || 'jpg';
            const filePath = `comprobantes/${(foundUser.Identidad || 'x').replace(/[^a-zA-Z0-9]/g,'_')}_${Date.now()}.${ext}`;
            const { data: upData, error: upErr } = await supabase.storage
              .from('comprobantes')
              .upload(filePath, comprobante, { upsert: true, contentType: comprobante.type });
            if (!upErr && upData) {
              const { data: pubData } = supabase.storage.from('comprobantes').getPublicUrl(filePath);
              comprobanteUrl = pubData?.publicUrl || '';
            }
          } catch(e) { /* Storage no disponible, usar base64 */ }
          // Fallback: base64 (siempre, garantiza visualizacion aunque falle Storage)
          if (!comprobanteUrl && comprobante.size < 5 * 1024 * 1024) { // max 5MB
            try {
              comprobanteB64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(comprobante);
              });
            } catch(e) { console.warn('No se pudo convertir comprobante a base64:', e); }
          }
        }

        if (reqRef && isPagoMultiple && transferenciasMultiples.length > 1) {
          const sumTransferido = transferenciasMultiples.reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0);
          for (let i = 0; i < transferenciasMultiples.length; i++) {
            const t = transferenciasMultiples[i];
            // Subida individual de comprobante para cada transferencia
            let tCompUrl = '';
            let tCompB64 = '';
            const tFile = t.comprobante || comprobante;
            if (tFile) {
              try {
                const ext = tFile.name.split('.').pop() || 'jpg';
                const fPath = `comprobantes/${(foundUser.Identidad || 'x').replace(/[^a-zA-Z0-9]/g,'_')}_${t.referencia.trim()}_${Date.now()}.${ext}`;
                const { data: upD, error: upE } = await supabase.storage
                  .from('comprobantes')
                  .upload(fPath, tFile, { upsert: true, contentType: tFile.type });
                if (!upE && upD) {
                  const { data: pD } = supabase.storage.from('comprobantes').getPublicUrl(fPath);
                  tCompUrl = pD?.publicUrl || '';
                }
              } catch(e) {}
              if (!tCompUrl && tFile.size < 5 * 1024 * 1024) {
                try {
                  tCompB64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(tFile);
                  });
                } catch(e) {}
              }
            }
            const { error: pErr } = await supabase.from('pagos_reportados').insert({
              identidad: foundUser.Identidad,
              monto: parseFloat(t.monto),
              banco: t.banco,
              referencia: t.referencia.trim(),
              tipo: 'Transferencia',
              estado: 'Por Verificar',
              detalles: JSON.stringify({
                recibos: selectedRecibos,
                cuotas: selectedCuotas,
                servicios: selectedServicios,
                tala_poda: selectedTalaPoda,
                cajero: cajero_id,
                pago_multiple: true,
                transferencia_num: i + 1,
                total_transferencias: transferenciasMultiples.length,
                monto_total_grupo: sumTransferido,
                transferencias_grupo: transferenciasMultiples.map(item => ({
                  banco: item.banco,
                  referencia: item.referencia.trim(),
                  monto: item.monto,
                  fecha: item.fecha
                })),
                otras_referencias: transferenciasMultiples.filter((_, idx) => idx !== i).map(item => item.referencia.trim()),
                saldo_favor: i === 0 ? saldoAFavorNuevo : 0,
                es_abono: esAbono,
                monto_abonado: esAbono ? sumTransferido : undefined,
                total_seleccionado: totalBs,
                saldo_usado: i === 0 ? descuentoSaldoFavor : 0,
                tasa_bcv: currentBcvRate,
                deuda_total_sistema: foundUser.DeudaTotal,
                comprobante_nombre: tFile?.name || '',
                comprobante_url: tCompUrl,
                comprobante_b64: tCompB64 || undefined,
                fecha_transaccion: t.fecha,
                tasa_bcv_aplicada: customBcvRate ? customBcvRate : undefined,
                nota_cambio_tasa: justificacionBcv ? justificacionBcv : undefined
              })
            });
            if (pErr) throw pErr;
            
            logAudit(`Transferencia Múltiple #${i + 1} Registrada (Por Verificar)`, {
              contribuyente: foundUser.Contribuyente,
              identidad: foundUser.Identidad,
              monto_bs: parseFloat(t.monto),
              banco: t.banco,
              referencia: t.referencia.trim(),
              fecha_transaccion: t.fecha,
              referencias_facturas: selectedRecibos,
              es_abono: esAbono,
              pago_multiple: true,
              total_transferencias: transferenciasMultiples.length
            }, 'TRANSFERENCIA');
          }
        } else {
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
              tala_poda: selectedTalaPoda,
              cajero: cajero_id,
              saldo_favor: saldoAFavorNuevo,
              es_abono: esAbono,
              monto_abonado: esAbono ? montoReal : undefined,
              total_seleccionado: totalBs,
              saldo_usado: descuentoSaldoFavor,
              tasa_bcv: currentBcvRate,
              deuda_total_sistema: foundUser.DeudaTotal,
              comprobante_nombre: comprobante?.name || '',
              comprobante_url: comprobanteUrl,
              comprobante_b64: comprobanteB64 || undefined,
              fecha_transaccion: fechaTransaccion,
              tasa_bcv_aplicada: customBcvRate ? customBcvRate : undefined,
              nota_cambio_tasa: justificacionBcv ? justificacionBcv : undefined
            })
          });
          if (pErr) throw pErr;
        }
        
        // Update items to 'Por Verificar'
        if (selectedRecibos.length > 0 && !esAbono) {
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

        // Tala y Poda Transferencia -> Por Verificar
        if (selectedTalaPoda.length > 0) {
          await supabase.from('servicios_especiales').update({ estado: 'Por Verificar' }).in('referencia', selectedTalaPoda);
        }
        // Servicios especiales Transferencia â†’ Por Verificar (incluir en detalles)
        if (selectedServicios.length > 0) {
          await supabase.from('servicios_especiales').update({ estado: 'Por Verificar' }).in('referencia', selectedServicios);
        }

        setSuccessMsg(`${paymentMethod} registrado(a). Ha sido enviado(a) al módulo de Emisión de recibos para su conciliación automática o manual.`);
        // ── AUDITORÍA: Transferencia registrada ──
        logAudit(`${paymentMethod} Registrada (Por Verificar)`, {
          contribuyente: foundUser.Contribuyente,
          identidad: foundUser.Identidad,
          monto_bs: montoReal,
          banco: banco,
          referencia: referencia,
          fecha_transaccion: fechaTransaccion,
          referencias_facturas: selectedRecibos,
          es_abono: esAbono,
        }, 'TRANSFERENCIA');
      }

      fetchTodayPagos();
      // Agregar al historial de la sesión
      setSessionPagos(prev => [{
        contribuyente: foundUser?.Contribuyente || '',
        identidad: foundUser?.Identidad || '',
        inmueble: (() => {
          // Extraer inmuebles únicos de los recibos seleccionados
          const inmsSet = new Set<string>();
          selectedRecibos.forEach((ref: string) => {
            const f = recibos.find((r: any) => r.referencia === ref);
            if (f?.inmueble) inmsSet.add(f.inmueble);
          });
          if (inmsSet.size === 0) {
            // Fallback: extraer del código de referencia CM-I-000663-09-2026
            const firstRef = selectedRecibos[0] || '';
            const m = firstRef.match(/CM-(I-\d+)-/);
            if (m) inmsSet.add(m[1]);
          }
          return [...inmsSet].join(', ');
        })(),
        monto: montoReal,
        metodo: paymentMethod,
        referencia: reqRef ? referencia : referenciaDebito,
        hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        esAbono,
        saldoFavor: saldoAFavorNuevo,
      }, ...prev]);

      // Refrescar datos del contribuyente sin salir de la pantalla
      setTimeout(async () => {
        setSuccessMsg('');
        setSelectedRecibos([]);
        setSelectedCuotas([]);
        setSelectedServicios([]);
        setSelectedTalaPoda([]);
        setReferencia('');
        setReferenciaDebito('');
        setMontoDebito('');
        setMontoTransferido('');
        setComprobante(null);
        setTransferenciasMultiples([
          { id: '1', banco: 'Banesco', referencia: '', monto: '', fecha: new Date().toISOString().split('T')[0], comprobante: null }
        ]);
        setTotalBs(0);
        setConfirmPayload(null);
        await handleSearch();
      }, 2500);
      
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
            id="btn-buscar-caja"
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
                        {totalMMV.toFixed(2)} MMV (Tarifa) Ã— {currentBcvRate.toFixed(2)} Bs/MMV (Tasa BCV) = {(totalMMV * currentBcvRate).toFixed(2)} Bs Mensuales.
                        <span className="block text-[9px] text-slate-400 mt-0.5">* Las recibos previas se están recalculando con la tasa manual asignada.</span>
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
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded border border-emerald-200 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={
                          (() => {
                            const firstPendingIdx = recibos.findIndex((r: any) => isItemPending(r.referencia));
                            const maxSelectable = firstPendingIdx === -1 ? recibos.length : firstPendingIdx;
                            return selectedRecibos.length > 0 && selectedRecibos.length === maxSelectable;
                          })()
                        } 
                        onChange={(e) => {
                          const firstPendingIdx = recibos.findIndex((r: any) => isItemPending(r.referencia));
                          const maxSelectable = firstPendingIdx === -1 ? recibos.length : firstPendingIdx;
                          if (e.target.checked) setSelectedRecibos(recibos.slice(0, maxSelectable).map((r: any) => r.referencia));
                          else setSelectedRecibos([]);
                        }} 
                        className="w-3 h-3 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                      />
                      Seleccionar deuda completa
                    </label>
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
                          const firstPendingIdx = recibos.findIndex((r: any) => isItemPending(r.referencia));
                          const maxSelectable = firstPendingIdx === -1 ? recibos.length : firstPendingIdx;
                          if (!isNaN(n) && n > 0) setSelectedRecibos(recibos.slice(0, Math.min(n, maxSelectable)).map((r: any) => r.referencia));
                          else if (e.target.value === '') setSelectedRecibos([]);
                        }}
                        defaultValue=""
                      >
                        <option value="">N meses</option>
                        {Array.from({ length: recibos.findIndex((r: any) => isItemPending(r.referencia)) === -1 ? recibos.length : recibos.findIndex((r: any) => isItemPending(r.referencia)) }, (_, i) => i + 1).map(n => (
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
                    {recibos.map(r => {
                      const abonoInfo = getAbonoInfo(r);
                      const ajusteMes = facturasAjustes[r.referencia];
                      return (
                      <label key={r.referencia} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${selectedRecibos.includes(r.referencia) ? 'bg-emerald-50 border-emerald-200' : isItemPending(r.referencia) ? 'bg-slate-100 border-slate-300 opacity-75 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={selectedRecibos.includes(r.referencia)} disabled={isItemPending(r.referencia)} onChange={() => toggleRecibo(r.referencia)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{r.referencia}</p>
                            <p className="text-xs text-slate-500">
                              {(() => {
                                const M = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
                                if (!r.emision) return 'Sin fecha';
                                const p = r.emision.split('-');
                                return p.length >= 2 ? `${M[parseInt(p[1])-1] || p[1]} ${p[0]}` : r.emision;
                              })()}
                            </p>
                            {ajusteMes?.actividad ? (
                              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                                {ajusteMes.actividad}
                              </span>
                            ) : (() => {
                              const userInms = inmuebles.filter((i: any) => {
                                if (!foundUser) return false;
                                const id = (i.identidad || '').replace(/-/g,'').toUpperCase();
                                const fid = (foundUser.Identidad || '').replace(/-/g,'').toUpperCase();
                                return id === fid;
                              });
                              const matchedInm = userInms.find((i: any) => i.inmueble && r.referencia.includes(i.inmueble));
                              if (!matchedInm) return null;
                              const desc = [matchedInm.tipo, matchedInm.actividad_principal].filter(Boolean).join(' · ') || matchedInm.clasificacion || '';
                              return <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 truncate max-w-[220px]">{matchedInm.inmueble}{desc ? ` · ${desc}` : ''}</p>;
                            })()}
                          </div>
                        </div>
                        <div className="flex flex-col items-end text-right">
                          {isItemPending(r.referencia) ? (
                            <>
                              <span className="text-[10px] text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded uppercase mb-0.5">Transf. por conciliar</span>
                              <span className="font-bold text-orange-700">Bs. {formatBs(getPendingMontoForRecibo(r.referencia))}</span>
                            </>
                          ) : abonoInfo.esAbono && abonoInfo.montoAbonado > 0 ? (
                            <>
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-[9px] text-amber-800 font-bold bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Abonado: Bs. {formatBs(abonoInfo.montoAbonado)}
                                </span>
                                <span className="text-[9px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  Resta: Bs. {formatBs(abonoInfo.restante)}
                                </span>
                              </div>
                              <span className="font-bold text-emerald-700 text-sm">Bs. {formatBs(abonoInfo.restante)}</span>
                            </>
                          ) : (
                            <span className="font-bold text-emerald-700">Bs. {formatBs(getReciboMonto(r))}</span>
                          )}
                        </div>
                      </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 1. SECCIÓN EXCLUSIVA: CUOTA INICIAL DEL DECRETO / CONVENIO */}
            {cuotas.some(c => c.esInicial) && (
              <div className="bg-white rounded-lg shadow-sm border border-emerald-300 overflow-hidden">
                <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Handshake className="w-5 h-5" />
                    <h3 className="font-bold text-sm tracking-wide uppercase">Cuota Inicial del Convenio / Decreto</h3>
                  </div>
                  <span className="text-[11px] bg-emerald-800 px-2 py-0.5 rounded font-semibold">Requerida para activar convenio</span>
                </div>
                <div className="p-4 bg-emerald-50/40">
                  <div className="space-y-2">
                    {cuotas.filter(c => c.esInicial).map((c, i) => (
                      <label key={'ini-' + i} className={`flex items-center justify-between p-3.5 border-2 rounded-lg cursor-pointer transition-colors ${selectedCuotas.find(sc => sc.convId === c.convId && sc.cuotaId === c.cuotaId) ? 'bg-emerald-100/70 border-emerald-500' : 'bg-white hover:bg-emerald-50/50 border-emerald-200'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!selectedCuotas.find(sc => sc.convId === c.convId && sc.cuotaId === c.cuotaId)}
                            onChange={() => toggleCuota(c.convId, c.cuotaId)}
                            className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase bg-emerald-700 text-white px-2 py-0.5 rounded">CUOTA INICIAL</span>
                              <p className="font-bold text-sm text-slate-800">{c.numeroConv}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Fecha límite pactada: {c.fecha}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-base text-emerald-800">{c.monto} Bs</span>
                          <span className="block text-[10px] text-emerald-600 font-semibold">Monto Inicial Acordado</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. SECCIÓN: CUOTAS MENSUALES PENDIENTES */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-orange-800">Cuotas Mensuales por Pagar</h3>
                </div>
                <span className="text-xs text-orange-600 font-medium">({cuotas.filter(c => !c.esInicial).length} cuotas restantes)</span>
              </div>
              <div className="p-4">
                {cuotas.filter(c => !c.esInicial).length === 0 ? (
                  <p className="text-sm text-slate-500">{cuotas.some(c => c.esInicial) ? 'Solo está pendiente la Cuota Inicial.' : 'No hay cuotas pendientes.'}</p>
                ) : (
                  <div className="space-y-2">
                    {cuotas.filter(c => !c.esInicial).map((c, i) => (
                      <label key={'rest-' + i} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedCuotas.find(sc => sc.convId === c.convId && sc.cuotaId === c.cuotaId) ? 'bg-orange-50 border-orange-200' : 'hover:bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!selectedCuotas.find(sc => sc.convId === c.convId && sc.cuotaId === c.cuotaId)}
                            onChange={() => toggleCuota(c.convId, c.cuotaId)}
                            className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                          />
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{c.numeroConv} - {c.label || `Cuota ${c.cuotaNum || (c.cuotaId + 1)} de ${c.totalCuotas || 1}`}</p>
                            <p className="text-xs text-slate-500">Fecha de Vencimiento: {c.fecha}</p>
                          </div>
                        </div>
                        <span className="font-bold text-orange-700">{c.monto} Bs</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tala y Poda */}
            {talaPoda.length > 0 && (
              <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${selectedTalaPoda.length > 0 ? 'border-green-300' : 'border-slate-200'}`}>
                <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex items-center gap-2">
                  <TreePine className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <h3 className="font-bold text-green-800">Servicio de Tala y Poda</h3>
                  <span className="text-xs text-green-600 font-medium">({talaPoda.length})</span>
                </div>
                <div className="p-4 space-y-2">
                  {talaPoda.map((s: any) => (
                    <label key={s.referencia} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedTalaPoda.includes(s.referencia) ? 'bg-green-50 border-green-300' : 'hover:bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTalaPoda.includes(s.referencia)}
                          onChange={() => toggleTalaPoda(s.referencia)}
                          className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500"
                        />
                        <TreePine className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-slate-800">{s.descripcion || 'Servicio de Tala y Poda'}</p>
                          <p className="text-xs text-slate-500">{s.referencia} • {s.fecha || 'Sin fecha'}</p>
                        </div>
                      </div>
                      <span className="font-bold text-green-700">Bs. {formatBs(parseFloat(s.monto || '0'))}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700">Método de Pago</span>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
                  <input type="checkbox" checked={isPagoMultiple} onChange={e => setIsPagoMultiple(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase">Pago Múltiple</span>
                </label>
              </div>
              
              {isPagoMultiple && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium">
                    <strong>Pago Múltiple activado:</strong> Registre la transferencia primero. 
                    El recibo quedará bloqueado hasta que la transferencia sea conciliada (verificada). 
                    Una vez aprobada, el contribuyente podrá cancelar el monto restante con Débito u otro método.
                  </p>
                </div>
              )}
              <label className="block">
                <select 
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Debito">Punto de Venta (TD/TC)</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  {(foundUser?.SaldoFavor || 0) > 0 && (
                    <option value="Saldo a Favor">💳 Saldo a Favor (Bs. {formatBs(foundUser?.SaldoFavor || 0)})</option>
                  )}
                  </select>
                  {(!bancosVenezuela.includes(banco) && banco !== '' || banco === 'Otro') && (
                    <input 
                      type="text" 
                      placeholder="Escriba el nombre del banco" 
                      value={banco === 'Otro' ? '' : banco}
                      onChange={(e) => setBanco(e.target.value)}
                      className="mt-2 w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  )}
              </label>

                  {['Debito'].includes(paymentMethod) && (
                    <div className="mt-4 space-y-3">
                      {isPagoMultiple && (
                        <label className="block mt-2">
                          <span className="text-xs font-semibold text-slate-600 mb-1 block">Monto a Pagar por Punto (Bs)</span>
                          <input type="text" value={montoDebito} onChange={e => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setMontoDebito(val);
                          }} placeholder="Ej. 1500.00" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                        </label>
                      )}
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
                    </div>
                  )}

                  {['Transferencia'].includes(paymentMethod) && (
                <div className="space-y-3 bg-white p-3 rounded border border-slate-200">
                  {isPagoMultiple ? (
                    /* UI PARA PAGO MÚLTIPLE CON VARIAS TRANSFERENCIAS */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-700 uppercase">Transferencias del Pago Múltiple ({transferenciasMultiples.length})</span>
                        <button
                          type="button"
                          onClick={() => {
                            const currentSum = transferenciasMultiples.reduce((acc, x) => acc + (parseFloat(x.monto) || 0), 0);
                            const req = Math.max(0, totalBs - (useSaldoFavor ? (foundUser?.SaldoFavor || 0) : 0));
                            const remaining = Math.max(0, req - currentSum);
                            setTransferenciasMultiples(prev => [
                              ...prev,
                              {
                                id: String(Date.now()),
                                banco: 'Banesco',
                                referencia: '',
                                monto: remaining > 0 ? remaining.toFixed(2) : '',
                                fecha: new Date().toISOString().split('T')[0],
                                comprobante: null
                              }
                            ]);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors shadow-sm"
                        >
                          + Agregar otra transferencia
                        </button>
                      </div>

                      {transferenciasMultiples.map((t, idx) => (
                        <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">Transferencia #{idx + 1}</span>
                            {transferenciasMultiples.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferenciasMultiples(prev => prev.filter(x => x.id !== t.id));
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-0.5 rounded hover:bg-red-50"
                              >
                                ✕ Eliminar
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fecha</span>
                              <input
                                type="date"
                                value={t.fecha}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTransferenciasMultiples(prev => prev.map(x => x.id === t.id ? { ...x, fecha: val } : x));
                                }}
                                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Banco</span>
                              <select
                                value={t.banco}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTransferenciasMultiples(prev => prev.map(x => x.id === t.id ? { ...x, banco: val } : x));
                                }}
                                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                              >
                                <option value="" disabled>Seleccione...</option>
                                {bancosVenezuela.map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Referencia (8 dígitos)</span>
                                <span className={`text-[9px] font-bold ${(t.referencia || '').length === 8 ? 'text-emerald-600' : 'text-slate-400'}`}>{(t.referencia || '').length}/8 dígitos</span>
                              </div>
                              <input
                                type="text"
                                placeholder="Ej: 12345678"
                                value={t.referencia}
                                onChange={async (e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                  setTransferenciasMultiples(prev => prev.map(x => x.id === t.id ? { ...x, referencia: val, dupWarning: '' } : x));
                                  if (val.length === 8) {
                                    const { data } = await supabase.from('pagos_reportados').select('id').eq('referencia', val).limit(1);
                                    if (data && data.length > 0) {
                                      setTransferenciasMultiples(prev => prev.map(x => x.id === t.id ? { ...x, dupWarning: '⚠️ Referencia ya registrada en el sistema' } : x));
                                    }
                                  }
                                }}
                                maxLength={8}
                                className={`w-full border rounded px-2.5 py-1.5 text-xs bg-white focus:ring-1 outline-none font-mono tracking-wider ${t.dupWarning ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-emerald-500'}`}
                              />
                              {t.dupWarning && <p className="text-[9px] text-red-600 font-bold mt-0.5">{t.dupWarning}</p>}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Monto Pagado (Bs)</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Ej: 261339.15"
                                value={t.monto}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTransferenciasMultiples(prev => prev.map(x => x.id === t.id ? { ...x, monto: val } : x));
                                }}
                                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                          </div>

                            {/* Comprobante Individual por Transferencia */}
                            <div className="pt-2 border-t border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Comprobante de Pago #{idx + 1} <span className="text-red-500">*</span>
                              </span>
                              <div className="border border-dashed border-slate-300 bg-white rounded-lg p-2.5 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      const file = e.target.files[0];
                                      setTransferenciasMultiples(prev => prev.map(x => x.id === t.id ? { ...x, comprobante: file } : x));
                                    }
                                  }}
                                />
                                {t.comprobante ? (
                                  <div className="flex items-center gap-2 text-emerald-700">
                                    <span className="text-xs font-bold truncate max-w-[220px]">📎 {t.comprobante.name}</span>
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Adjuntado</span>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <span className="text-xs font-semibold text-slate-600 block">📁 Adjuntar comprobante para Transf. #{idx + 1}</span>
                                    <span className="text-[9px] text-slate-400">JPG, PNG o PDF</span>
                                  </div>
                                )}
                              </div>
                            </div>
                        </div>
                      ))}

                      {/* Resumen de totales de múltiples transferencias con cálculo dinámico */}
                      {(() => {
                        const sumT = transferenciasMultiples.reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0);
                        const reqT = Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0));
                        const diff = sumT - reqT;
                        const restante = Math.max(0, reqT - sumT);

                        return (
                          <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-slate-50 border-2 border-indigo-200 rounded-xl text-xs space-y-2 shadow-sm">
                            <div className="flex justify-between items-center text-slate-700 font-medium">
                              <span>Total Requerido a Pagar:</span>
                              <span className="font-extrabold text-sm text-slate-900">Bs. {formatBs(reqT)}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-indigo-900">
                              <span>Total Transferencias Abonado ({transferenciasMultiples.length}):</span>
                              <span className="text-sm text-indigo-700">Bs. {formatBs(sumT)}</span>
                            </div>

                            {/* Alerta de Monto Restante por Cubrir */}
                            {restante > 0.01 && (
                              <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 font-bold">
                                <span>⚠️ Resta por Pagar:</span>
                                <span className="text-sm font-black text-amber-700">Bs. {formatBs(restante)}</span>
                              </div>
                            )}

                            {/* Saldo a Favor o Pago Completo */}
                            {diff > 0.01 && (
                              <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 font-bold">
                                <span>✅ Excedente (Saldo a Favor):</span>
                                <span className="text-sm font-black text-emerald-700">+ Bs. {formatBs(diff)}</span>
                              </div>
                            )}

                            {Math.abs(diff) <= 0.01 && sumT > 0 && (
                              <div className="p-2 bg-emerald-100/70 border border-emerald-400 rounded-lg text-center text-emerald-800 font-bold">
                                ✅ Monto cubierto exactamente al 100% (Bs. 0,00 de diferencia)
                              </div>
                            )}

                            <div className="flex justify-between font-bold pt-2 border-t border-indigo-200 text-slate-700">
                              <span>Diferencia Neta:</span>
                              <span className={diff > 0.01 ? 'text-emerald-700 font-black' : diff < -0.01 ? 'text-orange-700 font-black' : 'text-slate-700'}>
                                {diff > 0.01 ? `+ Bs. ${formatBs(diff)} (A Favor)` : diff < -0.01 ? `- Bs. ${formatBs(Math.abs(diff))} (Faltante)` : 'Bs. 0,00 (Exacto)'}
                              </span>
                            </div>

                            {/* Botón rápido para auto-completar el monto restante en la última transferencia si está vacía */}
                            {restante > 0.01 && transferenciasMultiples.some(t => !t.monto || parseFloat(t.monto) <= 0) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const emptyIdx = transferenciasMultiples.findIndex(t => !t.monto || parseFloat(t.monto) <= 0);
                                  if (emptyIdx !== -1) {
                                    setTransferenciasMultiples(prev => prev.map((x, idx) => idx === emptyIdx ? { ...x, monto: restante.toFixed(2) } : x));
                                  }
                                }}
                                className="w-full mt-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors shadow-sm"
                              >
                                ⚡ Colocar Bs. {formatBs(restante)} en la transferencia pendiente
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* UI PARA TRANSFERENCIA INDIVIDUAL */
                    <>
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
                          value={bancosVenezuela.includes(banco) ? banco : (banco ? 'Otro' : '')}
                          onChange={(e) => setBanco(e.target.value === 'Otro' ? 'Otro' : e.target.value)}
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="" disabled>Seleccione un Banco...</option>
                          {bancosVenezuela.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      {(!bancosVenezuela.includes(banco) && banco !== '' || banco === 'Otro') && (
                        <input 
                          type="text" 
                          placeholder="Escriba el nombre del banco" 
                          value={banco === 'Otro' ? '' : banco}
                          onChange={(e) => setBanco(e.target.value)}
                          className="mt-2 w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          required
                        />
                      )}
                      </label>
                      <label className="block">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-slate-600">Referencia de Transferencia (8 dígitos)</span>
                          <span className={`text-[10px] font-bold ${referencia.length === 8 ? 'text-emerald-600' : 'text-slate-400'}`}>{referencia.length}/8 dígitos</span>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Ej: 12345678"
                          value={referencia}
                          onChange={async (e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                            setReferencia(val);
                            setDupRefWarning('');
                            if (val.length === 8) {
                              const { data } = await supabase.from('pagos_reportados').select('id').eq('referencia', val).limit(1);
                              if (data && data.length > 0) setDupRefWarning(`⚠️ Esta referencia "${val}" ya fue registrada antes.`);
                            }
                          }}
                          maxLength={8}
                          className={`w-full border rounded px-3 py-2 text-sm focus:ring-2 outline-none font-mono tracking-wider ${dupRefWarning ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-slate-300 focus:ring-emerald-500'}`}
                        />
                        {dupRefWarning && <p className="text-[10px] text-red-600 font-bold mt-1">{dupRefWarning}</p>}
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
                    </>
                  )}

                  {/* Comprobante de Pago (solo si es transferencia individual) */}
                  {!isPagoMultiple && (
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
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={handlePayment}
              disabled={isProcessing || totalBs <= 0}
              className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" /> 
              {isProcessing ? 'Procesando...' : 'Verificar y Pagar'}
            </button>

            {/* Historial de pagos de la sesión */}
            {sessionPagos.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Pagos de esta sesión ({sessionPagos.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sessionPagos.map((p, i) => (
                    <div key={i} className="flex justify-between items-start text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <div>
                        <div className="font-bold text-slate-700 truncate max-w-[180px]">{p.contribuyente}</div>
                        {p.inmueble && <div className="text-slate-500 font-medium">{p.inmueble}</div>}
                        <div className="text-slate-500">{p.metodo} · {p.hora}</div>
                        {p.referencia && <div className="text-slate-400">Ref: {p.referencia}</div>}
                        {p.esAbono && <span className="text-orange-600 font-semibold">Abono</span>}
                        {p.saldoFavor > 0 && <div className="text-blue-600">+Saldo favor: Bs. {formatBs(p.saldoFavor)}</div>}
                      </div>
                      <div className="font-black text-emerald-700 text-sm">Bs. {formatBs(p.monto)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-xs font-bold text-slate-700">
                  Total sesión: <span className="text-emerald-700">Bs. {formatBs(sessionPagos.reduce((s, p) => s + p.monto, 0))}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      )}
      </div>
      )}

      {/* ── Modal de Confirmación de Pago ── */}
      {isConfirmModalOpen && confirmPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-lg">Confirmar Pago</h3>
                <p className="text-slate-400 text-xs mt-0.5">Verifique los datos antes de procesar</p>
              </div>
              <button onClick={() => { setIsConfirmModalOpen(false); setConfirmPayload(null); }} className="text-slate-400 hover:text-white text-2xl font-bold leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-3">
              {/* Contribuyente */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contribuyente</p>
                <p className="font-black text-slate-800 text-sm">{foundUser?.Contribuyente}</p>
                <p className="text-slate-500 text-xs">{foundUser?.Identidad}</p>
              </div>

              {/* Recibos seleccionados */}
              {confirmPayload.recibosSeleccionados?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Recibos a saldar</p>
                  <div className="space-y-1">
                    {confirmPayload.recibosSeleccionados.map((ref: string) => {
                      const f = recibos.find((r: any) => r.referencia === ref);
                      return (
                        <div key={ref} className="flex justify-between text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                          <span className="text-slate-600 font-medium">{ref}</span>
                          <span className="font-bold text-slate-800">Bs. {formatBs(getReciboMonto(f))}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Método y referencia */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Método</p>
                  <p className="font-bold text-blue-800 text-sm mt-0.5">{paymentMethod}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Fecha</p>
                  <p className="font-bold text-blue-800 text-sm mt-0.5">{fechaTransaccion}</p>
                </div>
              </div>

              {(referenciaDebito || referencia) && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-amber-500 uppercase">N° Referencia / Comprobante</p>
                  <p className="font-black text-amber-800 text-base tracking-widest">{referenciaDebito || referencia}</p>
                </div>
              )}

              {confirmPayload.descuentoSaldoFavor > 0 && (
                <div className="flex justify-between text-xs text-slate-600 px-1">
                  <span>Descuento saldo a favor:</span>
                  <span className="font-bold text-green-600">- Bs. {formatBs(confirmPayload.descuentoSaldoFavor)}</span>
                </div>
              )}

              {confirmPayload.esAbono && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700 font-semibold">
                  ⚠️ Pago parcial (abono). Quedará saldo pendiente de Bs. {formatBs(Math.max(0, confirmPayload.finalTotal - confirmPayload.montoReal))}
                </div>
              )}

              {confirmPayload.saldoAFavorNuevo > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 font-semibold">
                  💳 Se generará Saldo a Favor de Bs. {formatBs(confirmPayload.saldoAFavorNuevo)}
                </div>
              )}

              {/* Total */}
              <div className="bg-emerald-600 rounded-xl p-4 flex justify-between items-center">
                <span className="text-white font-bold text-sm">TOTAL A PAGAR</span>
                <span className="text-white font-black text-2xl">Bs. {formatBs(confirmPayload.montoReal)}</span>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setIsConfirmModalOpen(false); setConfirmPayload(null); }}
                className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >Cancelar</button>
              <button
                onClick={handleConfirmAndPay}
                disabled={isProcessing}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {isProcessing ? 'Procesando...' : 'Procesar Pago'}
              </button>
            </div>
          </div>
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

      {/* ── MODAL RECIBO AUTOMÁTICO POST-PAGO ── */}

      {/* MODAL COBRAR MES ANTERIOR / RETROACTIVO */}
      {modalMesAnterior && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <span>📅</span>
                Cobrar Mes Anterior / Período Retroactivo
              </h3>
              <button onClick={() => setModalMesAnterior(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-slate-600">
                Seleccione el año y mes anterior que desea cobrar para el contribuyente <strong>{foundUser?.Contribuyente}</strong>:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Año</label>
                  <select
                    value={mesAnteriorAnio}
                    onChange={e => setMesAnteriorAnio(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white font-medium"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Mes</label>
                  <select
                    value={mesAnteriorMes}
                    onChange={e => setMesAnteriorMes(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white font-medium"
                  >
                    <option value="01">Enero</option>
                    <option value="02">Febrero</option>
                    <option value="03">Marzo</option>
                    <option value="04">Abril</option>
                    <option value="05">Mayo</option>
                    <option value="06">Junio</option>
                    <option value="07">Julio</option>
                    <option value="08">Agosto</option>
                    <option value="09">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Monto a Cobrar (Bs) — Opcional
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Dejar en blanco para cálculo automático"
                  value={mesAnteriorMonto}
                  onChange={e => setMesAnteriorMonto(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Si no ingresa monto, el sistema calculará según la ordenanza y tasa BCV actual.</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalMesAnterior(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isAddingRetro}
                onClick={handleAgregarMesAnterior}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {isAddingRetro ? 'Agregando...' : 'Agregar Período a Cobrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reciboData && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto py-6 px-2 print:bg-white print:items-start print:py-0">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full print:shadow-none print:rounded-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl print:hidden">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <span className="text-slate-800 font-bold text-lg">¡Pago Procesado! — Recibo</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                <button
                  onClick={() => setReciboData(null)}
                  className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <X className="w-4 h-4" /> Cerrar
                </button>
              </div>
            </div>
            <div className="p-4">
              {Array.isArray(reciboData)
                ? reciboData.map((rd: any, idx: number) => (
                    <div key={idx} className={idx > 0 ? 'mt-6 pt-6 border-t border-slate-200' : ''}>
                      {reciboData.length > 1 && (
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2">Recibo {idx + 1} de {reciboData.length} — Inmueble: {rd.codContribuyente}</div>
                      )}
                      <ReciboImprimible data={rd} />
                    </div>
                  ))
                : <ReciboImprimible data={reciboData} />
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
