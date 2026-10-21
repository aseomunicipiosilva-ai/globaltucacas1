'use client';
import { useState, useEffect, useMemo } from 'react';
import { Download, FileText, Building, Handshake, AlertCircle, CheckCircle2, Wrench, ClipboardCheck, ShieldCheck, FlaskConical, Calendar, Filter, X } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import { formatBs } from '@/lib/formatCurrency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logos } from '@/lib/logosBase64';
import { exportToExcelWithLogos } from '@/lib/excelExport';

const TIPO_ICON: Record<string, any> = {
  especial: Wrench, extraordinario: FlaskConical, inspeccion: ClipboardCheck, visto_bueno: ShieldCheck
};
const TIPO_LABEL: Record<string, string> = {
  especial: 'Servicio Especial', extraordinario: 'Serv. Extraordinario', inspeccion: 'Inspección', visto_bueno: 'Visto Bueno'
};


const MESES_LISTA = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

const getFacturaYearMonth = (f: any): { year: number; month: number } => {
  if (f.emision) {
    const parts = f.emision.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        return { year: y, month: m };
      }
    }
  }
  if (f.referencia) {
    const parts = f.referencia.split('-');
    if (parts.length >= 5) {
      const m = parseInt(parts[parts.length - 2], 10);
      const y = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        return { year: y, month: m };
      }
    }
  }
  return { year: new Date().getFullYear(), month: 1 };
};

const formatPeriodoLabel = (desdeM: number, hastaM: number, anio: number, modo: 'todos' | 'rango') => {
  if (modo === 'todos') return 'HISTÓRICO ACUMULADO (TODOS LOS PERÍODOS)';
  if (desdeM === hastaM) return `${MESES_LISTA[desdeM - 1]} ${anio}`;
  return `${MESES_LISTA[desdeM - 1]} A ${MESES_LISTA[hastaM - 1]} ${anio}`;
};

export default function EstadoCuentaPage() {
  const { inmuebles, recibos, contribuyentes, tcmmv } = useAppContext();
  const [portalDoc, setPortalDoc] = useState('');
  const [modalPeriodoOpen, setModalPeriodoOpen] = useState(false);
  const [periodoModo, setPeriodoModo] = useState<'rango' | 'todos'>('rango');
  const [periodoAnio, setPeriodoAnio] = useState<number>(new Date().getFullYear());
  const [periodoDesdeMes, setPeriodoDesdeMes] = useState<number>(1); // Enero
  const [periodoHastaMes, setPeriodoHastaMes] = useState<number>(9); // Septiembre
  const tasaBcv = tcmmv || 0;
  const [cuotasData, setCuotasData] = useState<any[]>([]);
  const [serviciosEsp, setServiciosEsp] = useState<any[]>([]);
  const [pagosPorVerificar, setPagosPorVerificar] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fullDoc = localStorage.getItem('portal_doc') || '';
    setPortalDoc(fullDoc);

    const fetchAll = async () => {
      try {
        if (fullDoc) {
          const idLimpio = fullDoc.replace(/-/g, '').toUpperCase();
          const idFmt = idLimpio.charAt(0) + '-' + idLimpio.slice(1);
          const soloNum = fullDoc.replace(/D/g, '');

          // Convenios
          const { data: convenios } = await supabase.from('convenios').select('*')
            .or('identidad.eq.' + idFmt + ',identidad.eq.' + idLimpio + ',identidad.eq.' + fullDoc.toUpperCase() + ',identidad.eq.' + soloNum)
            .in('estado', ['Al Día', 'Activo']);
          if (convenios) {
            const hoy = new Date().toISOString().split('T')[0];
            const cuotas: any[] = [];
            for (const conv of convenios) {
              let parsed: any[] = [];
              try { parsed = JSON.parse(conv.detalle_cuotas || '[]'); } catch {}
              parsed.forEach((c: any) => {
                if (c.estado === 'Pendiente') {
                  cuotas.push({ conv: conv.numero, cuota: c.id + 1, fecha: c.fecha, vencida: c.fecha <= hoy, monto: parseFloat(c.monto) || 0 });
                }
              });
            }
            setCuotasData(cuotas);
          }

          // Servicios Especiales pendientes
          // Servicios Especiales (Todos para poder mostrar el historial también)
          const { data: servs } = await supabase.from('servicios_especiales').select('*')
            .or('identidad.eq.' + idFmt + ',identidad.eq.' + idLimpio + ',identidad.eq.' + fullDoc.toUpperCase() + ',identidad.eq.' + soloNum);
          setServiciosEsp(servs || []);

          // Pagos Por Verificar: mostrar al usuario que su pago está en proceso
          const { data: pagosVerif } = await supabase.from('pagos_reportados')
            .select('referencia, monto, detalles, created_at')
            .or('identidad.eq.' + idFmt + ',identidad.eq.' + idLimpio + ',identidad.eq.' + fullDoc.toUpperCase() + ',identidad.eq.' + soloNum)
            .eq('estado', 'Por Verificar')
            .order('created_at', { ascending: false });
          setPagosPorVerificar(pagosVerif || []);
        }
      } catch (e) { console.error(e); }
      setIsLoading(false);
    };
    fetchAll();
  }, []);

  // Filtrar inmuebles del usuario
  const docNorm = portalDoc.replace(/-/g, '').toUpperCase();
  const docFmt = docNorm ? docNorm.charAt(0) + '-' + docNorm.slice(1) : '';
  const soloNum = portalDoc.replace(/D/g, '');

  const misInmuebles = useMemo(() => inmuebles.filter((inm: any) => {
    const id = (inm.identidad || '').replace(/-/g, '').toUpperCase();
    const idFmt2 = id.charAt(0) + '-' + id.slice(1);
    return portalDoc && (id === docNorm || idFmt2 === docFmt || id === portalDoc.toUpperCase() || id === soloNum);
  }), [inmuebles, portalDoc, docNorm, docFmt, soloNum]);


  const getReciboMonto = (r: any) => {
    if (r.estado === 'Abonado') return String(parseFloat(String(r.monto || '0').replace(/[^\d.]/g, '')) || 0);
    if (tasaBcv <= 0) return String(parseFloat(String(r.monto || '0').replace(/[^\d.]/g, '')) || 0);

    let baseMonto = parseFloat(String(r.monto || '0').replace(/[^\d.]/g, '')) || 0;

    // CM-
    if (r.referencia?.startsWith('CM-')) {
      let monthlyMMV = 0;
      const matchedInmueble = misInmuebles.find((inm: any) => inm.inmueble && r.referencia.includes(inm.inmueble));
      
      if (matchedInmueble) {
        const cant = parseFloat(matchedInmueble.cant_inmuebles || 1);
        const mmv  = parseFloat(matchedInmueble.mmv_mes || 0);
        if (mmv > 0) monthlyMMV = cant * mmv;
      } else {
        misInmuebles.forEach((inm: any) => {
          const cant = parseFloat(inm.cant_inmuebles || 1);
          const mmv  = parseFloat(inm.mmv_mes || 0);
          if (mmv > 0) monthlyMMV += cant * mmv;
        });
      }
      if (monthlyMMV > 0) baseMonto = monthlyMMV * tasaBcv;
    }

    // AHORA restamos los pagos pendientes
    let montoPendiente = 0;
    pagosPorVerificar.forEach((p) => {
      let det = {};
      try { det = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch (e) {}
      const refs = (det as any).recibos || [];
      if (refs.includes(r.referencia)) {
        const montoPago = parseFloat(String(p.monto || '0').replace(/[^0-9.]/g, '')) || 0;
        if (refs.length > 0) montoPendiente += (montoPago / refs.length);
      }
    });

    return String(Math.max(0, baseMonto - montoPendiente).toFixed(2));
  };

  // Filtrar recibos del usuario
  const misFact = useMemo(() => recibos.filter((f: any) => {
    const ident = (f.identidad || '').replace(/-/g, '').toUpperCase();
    const cont = (f.contribuyente || '').replace(/-/g, '').toUpperCase();
    return portalDoc && (
      ident === docNorm || ident.includes(soloNum) || 
      cont === docNorm || cont.includes(soloNum)
    );
  }), [recibos, portalDoc, docNorm, soloNum]);

  const pendientes = misFact.filter((f: any) => f.estado === 'Pendiente' || f.estado === 'Abonado' || f.estado === 'Por Verificar').sort((a,b) => (a.emision || '').localeCompare(b.emision || ''));
  const pagadas = misFact.filter((f: any) => f.estado === 'Pagada' || f.estado === 'Pagado').sort((a,b) => (b.emision || '').localeCompare(a.emision || '')).slice(0, 10);

  // Calculos
  const totalMensual = misInmuebles.reduce((acc: number, inm: any) => {
    const factor = parseFloat(inm.mmv_mes) || 0;
    const cant = parseInt(inm.cant_inmuebles) || 1;
    return acc + factor * cant * tasaBcv;
  }, 0);

  const totalPendBs = pendientes.reduce((acc: number, f: any) => {
    const m = parseFloat(getReciboMonto(f)) || 0;
    return acc + m;
  }, 0);

  const cuotasVencidas = cuotasData.filter(c => c.vencida);
  const totalCuotas = cuotasVencidas.reduce((a, c) => a + c.monto, 0);

  const serviciosPendientes = serviciosEsp.filter(s => s.estado !== 'Pagado');
  const totalServiciosBs = serviciosPendientes.reduce((a: number, s: any) => a + (parseFloat(s.monto) || 0), 0);

  const deudaTotalEstimada = totalPendBs + totalCuotas + totalServiciosBs;

  const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const mesLabel = (d?: string) => {
    if (!d) return '';
    const p = d.split('-');
    if (p.length >= 2) return MESES[parseInt(p[1]) - 1] + ' ' + p[0];
    return d;
  };


  const handleDownloadPDF = (filtro?: { desdeMes: number; hastaMes: number; anio: number; modo: 'todos' | 'rango' }) => {
    if (!portalDoc) return;
    const docNorm = portalDoc.replace(/-/g, '').toUpperCase();
    const myContribuyente = contribuyentes?.find((c: any) => (c.Identidad || '').replace(/-/g, '').toUpperCase() === docNorm);

    const modo = filtro?.modo || periodoModo;
    const desdeMes = filtro?.desdeMes ?? periodoDesdeMes;
    const hastaMes = filtro?.hastaMes ?? periodoHastaMes;
    const anio = filtro?.anio ?? periodoAnio;
    const periodoTexto = formatPeriodoLabel(desdeMes, hastaMes, anio, modo);

    const viewData = {
      Contribuyente: myContribuyente?.Contribuyente || '',
      Identidad: portalDoc,
      Telefono: myContribuyente?.Telefono || '',
      Direccion: myContribuyente?.Direccion || ''
    };

    // === Generate one PDF per inmueble ===
    const inmsToProcess = misInmuebles.length > 0 ? misInmuebles : [{ inmueble: 'Principal', tipo: 'Residencial', cant_inmuebles: 1 }];

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let pageAdded = false;

    inmsToProcess.forEach((inm: any, idx: number) => {
      if (pageAdded) doc.addPage();
      pageAdded = true;
      const today = new Date();
      const tasaVigente = today.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const docNro = Math.floor(10000 + Math.random() * 90000);

      // ── LOGOS ──
      try { doc.addImage(logos.isma, 'JPEG', 14, 8, 38, 20); } catch(e) {}

      // ── TITLE ──
      doc.setFontSize(19);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADO DE CUENTA', 105, 15, { align: 'center' });

      // ── PERÍODO DESTACADO ──
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`PERÍODO: ${periodoTexto}`, 105, 21, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 38, 38);
      doc.text(`TASA VIGENTE HASTA: ${tasaVigente}`, 105, 26, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // ── HORIZONTAL LINE ──
      doc.setLineWidth(0.3);
      doc.line(14, 30, 196, 30);

      // ── GENERATED BY + NUMBER ──
      const cajeroGuardado = typeof window !== 'undefined' ? localStorage.getItem('portal_user') || viewData.Contribuyente : viewData.Contribuyente;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generado por: ${cajeroGuardado}`, 14, 38);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nro.: ${docNro}`, 196, 38, { align: 'right' });

      // ── LINE ──
      doc.line(14, 41, 196, 41);

      // ── INMUEBLE INFO ROW ──
      const uso = inm.clasificacion || inm.tipo || 'Residencial';
      const area = inm.area ? `${inm.area} Mt2` : '—';
      const codInm = inm.inmueble || 'Principal';

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Código:', 14, 47);
      doc.setFont('helvetica', 'bold');
      doc.text(codInm, 30, 47);
      doc.setFont('helvetica', 'normal');
      doc.text('Uso:', 65, 47);
      doc.setFont('helvetica', 'bold');
      doc.text(uso, 76, 47);
      doc.setFont('helvetica', 'normal');
      doc.text('Área Operativa:', 115, 47);
      doc.setFont('helvetica', 'bold');
      doc.text(area, 142, 47);
      doc.setFont('helvetica', 'normal');
      doc.text('Identidad:', 162, 47);
      doc.setFont('helvetica', 'bold');
      doc.text(viewData.Identidad, 179, 47);

      // ── NOMBRE/RAZÓN SOCIAL ──
      doc.setFont('helvetica', 'normal');
      doc.text('Nombre o Razón Social:', 14, 54);
      doc.setFont('helvetica', 'bold');
      doc.text(viewData.Contribuyente, 60, 54);

      // ── DIRECCIÓN INMUEBLE ──
      doc.setFont('helvetica', 'normal');
      const dirInm = inm.direccion || viewData.Direccion || '';
      const splitDir = doc.splitTextToSize(`Dirección Inmueble: ${dirInm}`, 182);
      doc.text(splitDir, 14, 60);

      let y = 60 + splitDir.length * 5 + 5;

      // ── LINE ──
      doc.line(14, y, 196, y);
      y += 6;

      // ── ESTADO DE CUENTA RESUMIDO ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ESTADO DE CUENTA RESUMIDO', 105, y, { align: 'center' });
      y += 2;
      doc.line(14, y, 196, y);
      y += 6;

      // Get recibos for this specific inmueble
      let inmRecibos = pendientes.filter((f: any) => {
        if (!f.referencia) return true;
        if (f.referencia.startsWith('CM-')) {
          const match = f.referencia.match(/(I-\d+|C-\d+)/);
          if (match) {
            const refId = match[0];
            return inm.inmueble === refId || inm.cod_cont === refId || (inm as any).Inmueble === refId;
          }
        }
        return true;
      });

      // Filtrar por período seleccionado si modo es rango
      if (modo === 'rango') {
        inmRecibos = inmRecibos.filter((f: any) => {
          const ym = getFacturaYearMonth(f);
          const fKey = ym.year * 100 + ym.month;
          const startKey = anio * 100 + desdeMes;
          const endKey = anio * 100 + hastaMes;
          return fKey >= startKey && fKey <= endKey;
        });
      }

      const calcMonto = (f: any): number => {
        if (f.estado === 'Abonado') return parseFloat(String(f.monto || '0').replace(/[^\d.]/g, '')) || 0;
        if (f.referencia?.startsWith('CM-') && tasaBcv && tasaBcv > 0) {
          const cant = parseFloat(inm.cant_inmuebles || 1);
          const mmv = parseFloat(inm.mmv_mes || 0);
          if (mmv > 0) return parseFloat((cant * mmv * tasaBcv).toFixed(2));
        }
        return parseFloat(String(f.monto || '0').replace(/[^\d.]/g, '')) || 0;
      };

      let totalInm = inmRecibos.reduce((s: number, f: any) => s + calcMonto(f), 0);
      if (idx === 0) totalInm += totalServiciosBs;

      const mesesArr = [...new Set(inmRecibos.map((f: any) => mesLabel(f.emision).toUpperCase()))];
      const periodosLabel = mesesArr.join(', ') || '—';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const baseAseo = inmRecibos.reduce((s: number, f: any) => s + calcMonto(f), 0);
      const resumenRows = [
        ['Período Liquidado:', periodoTexto],
        [`Períodos Calculados (${inmRecibos.length}):`, periodosLabel],
        ['Monto Recolección Aseo Urbano Bs.', `Bs. ${baseAseo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ];
      if (idx === 0 && totalServiciosBs > 0) {
        resumenRows.push(['Monto Servicios Especiales Bs.', `Bs. ${totalServiciosBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
      }
      resumenRows.push(
        ['Total Exento Bs.', `Bs. ${totalInm.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Base Imponible Bs.', 'Bs. 0,00'],
        ['IVA (16.00%) Bs.', 'Bs. 0,00'],
        ['Saldo a Favor Bs.', `Bs. ${parseFloat(inm.saldo_favor_bs || myContribuyente?.SaldoFavor || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`],
        ['Saldo a Favor Bs.', `Bs. ${parseFloat(inm.saldo_favor_bs || myContribuyente?.SaldoFavor || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`],
        ['Total estado de cuenta Bs.', `Bs. ${totalInm.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      );

      resumenRows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal');
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'bold');
        doc.text(value, 196, y, { align: 'right' });
        y += 6;
      });

      // ── LINE ──
      doc.line(14, y, 196, y);
      y += 6;

      // ── TOTAL A PAGAR ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('TOTAL A PAGAR', 14, y);
      doc.text(`Bs. ${totalInm.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 196, y, { align: 'right' });
      y += 2;
      doc.line(14, y, 196, y);
      y += 8;

      // ── ESTADO DE CUENTA DETALLADO ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('ESTADO DE CUENTA DETALLADO', 105, y, { align: 'center' });
      y += 4;

      const detalleRows = inmRecibos.map((f: any) => {
        const monto = calcMonto(f);
        const det = (inm as any).actividad_principal ? `Aseo ${(inm as any).actividad_principal}` : `Aseo ${((inm as any).tipo || (inm as any).clasificacion || "residencial").toLowerCase()}`;
        const periodoDate = f.emision ? f.emision.replace(/-/g, '-') : '—';
        return [
          periodoDate,
          det,
          monto.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
          '0,00', '0,00', '0,00',
          monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })
        ];
      });

      if (idx === 0 && serviciosPendientes.length > 0) {
        serviciosPendientes.forEach(s => {
          const montoServicio = parseFloat(s.monto) || 0;
              let tripsDesc = '';
              if (s.tipo === 'extraordinario' && typeof tcmmv !== 'undefined' && tcmmv > 0) {
                const userInms = inmuebles.filter((i: any) => i.identidad === s.identidad);
                let totalMmv = 0;
                userInms.forEach((i: any) => { totalMmv += parseFloat(i.mmv_mes || 0); });
                if (totalMmv > 0) {
                  const trips = Math.round((montoServicio / tcmmv) / totalMmv);
                  if (trips > 0) tripsDesc = ` (${trips} viaje${trips > 1 ? 's' : ''})`;
                }
              }
              detalleRows.push([
                s.fecha ? s.fecha.replace(/-/g, '-') : '—',
                (TIPO_LABEL[s.tipo] || 'Serv. Especial') + ': ' + (s.descripcion || '') + tripsDesc,
            montoServicio.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            '0,00', '0,00', '0,00',
            montoServicio.toLocaleString('es-VE', { minimumFractionDigits: 2 })
          ]);
        });
      }

      try {
        autoTable(doc, {
          startY: y,
          head: [['PERIODO', 'DETALLE', 'RECOLECCIÓN', 'INT REC', 'MULTA', 'IVA', 'TOTAL BS']],
          body: detalleRows,
          theme: 'grid',
          headStyles: { fillColor: [255, 255, 255], textColor: [0,0,0], fontStyle: 'bold', lineColor: [0,0,0], lineWidth: 0.3, halign: 'center' },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 45 },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      } catch(e) {}

      // ── INFORMACIÓN DE PAGO ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('INFORMACIÓN PARA PAGOS Y TRANSFERENCIAS', 105, y, { align: 'center' });
      y += 5;
      doc.line(14, y, 196, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Banco:  BANESCO (0134)', 14, y);
      y += 5;
      doc.text('Cta:    01340415144151031715', 14, y);
      y += 7;
      doc.setFont('helvetica', 'italic');
      doc.text('Pagos a nombre de: INST SOC MUN PARA EL AMBIENTE R.I.F.: G-200076739', 14, y);

      const fileName = `Estado_Cuenta_${viewData.Identidad}_${codInm}_${Date.now()}.pdf`;
      doc.save(fileName);
    });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Cargando estado de cuenta...</div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16">
      
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Mi Estado de Cuenta</h1>
          <p className="text-slate-500 text-sm">Visualice su deuda actual y descargue su reporte detallado por período</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setModalPeriodoOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white px-5 py-3 rounded-xl text-sm font-black transition-all shadow-lg hover:shadow-red-500/30 active:scale-95"
          >
            <Calendar className="w-5 h-5" />
            REPORTE DETALLADO (POR PERÍODO)
          </button>
        </div>
      </div>

      {/* Selector de Período Activo */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período Seleccionado para Reporte</div>
            <div className="text-base font-black text-slate-800 flex items-center gap-2">
              <span>{periodoModo === 'todos' ? 'HISTÓRICO ACUMULADO (TODOS LOS PERÍODOS)' : `${MESES_LISTA[periodoDesdeMes - 1]} A ${MESES_LISTA[periodoHastaMes - 1]} ${periodoAnio}`}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                {periodoModo === 'todos' ? 'Histórico Completo' : 'Rango'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setModalPeriodoOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors border border-slate-300"
          >
            <Filter className="w-3.5 h-3.5" />
            Escoger Período
          </button>
          <button
            onClick={() => handleDownloadPDF()}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Resumen Financiero */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cuota Mensual</div>
          <div className="text-lg font-bold text-slate-800">Bs. {formatBs(totalMensual)}</div>
          <div className="text-[10px] text-slate-400 mt-1">tasa: {tasaBcv.toFixed(2)}</div>
        </div>
        <div className={"rounded-xl border p-4 text-center shadow-sm " + (pendientes.length > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200")}>
          <div className={"text-[10px] font-bold uppercase mb-1 " + (pendientes.length > 0 ? "text-red-400" : "text-emerald-400")}>Recibos Pend.</div>
          <div className={"text-lg font-bold " + (pendientes.length > 0 ? "text-red-700" : "text-emerald-700")}>{pendientes.length}</div>
          <div className={"text-[10px] mt-1 " + (pendientes.length > 0 ? "text-red-500" : "text-emerald-500")}>
            {pendientes.length > 0 ? "Bs. " + formatBs(totalPendBs) : "Al día ✓"}
          </div>
        </div>
        <div className={"rounded-xl border p-4 text-center shadow-sm " + (cuotasVencidas.length > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200")}>
          <div className={"text-[10px] font-bold uppercase mb-1 " + (cuotasVencidas.length > 0 ? "text-orange-400" : "text-slate-400")}>Cuotas Conv.</div>
          <div className={"text-lg font-bold " + (cuotasVencidas.length > 0 ? "text-orange-700" : "text-slate-700")}>{cuotasData.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">{cuotasVencidas.length} vencidas</div>
        </div>
        <div className={"rounded-xl border p-4 text-center shadow-sm " + (serviciosPendientes.length > 0 ? "bg-purple-50 border-purple-200" : "bg-white border-slate-200")}>
          <div className={"text-[10px] font-bold uppercase mb-1 " + (serviciosPendientes.length > 0 ? "text-purple-400" : "text-slate-400")}>Servicios Esp.</div>
          <div className={"text-lg font-bold " + (serviciosPendientes.length > 0 ? "text-purple-700" : "text-slate-700")}>{serviciosPendientes.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {serviciosPendientes.length > 0 ? "Bs. " + formatBs(totalServiciosBs) : "Sin pendientes"}
          </div>
        </div>
        <div className={"col-span-2 lg:col-span-1 rounded-xl border p-4 text-center shadow-sm " + (pagosPorVerificar.length > 0 ? "bg-amber-500 border-amber-600" : deudaTotalEstimada > 0 ? "bg-red-600 border-red-700" : "bg-emerald-600 border-emerald-700")}>
          <div className="text-[10px] font-bold text-white/80 uppercase mb-1">Deuda Total</div>
          {pagosPorVerificar.length > 0 ? (
            <>
              <div className="text-sm font-bold text-white">⏳ En Verificación</div>
              <div className="text-[10px] text-white/80 mt-1">{pagosPorVerificar.length} pago{pagosPorVerificar.length > 1 ? 's' : ''} por confirmar</div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-white">Bs. {formatBs(deudaTotalEstimada)}</div>
              <div className="text-[10px] text-white/60 mt-1">fact + cuotas + servs</div>
            </>
          )}
        </div>
      </div>

      {/* Mis Inmuebles */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-500" />
            <h2 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Mis Inmuebles Registrados</h2>
          </div>
          <button 
            onClick={() => {
              const rows: any[] = [];
              misInmuebles.forEach((inm: any) => {
                  const factor = parseFloat(inm.mmv_mes) || 0;
                  const cuotaBs = factor * tasaBcv;
                  const cant = parseInt(inm.cant_inmuebles) || 1;
                  if (cant > 1 && factor > 0) {
                      for (let j = 1; j <= cant; j++) {
                          rows.push({
                              'Código': `${inm.inmueble || inm.cod_cont || '-'} - Unidad ${j}`,
                              'Tipo': inm.tipo || 'N/A',
                              'Actividad': inm.actividad_principal || 'Residencial',
                              'Dirección': inm.direccion || 'Sin dirección',
                              'Factor': factor.toFixed(2),
                              'Cuota Mensual (Bs)': formatBs(cuotaBs)
                          });
                      }
                  } else {
                      rows.push({
                          'Código': inm.inmueble || inm.cod_cont || '-',
                          'Tipo': inm.tipo || 'N/A',
                          'Actividad': inm.actividad_principal || 'Residencial',
                          'Dirección': inm.direccion || 'Sin dirección',
                          'Factor': factor.toFixed(2),
                          'Cuota Mensual (Bs)': formatBs(cuotaBs)
                      });
                  }
              });
              exportToExcelWithLogos(rows, `Desglose_Inmuebles_${portalDoc}.xlsx`, 'Desglose Inmuebles');
            }}
            className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg shadow-sm transition-transform active:scale-95"
          >
            <Download className="w-3.5 h-3.5" /> Descargar Desglose
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Actividad</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3 text-center">Factor</th>
                <th className="px-4 py-3 text-right">Cuota Mensual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {misInmuebles.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No se encontraron inmuebles asociados a su cuenta.</td></tr>
              ) : (
                misInmuebles.map((inm: any, i: number) => {
                  const factor = parseFloat(inm.mmv_mes) || 0;
                  const cant = parseInt(inm.cant_inmuebles) || 1;
                  const cuotaBs = factor * cant * tasaBcv;
                  
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{inm.inmueble || inm.cod_cont || '-'} {cant > 1 ? `(${cant} Unds)` : ''}</td>
                      <td className="px-4 py-3">{inm.tipo || 'N/A'}</td>
                      <td className="px-4 py-3">{inm.actividad_principal || 'Residencial'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">{inm.direccion || 'Sin dirección'}</td>
                      <td className="px-4 py-3 text-center">{factor.toFixed(2)} {cant > 1 ? `x ${cant}` : ''}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">Bs. {formatBs(cuotaBs)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Servicios Especiales Pendientes */}
      {serviciosPendientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
          <div className="bg-purple-50 px-4 py-3 border-b border-purple-200 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-purple-700 uppercase text-sm tracking-wide">Servicios Especiales / Inspecciones Asignados</h3>
            <span className="ml-auto text-xs font-bold text-purple-600">Total: Bs. {formatBs(totalServiciosBs)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-purple-50/50 border-b border-purple-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviciosPendientes.map((s: any, i: number) => {
                  const Icon = TIPO_ICON[s.tipo] || Wrench;
                  const estadoColor = s.estado === 'Pendiente' ? 'bg-red-100 text-red-700' : s.estado === 'Por Verificar' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600';
                  return (
                    <tr key={i} className="hover:bg-purple-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-purple-600">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{TIPO_LABEL[s.tipo] || s.tipo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
          {s.descripcion}
          {s.tipo === 'extraordinario' && typeof tcmmv !== 'undefined' && tcmmv > 0 && inmuebles.filter((i:any)=>i.identidad===s.identidad).reduce((acc:any,i:any)=>acc+parseFloat(i.mmv_mes||0),0) > 0 && (
            ` (${Math.round((parseFloat(s.monto||0) / tcmmv) / inmuebles.filter((i:any)=>i.identidad===s.identidad).reduce((acc:any,i:any)=>acc+parseFloat(i.mmv_mes||0),0))} viajes)`
          )}
        </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.referencia || '--'}</td>
                      <td className="px-4 py-3 text-center text-xs">{s.fecha}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + estadoColor}>{s.estado}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-700">Bs. {formatBs(parseFloat(s.monto || '0'))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-purple-50/50 px-4 py-2 border-t border-purple-100 text-xs text-purple-600 text-center">
            💡 Para cancelar estos servicios, diríjase a la oficina de Aseo Urbano o pague desde el menú <strong>Pagar</strong>.
          </div>
        </div>
      )}

      {/* Recibos Pendientes */}
      {pendientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-red-700 uppercase text-sm tracking-wide">Recibos Pendientes</h3>
            <span className="ml-auto text-xs font-bold text-red-600">Total: Bs. {formatBs(totalPendBs)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-red-50/50 border-b border-red-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Mes</th>
                  <th className="px-4 py-3 text-center">Vencimiento</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendientes.sort((a: any, b: any) => new Date(a.emision).getTime() - new Date(b.emision).getTime()).map((f: any, i: number) => {
                  const matchedInm = misInmuebles.find((inm: any) => inm.inmueble && f.referencia.includes(inm.inmueble));
                  const inmuDesc = matchedInm
                    ? [matchedInm.tipo, matchedInm.actividad_principal].filter(Boolean).join(' · ') || matchedInm.clasificacion || ''
                    : '';
                  return (
                  <tr key={i} className="hover:bg-red-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700 text-xs">{f.referencia}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{mesLabel(f.emision)}</div>
                      {matchedInm && (
                        <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                          {matchedInm.inmueble}{inmuDesc ? ` · ${inmuDesc}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-red-600 text-xs">{f.vencimiento || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">
                      {parseFloat(getReciboMonto(f)) <= 0 && f.estado !== 'Abonado' && f.estado !== 'Pagado' ? (
                        <span className="text-emerald-600">En Verificación</span>
                      ) : (
                        `Bs. ${parseFloat(getReciboMonto(f)).toLocaleString('es-VE', {minimumFractionDigits:2,maximumFractionDigits:2})}`
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cuotas de Convenio */}
      {cuotasData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex items-center gap-2">
            <Handshake className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-orange-700 uppercase text-sm tracking-wide">Cuotas de Convenio de Pago</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-orange-50/50 border-b border-orange-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Convenio</th>
                  <th className="px-4 py-3">Cuota</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cuotasData.map((c, i) => (
                  <tr key={i} className={"transition-colors " + (c.vencida ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-orange-50/20')}>
                    <td className="px-4 py-3 font-mono text-slate-700">{c.conv}</td>
                    <td className="px-4 py-3 text-center">#{c.cuota}</td>
                    <td className="px-4 py-3 text-center text-xs">{c.fecha}</td>
                    <td className="px-4 py-3 text-center">
                      {c.vencida ? <span className="text-red-600 font-bold text-xs">VENCIDA</span> : <span className="text-blue-600 text-xs">Próxima</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-700">Bs. {formatBs(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial de Pagos */}
      {pagadas.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
          <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-emerald-700 uppercase text-sm tracking-wide">Últimos Pagos</h3>
            <span className="ml-auto text-xs text-emerald-500">(últimos 10)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-emerald-50/50 border-b border-emerald-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Mes</th>
                  <th className="px-4 py-3 text-center">Fecha Pago</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagadas.map((f: any, i: number) => (
                  <tr key={i} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700">{f.referencia}</td>
                    <td className="px-4 py-3 font-medium">{mesLabel(f.emision)}</td>
                    <td className="px-4 py-3 text-center text-xs text-emerald-600">{f.fecha_pago || f.updated_at?.split('T')[0] || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{f.monto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial de Servicios Especiales */}
      {serviciosEsp.filter((s: any) => s.estado === 'Pagado').length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden mt-6">
          <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-emerald-700 uppercase text-sm tracking-wide">Historial de Servicios Especiales</h3>
            <span className="ml-auto text-xs text-emerald-500">Procesados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-emerald-50/50 border-b border-emerald-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviciosEsp.filter((s: any) => s.estado === 'Pagado').map((s: any, i: number) => (
                  <tr key={i} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-emerald-700 font-semibold capitalize">{s.tipo?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{s.descripcion}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">Bs. {Number(s.monto || 0).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sin datos */}
      {misInmuebles.length === 0 && pendientes.length === 0 && pagadas.length === 0 && serviciosPendientes.length === 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-10 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron registros para su cuenta.</p>
          <p className="text-xs text-slate-400 mt-1">Si cree que esto es un error, comuníquese con la oficina de aseo urbano.</p>
        </div>
      )}
    
      {/* MODAL DE SELECCIÓN DE PERÍODO */}
      {modalPeriodoOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Escoger Período del Reporte</h3>
                  <p className="text-xs text-slate-500">Seleccione el rango de meses para el Estado de Cuenta Detallado</p>
                </div>
              </div>
              <button 
                onClick={() => setModalPeriodoOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Modo */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPeriodoModo('rango')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                  periodoModo === 'rango'
                    ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📅 Rango de Meses Específico
              </button>
              <button
                type="button"
                onClick={() => setPeriodoModo('todos')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                  periodoModo === 'todos'
                    ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📋 Todos los Períodos Pendientes
              </button>
            </div>

            {/* Accesos Rápidos */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Accesos Rápidos</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setPeriodoModo('rango'); setPeriodoDesdeMes(1); setPeriodoHastaMes(9); setPeriodoAnio(2026); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    periodoModo === 'rango' && periodoDesdeMes === 1 && periodoHastaMes === 9
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ⭐ Enero a Septiembre
                </button>
                <button
                  type="button"
                  onClick={() => { setPeriodoModo('rango'); setPeriodoDesdeMes(1); setPeriodoHastaMes(12); setPeriodoAnio(2026); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    periodoModo === 'rango' && periodoDesdeMes === 1 && periodoHastaMes === 12
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Año Completo (Ene - Dic)
                </button>
                <button
                  type="button"
                  onClick={() => { setPeriodoModo('rango'); setPeriodoDesdeMes(1); setPeriodoHastaMes(6); setPeriodoAnio(2026); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    periodoModo === 'rango' && periodoDesdeMes === 1 && periodoHastaMes === 6
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  1er Semestre (Ene - Jun)
                </button>
                <button
                  type="button"
                  onClick={() => { setPeriodoModo('rango'); setPeriodoDesdeMes(7); setPeriodoHastaMes(12); setPeriodoAnio(2026); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    periodoModo === 'rango' && periodoDesdeMes === 7 && periodoHastaMes === 12
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  2do Semestre (Jul - Dic)
                </button>
              </div>
            </div>

            {/* Selectores si modo es rango */}
            {periodoModo === 'rango' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Año Fiscal</label>
                  <select
                    value={periodoAnio}
                    onChange={(e) => setPeriodoAnio(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value={2026}>2026 (Ejercicio Actual)</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Desde Mes</label>
                    <select
                      value={periodoDesdeMes}
                      onChange={(e) => setPeriodoDesdeMes(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {MESES_LISTA.map((m, idx) => (
                        <option key={idx} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Hasta Mes</label>
                    <select
                      value={periodoHastaMes}
                      onChange={(e) => setPeriodoHastaMes(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {MESES_LISTA.map((m, idx) => (
                        <option key={idx} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Badge de Vista Previa */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5 text-center">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Período a Imprimir en Reporte</div>
              <div className="text-sm font-black text-emerald-950 mt-0.5">
                📅 {periodoModo === 'todos' ? 'HISTÓRICO ACUMULADO (TODOS LOS PERÍODOS)' : `${MESES_LISTA[periodoDesdeMes - 1]} A ${MESES_LISTA[periodoHastaMes - 1]} ${periodoAnio}`}
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalPeriodoOpen(false)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalPeriodoOpen(false);
                  handleDownloadPDF({ desdeMes: periodoDesdeMes, hastaMes: periodoHastaMes, anio: periodoAnio, modo: periodoModo });
                }}
                className="flex-[2] py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Descargar Reporte PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
