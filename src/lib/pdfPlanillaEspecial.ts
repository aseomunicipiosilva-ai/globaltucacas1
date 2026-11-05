import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logos } from '@/lib/logosBase64';

export interface PlanillaData {
  id?: number | string;
  tipo: string;
  contribuyente: string;
  identidad: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  descripcion: string;
  monto: number;
  tasaBcv?: number;
  fecha: string;
  estado?: string;
  notas?: string;
  referencia?: string;
  viajesExtras?: number | string;
  parametros?: {
    viajes?: number | string;
    area?: number | string;
    alturaArbol?: string;
    unidadesArboreas?: number | string;
    tipoPermiso?: string;
    habilitadoVB?: boolean;
    tcmv?: number;
  };
}

export function generarPlanillaEspecialPDF(servicio: PlanillaData, options?: { previewOnly?: boolean }): string | void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.width; // 215.9 mm
  const margin = 14;

  // 1. BANNER INSTITUCIONAL CON LOGOS
  doc.setFillColor(10, 74, 42); // Verde ISMA #0a4a2a
  doc.rect(margin, 10, pageWidth - margin * 2, 24, 'F');

  try {
    if (logos.alcaldia) doc.addImage(logos.alcaldia, 'PNG', margin + 3, 11, 21, 21);
    if (logos.isma) doc.addImage(logos.isma, 'PNG', margin + 26, 11, 24, 21);
    if (logos.global_rec) doc.addImage(logos.global_rec, 'PNG', pageWidth - margin - 26, 11, 23, 21);
  } catch (e) {
    console.warn('Error dibujando logos en planilla especial', e);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA - ESTADO FALCÓN', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('ALCALDÍA DEL MUNICIPIO SILVA - INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL (ISMA)', pageWidth / 2, 21, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PLANILLA OFICIAL DE LIQUIDACIÓN Y CONTROL DE SERVICIOS ESPECIALES', pageWidth / 2, 27, { align: 'center' });

  // 2. METADATOS DE LA PLANILLA
  const numPlanilla = servicio.referencia || `ESP-${String(servicio.id || '001').padStart(6, '0')}`;
  
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° DE CONTROL / PLANILLA: ${String(numPlanilla)}`, margin, 39);
  doc.text(`FECHA DE EMISIÓN: ${String(servicio.fecha || new Date().toISOString().slice(0, 10))}`, pageWidth - margin, 39, { align: 'right' });

  // 3. DATOS DEL CONTRIBUYENTE (Tabla)
  autoTable(doc, {
    startY: 43,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [240, 253, 244], textColor: [21, 128, 61], fontStyle: 'bold' },
    head: [['DATOS IDENTIFICATIVOS DEL CONTRIBUYENTE / SOLICITANTE', '']],
    body: [
      ['Razón Social / Contribuyente:', String(servicio.contribuyente || 'N/A')],
      ['Cédula de Identidad / RIF:', String(servicio.identidad || 'N/A')],
      ['Dirección / Ubicación del Inmueble:', String(servicio.direccion || 'Tucacas, Municipio Silva, Falcón')],
      ['Teléfono de Contacto:', String(servicio.telefono || 'N/A')],
      ['Correo Electrónico:', String(servicio.correo || 'N/A')]
    ],
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin }
  });

  // 4. ESPECIFICACIONES TÉCNICAS DEL SERVICIO
  const tipoLabel = 
    servicio.tipo === 'extraordinario' ? 'SERVICIO EXTRAORDINARIO DE RECOLECCIÓN' :
    servicio.tipo === 'visto_bueno' ? 'VISTO BUENO AMBIENTAL MUNICIPAL' :
    servicio.tipo === 'inspeccion' ? 'INSPECCIÓN TÉCNICA Y FISCALIZACIÓN AMBIENTAL' :
    servicio.tipo === 'tala_poda' ? 'AUTORIZACIÓN / PERMISO DE TALA Y PODA' :
    'SERVICIO ESPECIAL DE ASEO URBANO';

  let currentY = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: 'bold' },
    head: [['ESPECIFICACIONES TÉCNICAS DEL TRÁMITE', 'DETALLE OPERATIVO']],
    body: (() => {
      // Detección de viajes extras (desde parametros, propiedad directa o en la descripción/notas)
      let numViajes = servicio.viajesExtras || servicio.parametros?.viajes || null;
      if (!numViajes) {
        const textToSearch = `${servicio.descripcion || ''} ${servicio.notas || ''}`;
        const match = textToSearch.match(/(\d+)\s*viaje/i);
        if (match) numViajes = match[1];
        else if (servicio.tipo === 'extraordinario') numViajes = 1;
      }

      const rows: any[] = [
        ['Categoría del Servicio:', String(tipoLabel)],
      ];

      if (numViajes) {
        rows.push(['Cantidad de Viajes Extras:', `${numViajes} ${Number(numViajes) === 1 ? 'viaje extraordinario' : 'viajes extraordinarios'}`]);
      }

      rows.push(['Descripción Detallada:', String(servicio.descripcion || 'Sin descripción')]);
      rows.push(['Estatus Actual del Trámite:', String(servicio.estado || 'Liquidado / Registrado')]);
      rows.push(['Observaciones Técnicas:', String(servicio.notas || 'Cumple con los requisitos establecidos en la ordenanza municipal.')]);

      return rows;
    })(),
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin }
  });

  // 5. DESGLOSE DE LIQUIDACIÓN Y TARIFAS
  currentY = (doc as any).lastAutoTable.finalY + 4;

  const montoBs = Number(servicio.monto || 0);
  let tasaBcv = Number(servicio.tasaBcv || 0);
  if (!tasaBcv || tasaBcv <= 0) {
    const notasStr = String(servicio.notas || '');
    const m = notasStr.match(/Tasa\s*BCV\s*:\s*([\d.]+)/i);
    if (m) tasaBcv = parseFloat(m[1]);
  }
  const equivalenteDivisa = tasaBcv > 0 ? (montoBs / tasaBcv).toFixed(2) : '—';

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
    headStyles: { fillColor: [10, 74, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['CÓDIGO / CONCEPTO', 'BASE DE CÁLCULO', 'TASA BCV', 'MONTO (Bs.)']],
    body: [
      [
        String(tipoLabel),
        servicio.parametros?.tcmv ? `${String(servicio.parametros.tcmv)} TCMV / UMMV` : 'Tarifa Plana según Ordenanza',
        tasaBcv > 0 ? `Bs. ${String(tasaBcv.toFixed(2))}` : 'Oficial BCV',
        `Bs. ${montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ],
      [
        { content: 'SUBTOTAL LIQUIDADO:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `Bs. ${montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }
      ],
      [
        { content: 'EXENTO DE IVA (Tasa Tributaria Municipal):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `Bs. ${montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }
      ],
      [
        { content: 'TOTAL GENERAL A PAGAR:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244] } },
        { content: `Bs. ${montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [21, 128, 61] } }
      ]
    ],
    margin: { left: margin, right: margin }
  });

  // 6. TÉRMINOS LEGALES
  currentY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Base Legal: Ordenanza sobre Gestión y Recolección de Residuos y Desechos Sólidos y Servicios Especiales del Municipio Silva, Estado Falcón. Esta planilla constituye documento oficial de liquidación y control fiscal. No autoriza inicio de actividades sin la debida cancelación y verificación administrativa.',
    margin,
    currentY,
    { maxWidth: pageWidth - margin * 2, align: 'justify' }
  );

  // 7. BLOQUE DE FIRMAS Y SELLOS
  const signY = currentY + 30;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);

  // Firma Contribuyente
  doc.line(margin + 10, signY, margin + 70, signY);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('FIRMA DEL CONTRIBUYENTE', margin + 40, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('C.I. / R.I.F. Solicitante', margin + 40, signY + 8, { align: 'center' });

  // Firma Inspector / Fiscal
  doc.line(pageWidth - margin - 70, signY, pageWidth - margin - 10, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('SELLO Y FIRMA AUTORIZADA', pageWidth - margin - 40, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('ISMA - Municipio Silva', pageWidth - margin - 40, signY + 8, { align: 'center' });

  // 8. GUARDAR / DESCARGAR O PREVIEW
  if (options?.previewOnly) {
    return doc.output('datauristring');
  }
  doc.save(`Planilla_${String(servicio.tipo)}_${String(numPlanilla)}.pdf`);
}
