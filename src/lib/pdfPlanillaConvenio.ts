import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PlanillaConvenioData {
  numero: string;
  decreto?: string;
  contribuyente: string;
  identidad: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  sector?: string;
  codigoInmueble?: string;
  capitalOriginal?: number;
  rebajaCapital?: number;
  porcentajeCondonacion?: number;
  montoTotalBs: number;
  tasaBcv?: number;
  cuotas: number | string;
  frecuencia?: string;
  inicio: string;
  estado?: string;
  tipoPago?: 'contado' | 'fraccionado';
  operador?: string;
  cronogramaCuotas?: Array<{
    numero: number;
    fecha: string;
    monto: number;
    estado?: string;
  }>;
}

export function generarPlanillaConvenioPDF(data: PlanillaConvenioData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.width; // 215.9 mm
  const margin = 14;

  // 1. BANNER INSTITUCIONAL (Verde ISMA #0a4a2a)
  doc.setFillColor(10, 74, 42);
  doc.rect(margin, 12, pageWidth - margin * 2, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA - ESTADO FALCÓN', pageWidth / 2, 17, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('ALCALDÍA DEL MUNICIPIO JOSÉ LAURENCIO SILVA - INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL (ISMA)', pageWidth / 2, 22, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PLANILLA OFICIAL DE CONVENIO DE PAGO Y REGULARIZACIÓN TRIBUTARIA', pageWidth / 2, 28, { align: 'center' });

  // 2. METADATOS DEL CONVENIO
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° CONVENIO: ${String(data.numero || 'DEC-000000')}`, margin, 40);
  doc.text(`DECRETO APLICADO: ${String(data.decreto || 'Decreto de Regularización Fiscal 2026')}`, margin + 65, 40);
  doc.text(`FECHA: ${String(data.inicio || new Date().toISOString().slice(0, 10))}`, pageWidth - margin, 40, { align: 'right' });

  // 3. DATOS DEL CONTRIBUYENTE
  autoTable(doc, {
    startY: 44,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [240, 253, 244], textColor: [21, 128, 61], fontStyle: 'bold' },
    head: [['DATOS DEL CONTRIBUYENTE / BENEFICIARIO DEL DECRETO', '']],
    body: [
      ['Razón Social / Contribuyente:', String(data.contribuyente || 'N/A')],
      ['RIF / Cédula de Identidad:', String(data.identidad || 'N/A')],
      ['Código Inmueble / Contribuyente:', String(data.codigoInmueble || 'N/A')],
      ['Sector / Clasificación:', String(data.sector || 'Comercial / Residencial')],
      ['Dirección Inmueble:', String(data.direccion || 'Tucacas, Municipio Silva, Falcón')],
      ['Teléfono / Contacto:', String(data.telefono || 'N/A')],
      ['Correo Electrónico:', String(data.correo || 'N/A')]
    ],
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin }
  });

  // 4. LIQUIDACIÓN FINANCIERA (DESGLOSE Y DESCUENTOS DEL DECRETO)
  const currentY = (doc as any).lastAutoTable.finalY + 4;
  const numCuotas = parseInt(String(data.cuotas)) || 1;
  const capitalOrig = data.capitalOriginal || (data.montoTotalBs * 2);
  const rebajaCap = data.rebajaCapital || (capitalOrig * 0.5);
  const montoFinalBs = data.montoTotalBs;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['CONCEPTO DE LIQUIDACIÓN Y CONDONACIÓN', 'DETALLE FINANCIERO']],
    body: [
      ['Deuda Total Original Calculada (Capital):', `Bs. ${capitalOrig.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Porcentaje de Exoneración / Descuento (Decreto):', (data.porcentajeCondonacion === 100 || montoFinalBs === 0) ? '100% CONDONACIÓN TOTAL (Exoneración de Deuda)' : '50% sobre el capital acumulado'],
      ['Condonación de Accesorios, Multas e Intereses:', '100% Condonado'],
      ['Rebaja Total Aplicada al Contribuyente:', `- Bs. ${rebajaCap.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['MONTO TOTAL RELIQUIDADO A PAGAR:', montoFinalBs === 0 ? 'Bs. 0,00 (SOLVENTE POR CONDONACIÓN TOTAL)' : `Bs. ${montoFinalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Modalidad de Cancelación:', montoFinalBs === 0 ? 'EXONERACIÓN TOTAL 100% (SIN SALDO PENDIENTE)' : (data.tipoPago === 'contado' || numCuotas === 1 ? 'PAGO ÚNICO DE CONTADO' : `FRACCIONADO EN ${numCuotas} CUOTAS (${data.frecuencia || 'Mensual'})`)]
    ],
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  // 5. CRONOGRAMA DE CUOTAS
  const cronogramaY = (doc as any).lastAutoTable.finalY + 4;
  const cronograma = data.cronogramaCuotas || Array.from({ length: numCuotas }, (_, i) => {
    const d = new Date(data.inicio || new Date());
    d.setMonth(d.getMonth() + i);
    return {
      numero: i + 1,
      fecha: d.toISOString().slice(0, 10),
      monto: montoFinalBs / numCuotas,
      estado: i === 0 && data.tipoPago === 'contado' ? 'Pagado' : 'Pendiente'
    };
  });

  autoTable(doc, {
    startY: cronogramaY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['CUOTA N°', 'FECHA DE VENCIMIENTO', 'MONTO EN BS', 'ESTADO']],
    body: cronograma.map(c => [
      `Cuota ${c.numero} de ${numCuotas}`,
      c.fecha,
      `Bs. ${c.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      c.estado || 'Pendiente'
    ]),
    margin: { left: margin, right: margin }
  });

  // 6. CLÁUSULAS Y ADVERTENCIA LEGAL
  const terminosY = (doc as any).lastAutoTable.finalY + 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'DECLARACIÓN: El contribuyente suscribe el presente acuerdo con el ISMA, comprometiéndose a cumplir con el cronograma de pago establecido.\n' +
    'El incumplimiento de dos (2) o más cuotas consecutivas revoca automáticamente los beneficios del decreto, reactivando la totalidad de la deuda\n' +
    'original y dando lugar a las sanciones y procedimientos de cobro ejecutivo previstos en la Ordenanza Municipal de Aseo Urbano.',
    margin,
    terminosY
  );

  // 7. FIRMAS Y SELLOS
  const firmasY = terminosY + 16;
  const boxWidth = (pageWidth - margin * 2 - 10) / 2;

  // Firma Contribuyente
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 15, firmasY + 12, margin + boxWidth - 15, firmasY + 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('CONTRIBUYENTE / REPRESENTANTE LEGAL', margin + boxWidth / 2, firmasY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`C.I. / RIF: ${data.identidad}`, margin + boxWidth / 2, firmasY + 20, { align: 'center' });

  // Firma Operador / ISMA
  const xRight = margin + boxWidth + 10;
  doc.line(xRight + 15, firmasY + 12, xRight + boxWidth - 15, firmasY + 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('POR EL INSTITUTO AUTÓNOMO MUNICIPAL (ISMA)', xRight + boxWidth / 2, firmasY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Funcionario / Operador: ${data.operador || 'Administrador'} - Sello Oficial`, xRight + boxWidth / 2, firmasY + 20, { align: 'center' });

  // Guardar y descargar PDF
  doc.save(`Convenio_${data.numero}_${data.identidad}.pdf`);
}
