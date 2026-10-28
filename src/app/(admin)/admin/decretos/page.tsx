'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileCheck, CheckCircle2, XCircle, Calculator, X, RotateCcw, CreditCard, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generarPlanillaConvenioPDF } from '@/lib/pdfPlanillaConvenio';
import { ReciboImprimible } from '@/components/ReciboImprimible';
import { Printer } from 'lucide-react';
import { Download, FileText } from 'lucide-react';

const bancosVenezuela = [
  '100% Banco', 'Bancamiga', 'Bancaribe', 'Banco Activo', 'Banco Agrícola de Venezuela',
  'Banco Bicentenario', 'Banco Caroní', 'Banco de Venezuela', 'Banco del Tesoro', 
  'Banco Exterior', 'Banco Mercantil', 'Banco Nacional de Crédito (BNC)', 'Banco Plaza',
  'Banco Provincial', 'Banco Sofitasa', 'Banco del Sur', 'Banesco', 'Banplus', 'Bancrecer',
  'Mi Banco', 'Banco Internacional (BIB)', 'Banco Venezolano de Crédito (BVC)',
  'BanFanb', 'Bancovi', 'Otro'
].sort();

export default function DecretosPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [decretosActivos, setDecretosActivos] = useState<any[]>([]);
  const [loadingDecretos, setLoadingDecretos] = useState(false);
  const [filterDecretos, setFilterDecretos] = useState('');
  const [ultimoConvenioProcesado, setUltimoConvenioProcesado] = useState<any>(null);
  const [reciboModalData, setReciboModalData] = useState<any>(null);

  const fetchDecretosActivos = async () => {
    setLoadingDecretos(true);
    try {
      const { data: convs, error } = await supabase
        .from('convenios')
        .select('*')
        .not('estado', 'in', '(Anulado,Eliminado)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Join with inmuebles for extra info
      const { data: inms } = await supabase
        .from('inmuebles')
        .select('identidad, contribuyente, direccion, telefono, correo_electronico, clasificacion, inmueble, cod_cont');

      const inmsMap = new Map();
      (inms || []).forEach((i: any) => {
        const clean = (i.identidad || '').replace(/[-.s]/g, '').toUpperCase();
        if (clean && !inmsMap.has(clean)) inmsMap.set(clean, i);
      });

      const enriched = (convs || []).map((c: any) => {
        const clean = (c.identidad || '').replace(/[-.s]/g, '').toUpperCase();
        const inm = inmsMap.get(clean) || {};
        return {
          ...c,
          inmuebleInfo: inm
        };
      });

      setDecretosActivos(enriched);
    } catch (e: any) {
      console.error('Error cargando decretos activos:', e);
    } finally {
      setLoadingDecretos(false);
    }
  };

  useEffect(() => {
    fetchDecretosActivos();
  }, []);

  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInmueble, setSelectedInmueble] = useState<any>(null);
  const [evaluacionLoading, setEvaluacionLoading] = useState(false);
  const [evaluacionResult, setEvaluacionResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Simulador State
  const [cuotas, setCuotas] = useState(1);
  const [pagoInicial, setPagoInicial] = useState(0);
  const [tipoPago, setTipoPago] = useState<'contado' | 'fraccionado'>('fraccionado');
  const [procesando, setProcesando] = useState(false);
  const [procesadoExito, setProcesadoExito] = useState<string | null>(null);

  // Registro de Pago del Convenio
  const [registrarPago, setRegistrarPago] = useState(true);
  const [montoPago, setMontoPago] = useState<number | string>('');
  const [metodoPago, setMetodoPago] = useState('Punto de Venta / Débito');
  const [bancoPago, setBancoPago] = useState('Banesco');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);

  const getLoggedUser = () => {
    if (typeof window === 'undefined') return 'Administrador';
    const u = localStorage.getItem('adminUser');
    const l = localStorage.getItem('adminLetra');
    if (u) return l && u !== 'Administrador' ? `${l}-${u}` : u;
    try {
      const d = JSON.parse(localStorage.getItem('admin_user_data') || '{}');
      if (d.nombre) return d.nombre;
      if (d.usuario) return d.usuario;
    } catch(e){}
    return 'Administrador';
  };

  const searchInmuebles = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*')
        .or(`identidad.ilike.%${searchTerm}%,contribuyente.ilike.%${searchTerm}%`)
        .limit(20);
        
      if (error) throw error;
      setInmuebles(data || []);
    } catch (e: any) {
      alert("Error buscando usuarios: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEvaluador = async (inmueble: any) => {
    setSelectedInmueble(inmueble);
    setModalOpen(true);
    setEvaluacionLoading(true);
    setEvaluacionResult(null);
    setErrorMsg('');
    setProcesadoExito(null);

    try {
      const res = await fetch('/api/decretos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          inmueble_id: inmueble.id, 
          identidad: inmueble.identidad,
          sector: (() => {
            const name = (inmueble.contribuyente || '').toUpperCase();
            const cls = (inmueble.clasificacion || '').toUpperCase();
            if (name.includes('CONDOMINIO') || name.includes('RESIDENCIAS') || name.includes('CONJUNTO') || cls.includes('TIPO C')) return 'CONDOMINIO';
            if (cls.includes('RESIDENCIAL')) return 'RESIDENCIAL';
            if (cls.includes('INFORMAL') || cls.includes('AMBULANTE')) return 'INFORMAL';
            return 'COMERCIAL';
          })()
        })
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Error desconocido del servidor');
      }

      setEvaluacionResult(result);

      if (result.eligible && result.detalles) {
        const minPorcentaje = result.detalles.porcentaje_inicial_minimo / 100;
        const inicialMin = result.detalles.montoTotalPagarBs * minPorcentaje;
        setPagoInicial(inicialMin);
        setCuotas(1);
        setTipoPago('fraccionado');
        setMontoPago(inicialMin.toFixed(2));
      }
      
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setEvaluacionLoading(false);
    }
  };

  

  const handleVerReciboConvenio = async (conv: any) => {
    try {
      const cleanId = (conv.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
      const { data: pagos } = await supabase
        .from('pagos_reportados')
        .select('*')
        .or(`identidad.eq.${conv.identidad},identidad.eq.${cleanId}`)
        .order('created_at', { ascending: false });

      const pagoMatch = (pagos || []).find((p: any) => {
        let d: any = {};
        try { d = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch(e){}
        return (
          d.convenio_numero === conv.numero ||
          (p.referencia && (p.referencia === conv.numero || p.referencia.includes(conv.numero))) ||
          (d.cuotas && d.cuotas.some((cq: any) => cq.numeroConv === conv.numero || String(cq.convId) === String(conv.id))) ||
          (d.concepto && d.concepto.toLowerCase().includes('convenio'))
        );
      });

      if (!pagoMatch) {
        alert(`No se encontró un pago registrado para el convenio ${conv.numero}. Si es fraccionado, las cuotas pendientes pueden cancelarse en el módulo de Caja.`);
        return;
      }

      let det = typeof pagoMatch.detalles === 'string' ? JSON.parse(pagoMatch.detalles) : (pagoMatch.detalles || {});
      const inm = conv.inmuebleInfo || {};
      const refNum = (pagoMatch.referencia || String(pagoMatch.id || '1')).replace(/\D/g, '').slice(-7).padStart(7, '0') || '0000001';
      const montoTotal = Number(pagoMatch.monto || 0);

      const isInicial = det.cuota_pagada === 'Inicial' || (det.concepto && det.concepto.toLowerCase().includes('inicial'));
      const isContado = det.cuota_pagada === 'Total' || det.tipo_pago === 'contado' || (det.concepto && det.concepto.toLowerCase().includes('contado'));
      
      const conceptoTitulo = isInicial 
        ? `Pago Inicial de Convenio (Decreto N° ${det.decreto || '010-DA-09-2026'}) - Convenio ${conv.numero}`
        : isContado 
        ? `Pago Único de Contado (Decreto N° ${det.decreto || '010-DA-09-2026'}) - Convenio ${conv.numero}`
        : (det.concepto || `Pago de Convenio ${conv.numero}`);

      const conceptos = [
        {
          descripcion: conceptoTitulo,
          precioUnit: montoTotal,
          total: montoTotal
        }
      ];

      // Información complementaria de liquidación de decreto
      if (conv.identidad?.includes('303717071') || (conv.contribuyente && conv.contribuyente.toLowerCase().includes('cayo esmeralda'))) {
        conceptos.push({
          descripcion: 'Ampara 20 meses refinanciados (Feb 2025 - Sep 2026) con Exoneración del 50% de Capital y 100% de Accesorios. Cuota Inicial (25%) Cancelada.',
          precioUnit: 0,
          total: 0
        });
      } else if (conv.cuotas && parseInt(String(conv.cuotas)) > 1) {
        conceptos.push({
          descripcion: `Modalidad Fraccionada en ${conv.cuotas} Cuotas (${conv.frecuencia || 'Mensual'}). Cuota Inicial cancelada conforme a Decreto.`,
          precioUnit: 0,
          total: 0
        });
      }

      setReciboModalData({
        reciboNo: refNum,
        controlWeb: `WEB-${refNum}`,
        fechaEmision: pagoMatch.created_at ? pagoMatch.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        codContribuyente: inm.cod_cont || inm.inmueble || conv.identidad,
        razonSocial: conv.contribuyente,
        domicilioFiscal: (inm.direccion || 'TUCACAS, MUNICIPIO SILVA, FALCÓN').toUpperCase(),
        rifCi: conv.identidad,
        caja: det.cajero || pagoMatch.cajero || 'ADMINISTRADOR',
        conceptos,
        subTotal: montoTotal,
        exento: montoTotal,
        iva: 0,
        total: montoTotal,
        formaPago: pagoMatch.tipo === 'Debito' ? 'PUNTO DE VENTA' : (pagoMatch.tipo || 'TRANSFERENCIA').toUpperCase(),
        banco: pagoMatch.banco || 'BANCO',
        referencia: pagoMatch.referencia || 'S/R',
        tasaBcv: det.tasa_bcv || undefined
      });
    } catch (err: any) {
      alert('Error al cargar recibo del convenio: ' + err.message);
    }
  };

  const handleDescargarPlanilla = (conv: any) => {
    const rawMonto = parseFloat(String(conv.monto_total || '0').replace(/[^\d.]/g, '')) || 0;
    const inm = conv.inmuebleInfo || {};
    generarPlanillaConvenioPDF({
      numero: conv.numero,
      decreto: conv.numero?.startsWith('DEC-') ? 'Plan Especial "Borra tu Deuda" 2026' : 'Convenio de Pago Ordinario',
      contribuyente: conv.contribuyente,
      identidad: conv.identidad,
      direccion: inm.direccion || 'Tucacas Municipio Silva, Falcón',
      telefono: inm.telefono || 'N/A',
      correo: inm.correo_electronico || 'N/A',
      sector: inm.clasificacion || (conv.numero?.startsWith('DEC-') ? 'CONDOMINIO / COMERCIAL' : 'GENERAL'),
      codigoInmueble: inm.cod_cont || inm.inmueble || 'N/A',
      capitalOriginal: rawMonto * 2,
      rebajaCapital: rawMonto,
      montoTotalBs: rawMonto,
      cuotas: conv.cuotas === 'N/A' ? 1 : (parseInt(String(conv.cuotas)) || 1),
      frecuencia: conv.frecuencia || 'Mensual',
      inicio: conv.inicio || new Date().toISOString().slice(0, 10),
      estado: conv.estado || 'Al Día',
      tipoPago: conv.cuotas === '1' || conv.cuotas === 1 ? 'contado' : 'fraccionado',
      operador: getLoggedUser()
    });
  };

  const handleProcesarConvenio = async () => {
    if (!selectedInmueble || !evaluacionResult || !evaluacionResult.eligible) return;

    const sectorCalculado = (() => {
      const name = (selectedInmueble.contribuyente || '').toUpperCase();
      const cls = (selectedInmueble.clasificacion || '').toUpperCase();
      if (name.includes('CONDOMINIO') || name.includes('RESIDENCIAS') || name.includes('CONJUNTO') || cls.includes('TIPO C')) return 'CONDOMINIO';
      if (cls.includes('RESIDENCIAL')) return 'RESIDENCIAL';
      if (cls.includes('INFORMAL') || cls.includes('AMBULANTE')) return 'INFORMAL';
      return 'COMERCIAL';
    })();

    const montoTotal = evaluacionResult.detalles.montoTotalPagarBs;
    const currentUser = getLoggedUser();

    setProcesando(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/decretos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'procesar',
          inmueble_id: selectedInmueble.id,
          identidad: selectedInmueble.identidad,
          sector: sectorCalculado,
          tipoPago,
          pagoInicial,
          pago_inicial: pagoInicial,
          cuotas: tipoPago === 'contado' ? 1 : cuotas,
          usuario: currentUser,
          registrarPago,
          datosPago: registrarPago ? {
            monto: montoPago || (tipoPago === 'contado' ? montoTotal : pagoInicial),
            metodo: metodoPago,
            banco: bancoPago,
            referencia: referenciaPago,
            fecha: fechaPago
          } : null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el convenio');
      }

      let mensaje = `• Nro. de Convenio: ${data.convenio?.numero || 'Generado'}\n` +
        `• Contribuyente: ${selectedInmueble.contribuyente}\n` +
        `• Decreto: ${evaluacionResult.decreto}\n` +
        `• Monto Total Reliquidado: ${montoTotal.toLocaleString("es-VE", {minimumFractionDigits:2, maximumFractionDigits:2})} Bs\n` +
        `• Modalidad: ${tipoPago === 'contado' ? 'Pago de Contado' : `${cuotas} Cuota(s) Fraccionada(s)`}\n` +
        `• Aplicado por: ${currentUser}\n`;

      if (registrarPago) {
        mensaje += `\n💳 PAGO REGISTRADO:\n` +
          `• Monto: ${parseFloat(String(montoPago || (tipoPago === 'contado' ? montoTotal : pagoInicial))).toLocaleString("es-VE", {minimumFractionDigits:2, maximumFractionDigits:2})} Bs\n` +
          `• Método: ${metodoPago}\n` +
          `• Referencia: ${referenciaPago || 'Generada'}\n` +
          `• Estado del Pago: ${['Debito', 'Punto de Venta / Débito', 'Efectivo'].includes(metodoPago) ? 'Aprobado en Caja' : 'Por Verificar'}\n`;
      }

      mensaje += `\nLas facturas del período han sido refinanciadas exitosamente.`;

      setProcesadoExito(mensaje);
      setUltimoConvenioProcesado({
        numero: data.convenio?.numero || ('DEC-' + Date.now().toString().slice(-6)),
        contribuyente: selectedInmueble.contribuyente,
        identidad: selectedInmueble.identidad,
        direccion: selectedInmueble.direccion,
        telefono: selectedInmueble.telefono,
        correo: selectedInmueble.correo_electronico,
        sector: selectedInmueble.clasificacion,
        codigoInmueble: selectedInmueble.cod_cont || selectedInmueble.inmueble,
        capitalOriginal: evaluacionResult?.detalles?.capitalOriginal || (montoTotal * 2),
        rebajaCapital: evaluacionResult?.detalles?.rebajaCapital || montoTotal,
        montoTotalBs: montoTotal,
        cuotas: tipoPago === 'contado' ? 1 : cuotas,
        frecuencia: tipoPago === 'contado' ? 'Única' : 'Mensual',
        inicio: new Date().toISOString().slice(0, 10),
        estado: 'Al Día',
        tipoPago,
        operador: currentUser
      });
      fetchDecretosActivos();

      // Actualizar estado local
      setInmuebles(prev => prev.map(item => 
        (item.id === selectedInmueble.id || item.identidad === selectedInmueble.identidad)
          ? { ...item, convenio_activo: true, decreto_activo: true }
          : item
      ));

      if (searchTerm) {
        searchInmuebles();
      }
      await fetchDecretosActivos();
      fetchDecretosActivos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error desconocido al procesar el convenio');
    } finally {
      setProcesando(false);
    }
  };

  const handleAnularConvenio = async (inmueble: any) => {
    const confirmMsg = `¿Está seguro de ANULAR el convenio/decreto para "${inmueble.contribuyente}"?\n\n` +
      `• Las facturas refinanciadas volverán a estado "Pendiente".\n` +
      `• El decreto se eliminará para permitir una nueva reliquidación.`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/decretos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'anular',
          inmueble_id: inmueble.id,
          identidad: inmueble.identidad,
          usuario: getLoggedUser()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al anular el convenio');
      }

      alert('✅ ' + data.mensaje);

      setInmuebles(prev => prev.map(item => 
        (item.id === inmueble.id || item.identidad === inmueble.identidad)
          ? { ...item, convenio_activo: false, decreto_activo: false }
          : item
      ));

      if (searchTerm) {
        searchInmuebles();
      }
    } catch (e: any) {
      alert('Error anulando convenio: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedInmueble(null);
    setEvaluacionResult(null);
    setErrorMsg('');
    setProcesadoExito(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="bg-emerald-100 p-3 rounded-lg">
          <FileCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Decretos y Convenios</h1>
          <p className="text-sm text-slate-500">Activación de beneficios, reliquidación y gestión de acuerdos 2026</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por Nombre o RIF/Cédula..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchInmuebles()}
            />
          </div>
          <button 
            onClick={searchInmuebles}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3 border-b">RIF / Cédula</th>
                <th className="px-6 py-3 border-b">Contribuyente</th>
                <th className="px-6 py-3 border-b">Clasificación / Estado</th>
                <th className="px-6 py-3 border-b text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {inmuebles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No se encontraron resultados. Ingrese un RIF o nombre para buscar.
                  </td>
                </tr>
              ) : (
                inmuebles.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{c.identidad}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{c.contribuyente}</td>
                    <td className="px-6 py-4 capitalize">
                      <div className="flex items-center gap-2">
                        <span>{c.clasificacion || 'COMERCIAL'}</span>
                        {c.decreto_activo && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                            Decreto Activo
                          </span>
                        )}
                        {!c.decreto_activo && c.convenio_activo && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                            Convenio Activo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEvaluador(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          Evaluar Decreto
                        </button>
                        {(c.decreto_activo || c.convenio_activo) && (
                          <button
                            onClick={() => {
                              const match = decretosActivos.find((d: any) => 
                                (d.identidad || '').replace(/[-.\s]/g, '').toUpperCase() === (c.identidad || '').replace(/[-.\s]/g, '').toUpperCase()
                              );
                              if (match) {
                                handleDescargarPlanilla(match);
                              } else {
                                handleDescargarPlanilla({
                                  numero: 'DEC-ACTIVO',
                                  contribuyente: c.contribuyente,
                                  identidad: c.identidad,
                                  inmuebleInfo: c,
                                  monto_total: c.deuda_congelada_bs || '0',
                                  cuotas: 1
                                });
                              }
                            }}
                            title="Descargar Planilla Oficial en PDF"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Planilla PDF
                          </button>
                        )}
                        {(c.decreto_activo || c.convenio_activo) && (
                          <button
                            onClick={() => handleAnularConvenio(c)}
                            title="Anular decreto y restaurar facturas a estado Pendiente"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-200"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Anular
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Evaluación */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-800">Evaluación de Convenio</h2>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {procesadoExito ? (
                <div className="py-8 px-4 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">¡Convenio Procesado con Éxito!</h3>
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-lg text-left text-sm whitespace-pre-line max-w-lg mx-auto font-mono">
                    {procesadoExito}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => {
                        const targetId = selectedInmueble?.cod_cont || selectedInmueble?.identidad || '';
                        closeModal();
                        if (targetId) {
                          router.push('/admin/caja?doc=' + encodeURIComponent(targetId));
                        } else {
                          router.push('/admin/caja');
                        }
                      }}
                      className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Ir a Caja a Pagar / Pago Múltiple
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-2.5 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors shadow-sm"
                    >
                      Aceptar y Cerrar
                    </button>
                  </div>
                </div>
              ) : evaluacionLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                  <p className="text-slate-500">Consultando facturas y calculando reliquidación...</p>
                </div>
              ) : errorMsg ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3">
                  <XCircle className="w-5 h-5 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Error al evaluar</h3>
                    <p className="text-sm">{errorMsg}</p>
                  </div>
                </div>
              ) : evaluacionResult && !evaluacionResult.eligible ? (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Contribuyente NO Elegible</h3>
                  <p className="text-sm">{evaluacionResult.mensaje}</p>
                  {evaluacionResult.mesesMorosidad !== undefined && (
                    <p className="text-sm font-medium mt-2">Meses de morosidad detectados: {evaluacionResult.mesesMorosidad}</p>
                  )}
                </div>
              ) : evaluacionResult && evaluacionResult.detalles ? (
                <div className="space-y-6">
                  {/* Info Aprobada */}
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Elegible para {evaluacionResult.decreto}
                    </div>
                    <p className="text-sm text-emerald-600">{evaluacionResult.mensaje}</p>
                  </div>

                  {/* Resumen Deuda Original vs Reliquidada */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 bg-slate-50">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">Deuda Original Acumulada</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Capital:</span>
                          <span className="font-medium text-slate-700">{evaluacionResult.detalles.capitalOriginal.toFixed(2)} Bs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Mora/Multas:</span>
                          <span className="font-medium text-slate-700">{evaluacionResult.detalles.accesoriosOriginal.toFixed(2)} Bs</span>
                        </div>
                        <div className="pt-2 mt-2 border-t flex justify-between font-bold">
                          <span className="text-slate-700">Total Original:</span>
                          <span className="text-slate-900">{(evaluacionResult.detalles.capitalOriginal + evaluacionResult.detalles.accesoriosOriginal).toFixed(2)} Bs</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-indigo-50 border-indigo-100">
                      <h4 className="text-xs font-semibold text-indigo-400 uppercase mb-3">Saldo Reliquidado (Decreto)</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-indigo-600">Nuevo Capital:</span>
                          <span className="font-medium text-indigo-900">{evaluacionResult.detalles.nuevoCapitalPagar.toFixed(2)} Bs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-indigo-600">Nuevos Accesorios:</span>
                          <span className="font-medium text-indigo-900">{evaluacionResult.detalles.nuevosAccesoriosPagar.toFixed(2)} Bs</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-indigo-200 flex justify-between font-bold text-lg">
                          <span className="text-indigo-700 font-bold">Nuevo Saldo a Financiar (Expresado en Bs.):</span>
                          <span className="text-indigo-900 font-bold text-xl">{evaluacionResult.detalles.montoTotalPagarBs.toLocaleString("es-VE", {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulador de Convenio */}
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-700">Opciones de Pago del Convenio</h3>
                      <div className="flex bg-slate-100 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTipoPago('fraccionado');
                            const minPorcentaje = evaluacionResult.detalles.porcentaje_inicial_minimo / 100;
                            const initAmount = evaluacionResult.detalles.montoTotalPagarBs * minPorcentaje;
                            setPagoInicial(initAmount);
                            setMontoPago(initAmount.toFixed(2));
                          }}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${tipoPago === 'fraccionado' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Fraccionado
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTipoPago('contado');
                            setPagoInicial(evaluacionResult.detalles.montoTotalPagarBs);
                            setMontoPago(evaluacionResult.detalles.montoTotalPagarBs.toFixed(2));
                          }}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${tipoPago === 'contado' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Pago de Contado
                        </button>
                      </div>
                    </div>
                    
                    {tipoPago === 'fraccionado' ? (
                      <>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                              Pago Inicial (Bs)
                            </label>
                            <input 
                              type="number"
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
                              value={pagoInicial}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setPagoInicial(val);
                                setMontoPago(val.toFixed(2));
                              }}
                              min={evaluacionResult.detalles.montoTotalPagarBs * (evaluacionResult.detalles.porcentaje_inicial_minimo / 100)}
                              max={evaluacionResult.detalles.montoTotalPagarBs}
                              step="0.01"
                            />
                            <p className="text-xs text-slate-400 mt-1">Mínimo requerido: {evaluacionResult.detalles.porcentaje_inicial_minimo}%</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                              Número de Cuotas
                            </label>
                            <select 
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
                              value={cuotas}
                              onChange={(e) => setCuotas(Number(e.target.value))}
                            >
                              {Array.from({length: evaluacionResult.detalles.max_cuotas}, (_, i) => i + 1).map(num => (
                                <option key={num} value={num}>{num} {num === 1 ? 'Cuota' : 'Cuotas'}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Resumen Final de Cuota */}
                        <div className="mt-4 p-3 bg-slate-100 rounded text-center">
                          <p className="text-sm text-slate-500">Monto de cada cuota fraccionada restante</p>
                          <p className="text-2xl font-bold text-slate-800 mt-1">
                            {((evaluacionResult.detalles.montoTotalPagarBs - pagoInicial) / cuotas).toLocaleString("es-VE", {minimumFractionDigits:2, maximumFractionDigits:2})} Bs
                          </p>
                          <p className="text-xs text-slate-400 mt-1">Vencimiento: 1ros 5 días de cada mes</p>
                        </div>
                      </>
                    ) : (
                      <div className="mt-2 p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                        <p className="text-sm text-emerald-600 mb-1">Monto Único a Pagar Hoy</p>
                        <p className="text-3xl font-black text-emerald-800">
                          {evaluacionResult.detalles.montoTotalPagarBs.toLocaleString("es-VE", {minimumFractionDigits:2, maximumFractionDigits:2})} Bs
                        </p>
                        <p className="text-xs text-emerald-600 mt-2">No se generarán cuotas futuras. El convenio se liquida de inmediato.</p>
                      </div>
                    )}
                  </div>

                  {/* SECCION: REPORTAR PAGO DEL CONVENIO */}
                  <div className="border border-emerald-200 bg-emerald-50/40 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-bold text-slate-800">Reportar Pago del Convenio</h4>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                        <input 
                          type="checkbox"
                          checked={registrarPago}
                          onChange={(e) => setRegistrarPago(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        Registrar pago ahora
                      </label>
                    </div>

                    {registrarPago && (
                      <div className="space-y-3 pt-2 border-t border-emerald-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Monto a Pagar (Bs)
                            </label>
                            <input 
                              type="number"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                              value={montoPago}
                              onChange={(e) => setMontoPago(e.target.value)}
                              step="0.01"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                              {tipoPago === 'contado' ? 'Monto total de contado' : 'Monto del pago inicial'}
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Forma / Método de Pago
                            </label>
                            <select 
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                              value={metodoPago}
                              onChange={(e) => setMetodoPago(e.target.value)}
                            >
                              <option value="Punto de Venta / Débito">Punto de Venta / Débito (Aprobación inmediata)</option>
                              <option value="Transferencia Bancaria">Transferencia Bancaria (Por Verificar)</option>
                              <option value="Pago Móvil">Pago Móvil (Por Verificar)</option>
                              <option value="Efectivo">Efectivo (Caja)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Banco
                            </label>
                            <select 
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500"
                              value={bancoPago}
                              onChange={(e) => setBancoPago(e.target.value)}
                            >
                              {bancosVenezuela.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Nro. de Referencia
                            </label>
                            <input 
                              type="text"
                              placeholder="Ej: 123456"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500"
                              value={referenciaPago}
                              onChange={(e) => setReferenciaPago(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Fecha de Pago
                            </label>
                            <input 
                              type="date"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500"
                              value={fechaPago}
                              onChange={(e) => setFechaPago(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operador responsable */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Operador que aplicará este convenio: <b>{getLoggedUser()}</b></span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Acciones */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={closeModal}
                className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              {evaluacionResult && evaluacionResult.eligible && !procesadoExito && (
                <button 
                  onClick={handleProcesarConvenio}
                  disabled={procesando}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {procesando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : registrarPago ? (
                    'Procesar Convenio y Registrar Pago'
                  ) : (
                    'Procesar Convenio'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    
      {/* SECCION: LISTADO DE DECRETOS Y CONVENIOS ACTIVOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-lg">Listado de Decretos y Convenios Activos</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {decretosActivos.length} Registrados
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar convenios activos..."
                value={filterDecretos}
                onChange={(e) => setFilterDecretos(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
              />
            </div>
            <button
              onClick={fetchDecretosActivos}
              disabled={loadingDecretos}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              title="Recargar lista"
            >
              <RotateCcw className={`w-4 h-4 ${loadingDecretos ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b">
              <tr>
                <th className="px-4 py-3">N° Convenio</th>
                <th className="px-4 py-3">RIF / Cédula</th>
                <th className="px-4 py-3">Contribuyente</th>
                <th className="px-4 py-3">Monto Total</th>
                <th className="px-4 py-3">Cuotas / Mod.</th>
                <th className="px-4 py-3">Fecha Inicio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center">Planilla & Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loadingDecretos ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Cargando listado de convenios y decretos activos...
                  </td>
                </tr>
              ) : decretosActivos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No se han registrado convenios o decretos todavía.
                  </td>
                </tr>
              ) : (
                decretosActivos
                  .filter((conv: any) => {
                    if (!filterDecretos) return true;
                    const q = filterDecretos.toLowerCase();
                    return (
                      (conv.numero || '').toLowerCase().includes(q) ||
                      (conv.contribuyente || '').toLowerCase().includes(q) ||
                      (conv.identidad || '').toLowerCase().includes(q)
                    );
                  })
                  .map((conv: any) => (
                    <tr key={conv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px]">
                          {conv.numero}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{conv.identidad}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{conv.contribuyente}</td>
                      <td className="px-4 py-3 font-black text-emerald-700">
                        {conv.monto_total}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {conv.cuotas === '1' || conv.cuotas === 1 ? 'Contado (1)' : `${conv.cuotas} (${conv.frecuencia || 'Mensual'})`}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{conv.inicio}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {conv.estado || 'Al Día'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDescargarPlanilla(conv)}
                            title="Descargar Planilla Oficial de Convenio en PDF"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Planilla
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerReciboConvenio(conv)}
                            title="Ver o Imprimir Recibo Oficial de Pago"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Recibo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnularConvenio({
                              id: conv.inmuebleInfo?.id || null,
                              identidad: conv.identidad,
                              contribuyente: conv.contribuyente
                            })}
                            title="Anular Convenio y restaurar facturas"
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border border-red-200"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Anular
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* MODAL RECIBO OFICIAL DE CONVENIO */}
      {reciboModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">Comprobante Oficial de Pago — Convenio N° {reciboModalData.reciboNo}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setReciboModalData(null)}
                  className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              <div id="recibo-decreto-print-area">
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * { visibility: hidden; }
                    #recibo-decreto-print-area, #recibo-decreto-print-area * { visibility: visible; }
                    #recibo-decreto-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                  }
                `}} />
                <ReciboImprimible data={reciboModalData} />
              </div>
            </div>
          </div>
        </div>
      )}

</div>
  );
}
